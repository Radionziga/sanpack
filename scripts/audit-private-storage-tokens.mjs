#!/usr/bin/env node
// Read-only unless --apply and exact bucket confirmation are supplied.
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const key = process.argv[index];
  if (key.startsWith('--')) args.set(key, process.argv[index + 1]?.startsWith('--') ? true : process.argv[++index] ?? true);
}
const projectId = String(args.get('--project') || '').trim();
const bucketName = String(args.get('--bucket') || '').trim();
const apply = args.get('--apply') === true;
if (!projectId || !bucketName) throw new Error('Usage: node scripts/audit-private-storage-tokens.mjs --project PROJECT --bucket BUCKET [--apply --confirm-bucket BUCKET]');
if (apply && args.get('--confirm-bucket') !== bucketName) throw new Error('--apply requires --confirm-bucket with the exact bucket.');
const app = getApps().find((candidate) => candidate.name === 'storage-token-audit')
  || initializeApp({ credential: applicationDefault(), projectId, storageBucket: bucketName }, 'storage-token-audit');
const [files] = await getStorage(app).bucket().getFiles({ prefix: 'bag-design-requests/' });
const findings = [];
for (const file of files) {
  const [metadata] = await file.getMetadata();
  const token = metadata.metadata?.firebaseStorageDownloadTokens;
  if (token) findings.push({ path: file.name, hasLongLivedDownloadToken: true });
  if (apply && token) await file.setMetadata({ metadata: { ...metadata.metadata, firebaseStorageDownloadTokens: null }, cacheControl: 'private,no-store' });
}
console.log(JSON.stringify({ projectId, bucketName, apply, privateObjects: files.length, tokensFound: findings.length, findings }, null, 2));
if (!apply) console.log('READ-ONLY AUDIT. No metadata was changed.');
