#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createDecipheriv, createHash } from 'node:crypto';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'stamply-4df8a';
const SETTINGS_DOCUMENT = 'gemini';
const ENCRYPTION_SECRET = 'sanpack-telegram-config-encryption-key';
const BATCH_SIZE = 20;
const CYRILLIC = /[А-Яа-яЁё]/u;

function normalizeUzbek(value) {
  return value
    .replace(/([oOgG])['ʻʼ’]/gu, '$1‘')
    .replace(/(?<=\p{L})'(?=\p{L})/gu, '’')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeEnglish(value) {
  return value
    .replace(/(\d(?:[\d.,–-]*\d)?)\s+l\b/gu, '$1 L')
    .replace(/\b1\s+pcs\.?\b/giu, '1 pc')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTitle(value, language) {
  const normalized = language === 'uz' ? normalizeUzbek(value) : normalizeEnglish(value);
  return normalized.replace(/[.]$/u, '');
}

function parseArguments(argv) {
  const options = { apply: false, input: '', output: '' };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--apply') options.apply = true;
    else if (argument === '--input') options.input = argv[++index] || '';
    else if (argument === '--output') options.output = argv[++index] || '';
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function decryptSecret(encrypted, secretMaterial) {
  const [version, ivValue, tagValue, encryptedValue] = encrypted.split('.');
  if (version !== 'v1' || !ivValue || !tagValue || !encryptedValue) {
    throw new Error('Gemini API key has an unsupported encrypted format.');
  }
  const key = createHash('sha256').update(secretMaterial).digest();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function getSecretMaterial() {
  return execFileSync('gcloud', [
    'secrets', 'versions', 'access', 'latest',
    `--secret=${ENCRYPTION_SECRET}`,
    `--project=${PROJECT_ID}`,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
}

function createAdminApp() {
  return getApps()[0] || initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID,
  });
}

async function getGeminiConfiguration(db) {
  const snapshot = await db.collection('privateSettings').doc(SETTINGS_DOCUMENT).get();
  const settings = snapshot.data();
  if (!snapshot.exists || settings?.enabled !== true || !settings.apiKeyEncrypted || !settings.model) {
    throw new Error('Production Gemini settings are missing or disabled.');
  }
  const apiKey = decryptSecret(String(settings.apiKeyEncrypted), getSecretMaterial());
  return { apiKey, model: String(settings.model).replace(/^models\//, '') };
}

async function readGeminiResponse(response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.error?.message || `Gemini request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }
  const text = body?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim();
  if (!text) throw new Error('Gemini returned an empty response.');
  return JSON.parse(text);
}

async function translateBatch({ apiKey, model, fields }) {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      translations: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            key: { type: 'string' },
            ru: { type: 'string' },
            uz: { type: 'string' },
            en: { type: 'string' },
          },
          required: ['key', 'ru', 'uz', 'en'],
        },
      },
    },
    required: ['translations'],
  };
  const prompt = [
    'You translate product catalogue content for a professional B2B ecommerce store in Uzbekistan.',
    'The source language is Russian. Translate every field into Uzbek in Latin script and natural English.',
    'Use sentence case: the first word of every product title must start with a capital letter.',
    'Transliterate Cyrillic brand and variety names into Latin script in Uzbek and English while preserving their identity.',
    'Translate Russian units: см→sm/cm, кг→kg, г→g, л→l/L, шт.→dona/pcs.',
    'Preserve product codes, Latin-script brand names, model names, numbers, punctuation and factual meaning.',
    'Do not invent specifications, benefits, prices or details absent from the source.',
    'For ru, copy the source value exactly. Return every requested key exactly once.',
    `Fields: ${JSON.stringify(fields)}`,
  ].join('\n');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseJsonSchema: schema,
      },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const result = await readGeminiResponse(response);
  if (!Array.isArray(result.translations)) throw new Error('Gemini returned an invalid translation list.');
  const byKey = new Map(result.translations.map((translation) => [translation.key, translation]));
  if (byKey.size !== fields.length || fields.some((field) => !byKey.has(field.key))) {
    throw new Error('Gemini did not return every requested field.');
  }
  return fields.map((field) => {
    const translation = byKey.get(field.key);
    if (translation.ru !== field.value) throw new Error(`Gemini rewrote Russian source field ${field.key}.`);
    for (const language of ['uz', 'en']) {
      if (!String(translation[language] || '').trim()) throw new Error(`Gemini left ${field.key}.${language} empty.`);
      if (CYRILLIC.test(translation[language])) throw new Error(`Gemini left Cyrillic in ${field.key}.${language}.`);
    }
    return translation;
  });
}

function makeFields(products) {
  return products.flatMap((product, productIndex) => {
    const prefix = `p${productIndex}`;
    const fields = [
      { key: `${prefix}-title`, label: 'Product title', value: String(product.titleRu || '').trim() },
      { key: `${prefix}-short`, label: 'Short product description', value: String(product.shortDescriptionRu || '').trim() },
      { key: `${prefix}-description`, label: 'Full product description', value: String(product.descriptionRu || '').trim() },
    ];
    for (const [variantIndex, variant] of (product.variants || []).entries()) {
      fields.push({
        key: `${prefix}-variant-${variantIndex}`,
        label: 'Product variant name',
        value: String(variant.titleRu || '').trim(),
      });
    }
    return fields.filter((field) => field.value);
  });
}

function assembleTranslations(products, translatedFields) {
  const byKey = new Map(translatedFields.map((field) => [field.key, field]));
  return products.map((product, productIndex) => {
    const prefix = `p${productIndex}`;
    const title = byKey.get(`${prefix}-title`);
    const shortDescription = byKey.get(`${prefix}-short`);
    const description = byKey.get(`${prefix}-description`);
    if (!title || !shortDescription || !description) throw new Error(`Incomplete translation for ${product.id}.`);
    return {
      id: product.id,
      sku: String(product.sku || ''),
      sourceTitleRu: String(product.titleRu || '').trim(),
      titleUz: normalizeTitle(title.uz, 'uz'),
      titleEn: normalizeTitle(title.en, 'en'),
      shortDescriptionUz: normalizeUzbek(shortDescription.uz),
      shortDescriptionEn: normalizeEnglish(shortDescription.en),
      descriptionUz: normalizeUzbek(description.uz),
      descriptionEn: normalizeEnglish(description.en),
      variants: (product.variants || []).map((variant, variantIndex) => {
        const translated = byKey.get(`${prefix}-variant-${variantIndex}`);
        return translated
          ? { ...variant, titleUz: normalizeTitle(translated.uz, 'uz'), titleEn: normalizeTitle(translated.en, 'en') }
          : variant;
      }),
    };
  });
}

async function generateTranslations({ db, output }) {
  const snapshot = await db.collection('products').orderBy('sortOrder').get();
  const products = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
  if (!products.length) throw new Error('Firestore products collection is empty.');
  const configuration = await getGeminiConfiguration(db);
  const fields = makeFields(products);
  const translated = [];
  for (let offset = 0; offset < fields.length; offset += BATCH_SIZE) {
    const batch = fields.slice(offset, offset + BATCH_SIZE);
    const result = await translateBatch({ ...configuration, fields: batch });
    translated.push(...result);
    console.log(`Translated ${Math.min(offset + batch.length, fields.length)}/${fields.length} fields.`);
  }
  const payload = {
    projectId: PROJECT_ID,
    generatedAt: new Date().toISOString(),
    model: configuration.model,
    products: assembleTranslations(products, translated),
  };
  const outputPath = resolve(output || `../firestore-product-translations-${Date.now()}.json`);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
  await chmod(outputPath, 0o600);
  console.log(JSON.stringify({ mode: 'dry-run', products: payload.products.length, fields: fields.length, output: outputPath }));
}

async function applyTranslations({ db, input }) {
  if (!input) throw new Error('--input is required with --apply.');
  const inputPath = resolve(input);
  const payload = JSON.parse(await readFile(inputPath, 'utf8'));
  if (payload.projectId !== PROJECT_ID || !Array.isArray(payload.products) || !payload.products.length) {
    throw new Error('Translation review file does not match the target project.');
  }
  const references = payload.products.map((product) => db.collection('products').doc(product.id));
  const currentSnapshots = await db.getAll(...references);
  const currentById = new Map(currentSnapshots.map((snapshot) => [snapshot.id, snapshot]));
  for (const product of payload.products) {
    const snapshot = currentById.get(product.id);
    if (!snapshot?.exists) throw new Error(`Product ${product.id} no longer exists.`);
    if (String(snapshot.data()?.titleRu || '').trim() !== product.sourceTitleRu) {
      throw new Error(`Product ${product.id} changed after translation generation.`);
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = resolve(`../firestore-backups/products-before-localization-${timestamp}.json`);
  const backup = currentSnapshots.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }));
  await mkdir(dirname(backupPath), { recursive: true });
  await writeFile(backupPath, `${JSON.stringify(backup, null, 2)}\n`, { mode: 0o600 });
  await chmod(backupPath, 0o600);

  const batch = db.batch();
  const updatedAt = new Date().toISOString();
  for (const product of payload.products) {
    const snapshot = currentById.get(product.id);
    const current = snapshot.data();
    batch.update(snapshot.ref, {
      titleUz: product.titleUz,
      titleEn: product.titleEn,
      shortDescriptionUz: product.shortDescriptionUz,
      shortDescriptionEn: product.shortDescriptionEn,
      descriptionUz: product.descriptionUz,
      descriptionEn: product.descriptionEn,
      variants: product.variants,
      seo: {
        ...(current.seo || {}),
        titleUz: `${product.titleUz} — SANPACK`,
        titleEn: `${product.titleEn} — SANPACK`,
        descriptionUz: product.shortDescriptionUz,
        descriptionEn: product.shortDescriptionEn,
      },
      updatedAt,
      updatedBy: 'codex-firestore-localization',
    });
  }
  await batch.commit();
  console.log(JSON.stringify({ mode: 'apply', updated: payload.products.length, backup: backupPath }));
}

const options = parseArguments(process.argv.slice(2));
const db = getFirestore(createAdminApp());
try {
  if (options.apply) await applyTranslations({ db, input: options.input });
  else await generateTranslations({ db, output: options.output });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
