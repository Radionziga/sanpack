import { execFileSync } from 'node:child_process';
import { createDecipheriv, createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';

const PROJECT_ID = 'stamply-4df8a';
const BUCKET_NAME = 'stamply-4df8a.firebasestorage.app';
const SECRET_ID = 'sanpack-telegram-config-encryption-key';
const MODEL_ID = 'gemini-3.1-flash-image';
const OUTPUT_DIR = path.resolve('outputs', 'produce-images-remaining-2026-08-15');
const STORAGE_PREFIX = 'media/products/generated-produce-2026-08';
const apply = process.argv.includes('--apply');

const productsToGenerate = [
  { id: 'price-2026-fr-001', subject: 'A compact natural group of three or four large Egyptian sweet oranges. They are visibly large, ripe, bright orange, mostly round with slight natural variation, and have finely porous citrus skin.' },
  { id: 'price-2026-fr-002', subject: 'A compact natural group of five or six small Egyptian sweet oranges. They are visibly smaller than standard oranges, ripe, bright orange, round, and have finely porous citrus skin.' },
  { id: 'price-2026-fr-003', subject: 'A compact natural group of three ripe Argentine lemons, characteristic elongated oval shape, bright yellow textured rind, and a distinct small nipple at one end. One lemon may be cut open to show juicy pale-yellow flesh.' },
  { id: 'price-2026-fr-004', subject: 'A compact natural group of three Chilean Hayward kiwifruits with oval shape and natural brown fuzzy skin. One kiwi may be cut in half to show bright green flesh, a pale center, and a ring of tiny black seeds.' },
  { id: 'price-2026-fr-005', subject: 'Two large ripe pink grapefruits with yellow-orange finely textured rind. One grapefruit may be cut in half to show juicy natural rose-pink segmented flesh.' },
  { id: 'price-2026-fr-006', subject: 'One compact hand of ripe Ecuadorian Cavendish bananas with six to eight naturally curved fruits, warm yellow peel, subtle realistic brown freckles, and a slightly green natural stem.' },
  { id: 'price-2026-fr-010', subject: 'A compact natural group of three ripe yellow Eureka-type lemons with elongated oval shape, textured rind, and a distinct small nipple. China is only the catalog origin and must not be represented by text, flags, labels, or props.' },
  { id: 'price-2026-fr-011', subject: 'A compact natural group of three locally grown Uzbekistan lemons, ripe yellow, oval and moderately elongated, with thick naturally textured rind. One may be cut open to show pale juicy flesh. Do not add geographic props or labels.' },
  { id: 'price-2026-fr-012', subject: 'A compact natural group of four ripe Persian limes with vivid deep green rind, oval shape, realistic pores, and subtle natural color variation. One lime may be cut open to show juicy pale-green segments.' },
  { id: 'price-2026-fr-013', subject: 'A compact natural group of three fresh Hayward-type kiwifruits with oval shape and natural brown fuzzy skin. One kiwi may be cut in half to show bright green flesh and tiny black seeds. China is only the catalog origin; no geographic props or labels.' },
  { id: 'price-2026-fr-014', subject: 'A compact natural group of four ripe purple passion fruits with round-to-oval shape, deep purple slightly dimpled skin, and realistic natural variation. One fruit may be cut open to show golden aromatic pulp filled with black seeds.' },
  { id: 'price-2026-fr-015', subject: 'A compact natural group of four ripe Thai passion fruits with round-to-oval shape, rich purple-red slightly dimpled skin, and realistic natural variation. One fruit may be cut open to show golden pulp filled with black seeds.' },
  { id: 'price-2026-fr-016', subject: 'A compact natural group of four small ripe yellow mini mangoes of the Ataulfo or honey-mango type: slender oblong S-shaped fruit, saturated golden-yellow skin, smooth surface, and softly pointed ends. One may be cut open to show rich yellow flesh.' },
  { id: 'price-2026-fr-017', subject: 'Two large ripe Peruvian Kent-type mangoes with plump oval shape, green-yellow skin and a natural muted red blush. One may be cut open to show rich orange-yellow flesh and realistic fibers.' },
  { id: 'price-2026-fr-018', subject: 'A compact natural group of three ripe white peaches with pale cream skin, delicate pink blush, fine natural fuzz, and a soft round shape. One peach may be cut open to show juicy ivory-white flesh and a natural stone.' },
  { id: 'price-2026-fr-019', subject: 'A compact natural group of four Granny Smith apples with saturated fresh green skin, crisp round shape, tiny natural lenticels, subtle realistic variation, and intact brown stems.' },
  { id: 'price-2026-fr-020', subject: 'A compact natural group of four ripe Saltanat apples, a Central Asian market variety presented as medium round apples with warm red to crimson blush over a yellow-green base, smooth skin, subtle lenticels, and intact brown stems.' },
  { id: 'price-2026-fr-021', subject: 'One generous loose bunch of premium Shine Muscat grapes with very large round seedless berries, translucent light jade-green color, taut natural bloom, and a fresh green stem. The bunch should look airy and premium, not like small ordinary grapes.' },
  { id: 'price-2026-fr-022', subject: 'One generous loose bunch of Rizamat table grapes with characteristically large elongated oval berries, pink to ruby-red gradients, slightly translucent skin, natural powdery bloom, and a branching green-brown stem.' },
  { id: 'price-2026-vg-001', subject: 'One whole fresh Chinese Napa cabbage, elongated oval head with broad pale-white crunchy ribs and softly crinkled light-green leaves, fully visible and naturally compact.' },
  { id: 'price-2026-vg-002', subject: 'A compact natural group of four clean fresh carrots without leafy tops, tapered shape, saturated orange color, fine root lines, and subtle natural soil-free surface texture.' },
  { id: 'price-2026-vg-003', subject: 'A compact natural group of four dry yellow-brown onions with round bulb shape, papery golden skins, realistic roots and dried necks, and subtle natural variation.' },
  { id: 'price-2026-vg-004', subject: 'A compact natural group of five clean fresh potatoes with light tan skin, irregular oval shape, shallow eyes, subtle earthy texture, and realistic size variation.' },
  { id: 'price-2026-vg-005', subject: 'A compact natural group of three Pink Paradise F1-type tomatoes: large round-to-slightly-flattened beefsteak tomatoes with uniform rosy pink-red skin, smooth shoulders, subtle natural ribbing, and fresh green calyxes.' },
  { id: 'price-2026-vg-006', subject: 'A compact natural group of four ripe red tomatoes, medium round shape, saturated natural red skin, subtle realistic sheen, slight size variation, and fresh green calyxes.' },
  { id: 'price-2026-vg-007', subject: 'A compact natural group of four fresh Rava-type cucumbers sold in Uzbekistan: medium-length straight dark-green cucumbers with fine small bumps, crisp firm skin, tapered ends, and subtle natural variation.' },
  { id: 'price-2026-vg-008', subject: 'A compact natural group of four fresh Orzu-type cucumbers sold in Uzbekistan: medium-length straight green cucumbers with a slightly lighter natural green tone, fine small bumps, crisp firm skin, tapered ends, and subtle variation.' },
  { id: 'price-2026-vg-009', subject: 'A compact natural group of two or three fresh mature ginger rhizomes with branching knobby shape, pale golden-beige skin, fine rings, tiny root scars, and one clean cut showing moist pale-yellow flesh.' },
  { id: 'price-2026-vg-010', subject: 'A compact balanced group of exactly three fresh sweet bell peppers: one red, one yellow, and one green. Each pepper is glossy but natural, thick-walled, blocky, fully visible, and has a fresh green stem.' },
  { id: 'price-2026-vg-011', subject: 'A compact natural group of many clean peeled garlic cloves, ivory-white to pale cream, plump and smooth with subtle papery remnants only at the root tips. Do not show a whole unpeeled bulb.' },
  { id: 'price-2026-vg-012', subject: 'A compact natural group of eight to ten fresh white button mushrooms with clean creamy-white caps, short pale stems, slight size variation, and delicate realistic surface texture.' },
  { id: 'price-2026-vg-013', subject: 'A compact natural group of ten to twelve fresh green asparagus spears, neatly aligned without any band or tie, with firm slender stalks, tightly closed violet-green tips, and subtle natural variation.' },
];

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
  ], { encoding: 'utf8', windowsHide: true }).trim();
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

function buildPrompt(item) {
  return [
    'Create exactly one hyperrealistic commercial e-commerce catalog product photograph.',
    `Product subject: ${item.subject}`,
    'Botanical and physical accuracy is mandatory. Preserve the defining cultivar or product shape, skin or surface texture, color variation, ripeness cues, proportions, and other identifying details described above.',
    'Rendering quality: exceptionally detailed professional product photography with physically accurate materials, true-to-life microtexture, tiny natural surface imperfections, crisp subject detail, realistic subsurface scattering where appropriate, natural tonal transitions, and convincing depth.',
    'Composition: one coherent centered product presentation, fully visible, front three-quarter view when appropriate, realistic scale and proportions, and generous empty white margin on every side.',
    'Background: pure seamless white (#FFFFFF), no horizon line, no decorative surface, no gradient backdrop, and no colored background.',
    'Lighting: soft neutral high-end studio lighting with delicate highlights and one subtle realistic contact shadow that remains entirely inside the canvas.',
    'The result must look like a real premium grocery catalog photograph captured with a professional camera, not a render. Keep natural asymmetry and believable imperfections. Do not over-retouch, over-smooth, oversharpen, exaggerate saturation, stylize, or create a CGI, illustration, or plastic appearance.',
    'Strict exclusions: no words, letters, numbers, logos, watermarks, stickers, price tags, flags, labels, branded packaging, hands, people, cutlery, plates, bowls, baskets, decorative leaves, decorative scenery, borders, frames, or unrelated props.',
    'The product and its shadow must not touch or leave the image boundaries. Do not crop any part of the product.',
    'Output exactly one square 1:1 image at 1K suitable for a product card. Return only the image.',
  ].join('\n');
}

async function generateImage({ apiKey, prompt }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${MODEL_ID}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: { aspectRatio: '1:1', imageSize: '1K' },
        },
      }),
      signal: AbortSignal.timeout(240_000),
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

async function readCachedImage(item) {
  try {
    const buffer = await readFile(path.join(OUTPUT_DIR, `${item.id}.webp`));
    const metadata = await sharp(buffer).metadata();
    if (metadata.width === 1200 && metadata.height === 1200 && metadata.format === 'webp') return buffer;
  } catch {
    // A missing or invalid cache is regenerated below.
  }
  return null;
}

async function writeProgress(completed, status = 'generating') {
  await writeFile(path.join(OUTPUT_DIR, 'progress.json'), `${JSON.stringify({
    updatedAt: new Date().toISOString(), model: MODEL_ID, status, completed, total: productsToGenerate.length,
  }, null, 2)}\n`, 'utf8');
}

if ((process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT) !== PROJECT_ID) {
  throw new Error(`Set GOOGLE_CLOUD_PROJECT=${PROJECT_ID} before running this script.`);
}

await mkdir(OUTPUT_DIR, { recursive: true });
const app = initializeApp({
  credential: applicationDefault(), projectId: PROJECT_ID, storageBucket: BUCKET_NAME,
}, `produce-images-remaining-${Date.now()}`);
const db = getFirestore(app);
const bucket = getStorage(app).bucket(BUCKET_NAME);
const uploadedPaths = [];

try {
  const settingsSnapshot = await db.doc('privateSettings/gemini').get();
  const settings = settingsSnapshot.data() || {};
  if (!settingsSnapshot.exists || !settings.enabled || !settings.apiKeyEncrypted) {
    throw new Error('Production Gemini image settings are incomplete or disabled.');
  }
  if (settings.imageModel !== MODEL_ID) {
    throw new Error(`Production image model must be ${MODEL_ID}; current value is ${settings.imageModel || 'not set'}.`);
  }

  const encryptionSecret = await readEncryptionSecret();
  const apiKey = decryptSecret(settings.apiKeyEncrypted, encryptionSecret);
  const snapshots = await Promise.all(productsToGenerate.map((item) => db.doc(`products/${item.id}`).get()));
  const products = snapshots.map((snapshot, index) => {
    if (!snapshot.exists) throw new Error(`Product ${productsToGenerate[index].id} is missing.`);
    return { ref: snapshot.ref, data: snapshot.data() };
  });

  const backup = products.map(({ ref, data }) => ({
    id: ref.id,
    title: data.titleRu,
    mainImage: data.mainImage || null,
    mainImagePath: data.mainImagePath || null,
    images: Array.isArray(data.images) ? data.images : [],
  }));
  await writeFile(path.join(OUTPUT_DIR, 'backup.json'), `${JSON.stringify(backup, null, 2)}\n`, 'utf8');

  const generated = [];
  for (let index = 0; index < productsToGenerate.length; index += 1) {
    const item = productsToGenerate[index];
    const title = products[index].data.titleRu;
    let buffer = await readCachedImage(item);
    if (buffer) {
      console.log(`[${index + 1}/${productsToGenerate.length}] Reusing ${title}`);
    } else {
      console.log(`[${index + 1}/${productsToGenerate.length}] Generating ${title}...`);
      const original = await generateImage({ apiKey, prompt: buildPrompt(item) });
      buffer = await sharp(original)
        .rotate()
        .resize(1200, 1200, { fit: 'contain', position: 'centre', background: '#ffffff' })
        .flatten({ background: '#ffffff' })
        .webp({ quality: 92, effort: 5, smartSubsample: true })
        .toBuffer();
      await writeFile(path.join(OUTPUT_DIR, `${item.id}.webp`), buffer);
    }
    generated.push({ ...item, title, buffer, ref: products[index].ref });
    await writeProgress(generated.length);
  }

  const report = {
    generatedAt: new Date().toISOString(), model: MODEL_ID, applied: apply,
    products: generated.map(({ id, title }) => ({ id, title, localPath: path.join(OUTPUT_DIR, `${id}.webp`) })),
  };

  if (apply) {
    const uploads = [];
    for (let index = 0; index < generated.length; index += 1) {
      const image = generated[index];
      console.log(`[upload ${index + 1}/${generated.length}] ${image.title}`);
      const hash = createHash('sha256').update(image.buffer).digest('hex').slice(0, 20);
      const destination = `${STORAGE_PREFIX}/${image.id}-${hash}.webp`;
      const token = randomUUID();
      await bucket.file(destination).save(image.buffer, {
        resumable: false,
        metadata: {
          contentType: 'image/webp', cacheControl: 'public,max-age=31536000,immutable',
          metadata: { firebaseStorageDownloadTokens: token },
        },
      });
      uploadedPaths.push(destination);
      const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURIComponent(destination)}?alt=media&token=${token}`;
      uploads.push({ ...image, destination, url });
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
    report.products = uploads.map(({ id, title, destination }) => ({ id, title, storagePath: destination }));

    const verification = await Promise.all(productsToGenerate.map((item) => db.doc(`products/${item.id}`).get()));
    const failed = verification.filter((snapshot, index) => (
      !snapshot.exists || !snapshot.data().mainImagePath?.startsWith(`${STORAGE_PREFIX}/${productsToGenerate[index].id}-`)
    ));
    if (failed.length) throw new Error(`Firestore verification failed for ${failed.length} product(s).`);
  }

  await writeProgress(generated.length, apply ? 'applied' : 'generated');
  await writeFile(path.join(OUTPUT_DIR, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ generated: generated.length, applied: apply, outputDir: OUTPUT_DIR }, null, 2));
} catch (error) {
  if (uploadedPaths.length) {
    await Promise.allSettled(uploadedPaths.map((destination) => bucket.file(destination).delete({ ignoreNotFound: true })));
  }
  throw error;
} finally {
  await deleteApp(app);
}
