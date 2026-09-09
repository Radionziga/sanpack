#!/usr/bin/env node
// Read-only inventory. It never prints Telegram ids, names, phones or document ids.
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const key = process.argv[index];
  if (key.startsWith('--')) args.set(key, process.argv[index + 1]?.startsWith('--') ? true : process.argv[++index] ?? true);
}
const projectId = String(args.get('--project') || '').trim();
if (!projectId) throw new Error('Usage: npm run identity:audit -- --project PROJECT');

const app = getApps().find((candidate) => candidate.name === 'customer-identity-audit')
  || initializeApp({ credential: applicationDefault(), projectId }, 'customer-identity-audit');
const snapshot = await getFirestore(app).collection('customers').select('telegramId').get();
const byTelegramId = new Map();
let withoutTelegramId = 0;
let legacyUidDocuments = 0;
for (const document of snapshot.docs) {
  const telegramId = String(document.data().telegramId || '').trim();
  if (!telegramId) {
    withoutTelegramId += 1;
    continue;
  }
  byTelegramId.set(telegramId, (byTelegramId.get(telegramId) || 0) + 1);
  if (document.id !== `telegram:${telegramId}`) legacyUidDocuments += 1;
}
const duplicateGroups = [...byTelegramId.values()].filter((count) => count > 1);
console.log(JSON.stringify({
  projectId,
  mode: 'READ_ONLY',
  customerDocuments: snapshot.size,
  telegramIdentities: byTelegramId.size,
  withoutTelegramId,
  legacyUidDocuments,
  duplicateTelegramIdGroups: duplicateGroups.length,
  duplicateDocuments: duplicateGroups.reduce((sum, count) => sum + count, 0),
  migrationApplied: false,
}, null, 2));
