import { execFileSync } from 'node:child_process';
import { createDecipheriv, createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';

const PROJECT_ID = 'stamply-4df8a';
const BUCKET_NAME = 'stamply-4df8a.firebasestorage.app';
const SECRET_ID = 'sanpack-telegram-config-encryption-key';
const OUTPUT_DIR = path.resolve('outputs', 'produce-image-samples-2026-08-14');
const STORAGE_PREFIX = 'media/products/generated-produce-samples-2026-08';
const apply = process.argv.includes('--apply');

const samples = [
  {
    id: 'price-2026-fr-007',
    expectedTitle: 'Авокадо гладкий',
    subject: 'Two or three whole Fuerte-type avocados: pear-shaped, medium green, smooth glossy skin. One avocado may be cut open to show pale green flesh and a natural brown stone. This must not look like the dark, pebbled Hass variety.',
  },
  {
    id: 'price-2026-fr-008',
    expectedTitle: 'Авокадо Хасс',
    subject: 'Two or three whole Hass avocados with characteristic dark purplish-black, thick pebbled skin and compact pear-to-oval shape. One avocado may be cut open to show pale green flesh and a natural brown stone.',
  },
  {
    id: 'price-2026-fr-009',
    expectedTitle: 'Ананас (Китай)',
    subject: 'One whole ripe fresh pineapple with golden-brown patterned skin and a compact healthy green crown. China is only the catalog origin and must not be represented with flags, text, labels, or props.',
  },
  {
    id: 'price-2026-br-001',
    expectedTitle: 'Голубика, 500 г',
    subject: 'A generous 500 gram portion of fresh ripe blueberries in one simple clear unlabeled produce punnet. The punnet must look visibly larger than a typical 125 gram berry punnet. No printed film, label, text, or logo.',
  },
  {
    id: 'price-2026-br-002',
    expectedTitle: 'Голубика, 125 г',
    subject: 'A compact 125 gram portion of fresh ripe blueberries in one small simple clear unlabeled produce punnet. No printed film, label, text, or logo.',
  },
  {
    id: 'price-2026-br-003',
    expectedTitle: 'Ежевика, 125 г',
    subject: 'A compact 125 gram portion of fresh ripe blackberries in one small simple clear unlabeled produce punnet. Show natural deep purple-black drupelets. No printed film, label, text, or logo.',
  },
  {
    id: 'price-2026-br-004',
    expectedTitle: 'Смородина, 125 г',
    subject: 'A compact 125 gram portion of fresh black currants in one small simple clear unlabeled produce punnet. The berries are small, glossy, near-black currants on a few short green stems; do not depict red currants. No printed film, label, text, or logo.',
  },
  {
    id: 'price-2026-br-005',
    expectedTitle: 'Физалис, 125 г',
    subject: 'A compact 125 gram portion of fresh cape gooseberries (physalis) in one small simple clear unlabeled produce punnet. Several golden-orange berries should retain their delicate pale tan papery husks, with one or two husks naturally opened. No printed film, label, text, or logo.',
  },
  {
    id: 'price-2026-br-006',
    expectedTitle: 'Малина, 125 г',
    subject: 'A compact 125 gram portion of fresh ripe red raspberries in one small simple clear unlabeled produce punnet. No printed film, label, text, or logo.',
  },
  {
    id: 'price-2026-br-007',
    expectedTitle: 'Клубника',
    subject: 'A compact natural group of fresh ripe strawberries with healthy green calyxes. Show whole berries only, arranged like a clean grocery product photograph without a container.',
  },
];

function xmlEscape(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character]);
}

function decryptSecret(value, secretMaterial) {
  const [version, ivValue, tagValue, encryptedValue] = value.split('.');
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

async function readEncryptionSecret() {
  const token = execFileSync(process.env.ComSpec || 'cmd.exe', [
    '/d', '/s', '/c', 'gcloud auth application-default print-access-token',
  ], {
    encoding: 'utf8',
    windowsHide: true,
  }).trim();
  if (!token) throw new Error('Google application-default access token is unavailable.');
  const response = await fetch(
    `https://secretmanager.googleapis.com/v1/projects/${PROJECT_ID}/secrets/${SECRET_ID}/versions/latest:access`,
    { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000) },
  );
  const raw = await response.text();
  const body = raw ? JSON.parse(raw) : null;
  if (!response.ok || !body?.payload?.data) {
    throw new Error(body?.error?.message || 'Could not read the production encryption secret.');
  }
  return Buffer.from(body.payload.data, 'base64').toString('utf8').trim();
}

function buildPrompt(sample) {
  return [
    'Create one clean, photorealistic e-commerce catalog product image.',
    `Product subject: ${sample.subject}`,
    'Composition: a single centered product presentation, fully visible, front three-quarter view when appropriate, with realistic proportions and enough empty white margin on every side.',
    'Background: pure seamless white (#FFFFFF), no horizon line, no decorative surface, no gradient backdrop, no colored background.',
    'Lighting: soft neutral studio lighting with a subtle realistic contact shadow entirely inside the canvas.',
    'Style: premium but natural grocery catalog photography, accurate color and texture, no excessive gloss, no surreal or decorative elements.',
    'Strict exclusions: no words, letters, numbers, logos, watermarks, stickers, price tags, flags, labels, branded packaging, hands, people, cutlery, plates, bowls, baskets, leaves used as decoration, or extra props.',
    'The product and its shadow must not touch or leave the image boundaries. Do not crop any part of the product.',
    'Output exactly one square 1:1 image suitable for a product card.',
  ].join('\n');
}

async function generateImage({ apiKey, model, prompt }) {
  const normalizedModel = model.replace(/^models\//, '');
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(normalizedModel)}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: normalizedModel === 'gemini-2.5-flash-image'
            ? { aspectRatio: '1:1' }
            : { aspectRatio: '1:1', imageSize: '1K' },
        },
      }),
      signal: AbortSignal.timeout(180_000),
    },
  );
  const raw = await response.text();
  let body = null;
  try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
  if (!response.ok) throw new Error(body?.error?.message || `Gemini request failed with HTTP ${response.status}.`);
  const inline = body?.candidates
    ?.flatMap((candidate) => candidate?.content?.parts || [])
    ?.map((part) => part?.inlineData)
    ?.find(Boolean);
  if (!inline?.data) throw new Error('Gemini did not return an image.');
  return Buffer.from(inline.data, 'base64');
}

async function makeContactSheet(generated) {
  const cellWidth = 320;
  const cellHeight = 380;
  const imageSize = 292;
  const composites = [];
  for (let index = 0; index < generated.length; index += 1) {
    const row = Math.floor(index / 5);
    const column = index % 5;
    const left = column * cellWidth + 14;
    const top = row * cellHeight + 14;
    const image = await sharp(generated[index].buffer)
      .resize(imageSize, imageSize, { fit: 'cover' })
      .png()
      .toBuffer();
    composites.push({ input: image, left, top });
    const label = `${index + 1}. ${generated[index].title}`;
    const svg = Buffer.from(
      `<svg width="${imageSize}" height="58" xmlns="http://www.w3.org/2000/svg">` +
      `<rect width="100%" height="100%" fill="#ffffff"/>` +
      `<text x="2" y="24" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#10241b">${xmlEscape(label)}</text>` +
      `<text x="2" y="47" font-family="Arial, sans-serif" font-size="13" fill="#587066">${xmlEscape(generated[index].id)}</text>` +
      '</svg>',
    );
    composites.push({ input: svg, left, top: top + imageSize + 4 });
  }
  const target = path.join(OUTPUT_DIR, 'contact-sheet.jpg');
  await sharp({
    create: { width: cellWidth * 5, height: cellHeight * 2, channels: 3, background: '#f3f6f4' },
  }).composite(composites).jpeg({ quality: 92 }).toFile(target);
  return target;
}

if ((process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT) !== PROJECT_ID) {
  throw new Error(`Set GOOGLE_CLOUD_PROJECT=${PROJECT_ID} before running this script.`);
}

await mkdir(OUTPUT_DIR, { recursive: true });
const app = initializeApp({
  credential: applicationDefault(),
  projectId: PROJECT_ID,
  storageBucket: BUCKET_NAME,
}, `produce-image-samples-${Date.now()}`);
const db = getFirestore(app);
const bucket = getStorage(app).bucket(BUCKET_NAME);
const uploadedPaths = [];

try {
  const settingsSnapshot = await db.doc('privateSettings/gemini').get();
  const settings = settingsSnapshot.data() || {};
  if (!settingsSnapshot.exists || !settings.enabled || !settings.apiKeyEncrypted || !settings.imageModel) {
    throw new Error('Production Gemini image settings are incomplete or disabled.');
  }

  const encryptionSecret = await readEncryptionSecret();
  const apiKey = decryptSecret(settings.apiKeyEncrypted, encryptionSecret);
  const productSnapshots = await Promise.all(samples.map((sample) => db.doc(`products/${sample.id}`).get()));
  const products = productSnapshots.map((snapshot, index) => {
    if (!snapshot.exists) throw new Error(`Product ${samples[index].id} is missing.`);
    const data = snapshot.data();
    if (data.titleRu !== samples[index].expectedTitle) {
      throw new Error(`Product title mismatch for ${samples[index].id}: ${data.titleRu}`);
    }
    return { ref: snapshot.ref, data };
  });

  const backup = products.map(({ ref, data }, index) => ({
    id: ref.id,
    title: samples[index].expectedTitle,
    mainImage: data.mainImage || null,
    mainImagePath: data.mainImagePath || null,
    images: Array.isArray(data.images) ? data.images : [],
  }));
  await writeFile(path.join(OUTPUT_DIR, 'backup.json'), `${JSON.stringify(backup, null, 2)}\n`, 'utf8');

  const generated = [];
  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];
    console.log(`[${index + 1}/${samples.length}] Generating ${sample.expectedTitle}...`);
    const original = await generateImage({
      apiKey,
      model: settings.imageModel,
      prompt: buildPrompt(sample),
    });
    const buffer = await sharp(original)
      .rotate()
      .resize(1200, 1200, {
        fit: 'contain',
        position: 'centre',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .flatten({ background: '#ffffff' })
      .webp({ quality: 91, effort: 5, smartSubsample: true })
      .toBuffer();
    const localPath = path.join(OUTPUT_DIR, `${sample.id}.webp`);
    await writeFile(localPath, buffer);
    generated.push({ ...sample, title: sample.expectedTitle, buffer, localPath });
  }

  const contactSheet = await makeContactSheet(generated);
  const report = {
    generatedAt: new Date().toISOString(),
    model: settings.imageModel,
    applied: apply,
    products: generated.map(({ id, title, localPath }) => ({ id, title, localPath })),
    contactSheet,
  };

  if (apply) {
    const uploads = [];
    for (let index = 0; index < generated.length; index += 1) {
      const image = generated[index];
      const hash = createHash('sha256').update(image.buffer).digest('hex').slice(0, 20);
      const destination = `${STORAGE_PREFIX}/${image.id}-${hash}.webp`;
      const token = randomUUID();
      await bucket.file(destination).save(image.buffer, {
        resumable: false,
        metadata: {
          contentType: 'image/webp',
          cacheControl: 'public,max-age=31536000,immutable',
          metadata: { firebaseStorageDownloadTokens: token },
        },
      });
      uploadedPaths.push(destination);
      const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURIComponent(destination)}?alt=media&token=${token}`;
      uploads.push({ ...image, destination, url, ref: products[index].ref });
    }

    const batch = db.batch();
    for (const upload of uploads) {
      batch.update(upload.ref, {
        mainImage: upload.url,
        mainImagePath: upload.destination,
        images: [upload.url],
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    report.products = uploads.map(({ id, title, localPath, destination }) => ({ id, title, localPath, storagePath: destination }));

    const verification = await Promise.all(samples.map((sample) => db.doc(`products/${sample.id}`).get()));
    const failed = verification.filter((snapshot, index) => !snapshot.exists || !snapshot.data().mainImagePath?.startsWith(`${STORAGE_PREFIX}/${samples[index].id}-`));
    if (failed.length) throw new Error(`Firestore verification failed for ${failed.length} product(s).`);
  }

  await writeFile(path.join(OUTPUT_DIR, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ generated: generated.length, applied: apply, contactSheet }, null, 2));
} catch (error) {
  if (uploadedPaths.length) {
    await Promise.allSettled(uploadedPaths.map((destination) => bucket.file(destination).delete({ ignoreNotFound: true })));
  }
  throw error;
} finally {
  await deleteApp(app);
}
