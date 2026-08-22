import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (!projectId) {
  throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is required.');
}

const app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId });
const database = getFirestore(app);
const now = Date.now();
const retentionMs = 24 * 60 * 60 * 1000;
const snapshot = await database
  .collection('bagDesignRequests')
  .where('status', '==', 'draft')
  .limit(500)
  .get();

const candidates = snapshot.docs.flatMap((document) => {
  const data = document.data();
  const createdAt = typeof data.createdAt === 'string' ? Date.parse(data.createdAt) : Number.NaN;
  if (!Number.isFinite(createdAt) || now - createdAt < retentionMs) return [];
  return [{
    id: document.id,
    createdAt: data.createdAt,
    generationState: typeof data.generationState === 'string' ? data.generationState : 'legacy',
    assetCount: data.assetPaths && typeof data.assetPaths === 'object'
      ? Object.values(data.assetPaths).filter((value) => typeof value === 'string').length
      : 0,
  }];
});

console.log(JSON.stringify({
  mode: 'dry-run',
  scannedDrafts: snapshot.size,
  staleDrafts: candidates.length,
  candidates,
  note: 'No documents or Storage objects were changed.',
}, null, 2));
