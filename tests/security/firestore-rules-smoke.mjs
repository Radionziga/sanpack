// Run ONLY through firebase emulators:exec --project demo-sanpack-audit.
import assert from 'node:assert/strict';

const host = process.env.FIRESTORE_EMULATOR_HOST;
if (host !== '127.0.0.1:8085') throw new Error('Refusing non-isolated Firestore target.');
const project = 'demo-sanpack-audit';
const root = `http://${host}/v1/projects/${project}/databases/(default)/documents`;
async function call(path, method = 'GET', token, fields) {
  return fetch(`${root}/${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(fields ? { body: JSON.stringify({ fields }) } : {}),
  });
}
const text = (value) => ({ stringValue: value });
for (const [path, fields] of [
  ['products/public', { status: text('published') }],
  ['products/draft', { status: text('draft'), internalNote: text('fixture-only') }],
  ['categories/hidden', { status: text('hidden') }],
  ['admins/fixture-admin', { active: { booleanValue: true }, role: text('super_admin') }],
  ['settings/global', { id: text('global') }],
  ['privateSettings/telegram', { secret: text('fixture-only') }],
  ['requests/order', { contactName: text('fixture-only') }],
  ['bagDesignRequests/request', { contactName: text('fixture-only') }],
]) {
  assert.equal((await call(path, 'PATCH', 'owner', fields)).status, 200, `Emulator setup: ${path}`);
}
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
  aud: project, iss: `https://securetoken.google.com/${project}`, sub: 'fixture-admin', user_id: 'fixture-admin',
  iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600,
  firebase: { sign_in_provider: 'password', identities: {} },
})}.`;
let checks = 0;
for (const auth of [undefined, token]) {
  for (const collection of ['products', 'categories', 'attributes', 'clients', 'banners']) {
    assert.equal((await call(`${collection}/attempt`, 'PATCH', auth, { id: text('attempt') })).status, 403);
    checks++;
  }
  for (const path of ['requests/order', 'privateSettings/telegram', 'admins/fixture-admin', 'bagDesignRequests/request']) {
    assert.equal((await call(path, 'GET', auth)).status, 403); checks++;
  }
  assert.equal((await call('settings/global', 'PATCH', auth, { id: text('global') })).status, 403); checks++;
  assert.equal((await call('requests/order', 'DELETE', auth)).status, 403); checks++;
}
for (const path of ['products/public', 'products/draft', 'categories/hidden', 'settings/global']) {
  assert.equal((await call(path)).status, 403); checks++;
}
console.log(`${checks} Firestore emulator boundary checks passed: all direct client reads/writes denied.`);
