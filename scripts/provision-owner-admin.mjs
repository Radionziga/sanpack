#!/usr/bin/env node
// Deliberately dry-run by default. Production write needs every confirmation.
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const value = process.argv[index];
  if (value.startsWith('--')) args.set(value, process.argv[index + 1]?.startsWith('--') ? true : process.argv[++index] ?? true);
}
const uid = String(args.get('--uid') || '').trim();
const email = String(args.get('--email') || '').trim().toLowerCase();
const projectId = String(args.get('--project') || '').trim();
const apply = args.get('--apply') === true;
const replace = args.get('--replace-existing') === true;
if (!uid || uid.includes('/') || !email || !email.includes('@') || !projectId) {
  throw new Error('Usage: node scripts/provision-owner-admin.mjs --project PROJECT --uid FIREBASE_UID --email OWNER_EMAIL [--apply --confirm-project PROJECT] [--replace-existing]');
}
if (apply && args.get('--confirm-project') !== projectId) throw new Error('--apply requires --confirm-project with the exact project ID.');

const app = getApps().find((candidate) => candidate.name === 'owner-provisioning')
  || initializeApp({ credential: applicationDefault(), projectId }, 'owner-provisioning');
const user = await getAuth(app).getUser(uid);
if (user.disabled || user.email?.trim().toLowerCase() !== email) throw new Error('UID/email do not match one enabled Firebase Auth user.');
const reference = getFirestore(app).collection('admins').doc(uid);
const existing = await reference.get();
const data = existing.data();
const desired = { uid, email, name: user.displayName?.trim() || email, active: true, role: 'super_admin' };
const alreadyOwner = existing.exists && data?.active === true && data?.role === 'super_admin'
  && String(data?.email || '').trim().toLowerCase() === email;
console.log(JSON.stringify({ projectId, uid, email, action: alreadyOwner ? 'none' : existing.exists ? 'replace' : 'create', apply }, null, 2));
if (alreadyOwner) process.exit(0);
if (existing.exists && !replace) throw new Error('A different grant exists. Review it, then repeat with explicit --replace-existing if intended.');
if (!apply) {
  console.log('DRY RUN ONLY. No grant was written.');
  process.exit(0);
}
await reference.set({ ...desired, ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }), updatedAt: FieldValue.serverTimestamp(), provisionedBy: 'explicit-owner-script-v1' }, { merge: false });
console.log('Owner grant written after explicit project/UID/email confirmation.');
