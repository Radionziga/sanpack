// Run ONLY through firebase emulators:exec --project demo-sanpack-audit.
import assert from 'node:assert/strict';
import { initializeApp as initializeAdmin } from 'firebase-admin/app';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';
import { initializeApp } from 'firebase/app';
import { connectStorageEmulator, deleteObject, getBytes, getStorage, listAll, ref, uploadBytes } from 'firebase/storage';

if (process.env.FIREBASE_STORAGE_EMULATOR_HOST !== '127.0.0.1:9195') throw new Error('Refusing non-isolated Storage target.');
const projectId = 'demo-sanpack-audit';
const bucketName = `${projectId}.appspot.com`;
const admin = initializeAdmin({ projectId, storageBucket: bucketName }, 'storage-rules-setup');
await getAdminStorage(admin).bucket().file('media/products/public.webp').save(Buffer.from('public-fixture'), { contentType: 'image/webp' });
await getAdminStorage(admin).bucket().file('bag-design-requests/12345678/logo.png').save(Buffer.from('private-fixture'), { contentType: 'image/png' });

const app = initializeApp({ projectId, storageBucket: bucketName, apiKey: 'fixture' }, 'storage-rules-client');
const storage = getStorage(app);
connectStorageEmulator(storage, '127.0.0.1', 9195);
let checks = 0;
assert.equal(Buffer.from(await getBytes(ref(storage, 'media/products/public.webp'))).toString(), 'public-fixture'); checks++;
for (const path of ['bag-design-requests/12345678/logo.png', 'unclassified/file.png']) {
  await assert.rejects(() => getBytes(ref(storage, path))); checks++;
}
for (const path of ['media/products/new.webp', 'bag-design-requests/12345678/new.png']) {
  await assert.rejects(() => uploadBytes(ref(storage, path), new Uint8Array([1, 2, 3]))); checks++;
}
await assert.rejects(() => deleteObject(ref(storage, 'media/products/public.webp'))); checks++;
await assert.rejects(() => listAll(ref(storage, 'media'))); checks++;
console.log(`${checks} Storage emulator checks passed: public get only; private get/list/write/delete denied.`);
