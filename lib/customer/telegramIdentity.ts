import 'server-only';

import { getAdminDb } from '@/lib/firebase/admin';

const MAX_IDENTITY_ALIASES = 8;

export interface VerifiedTelegramIdentity {
  telegramId: string;
  displayName: string;
  username?: string;
  picture?: string;
  phone?: string;
  languageCode?: string;
  oidcSubject?: string;
}

export interface ResolvedTelegramCustomer {
  uid: string;
  identityUids: string[];
  telegramId: string;
  name: string;
  username?: string;
  picture?: string;
  phone?: string;
}

function nonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function unique(values: string[]) {
  return [...new Set(values)].slice(0, MAX_IDENTITY_ALIASES);
}

/**
 * Browser OIDC exposes both a pairwise `sub` and the Telegram user `id`, while
 * Mini Apps expose the user `id`. The Telegram id is therefore the cross-flow
 * identity key. Existing `telegram:<sub>` documents are retained as aliases so
 * their request history remains reachable without a production migration.
 */
export async function upsertTelegramCustomer(
  identity: VerifiedTelegramIdentity,
): Promise<ResolvedTelegramCustomer> {
  const db = getAdminDb();
  const customers = db.collection('customers');
  const canonicalUid = `telegram:${identity.telegramId}`;
  const legacyUid = identity.oidcSubject && identity.oidcSubject !== identity.telegramId
    ? `telegram:${identity.oidcSubject}`
    : undefined;

  const matching = await customers
    .where('telegramId', '==', identity.telegramId)
    .limit(MAX_IDENTITY_ALIASES)
    .get();
  const matchedDocs = matching.docs;
  const matchedUids = matchedDocs.map((document) => document.id);
  const candidateUids = unique([
    canonicalUid,
    ...(legacyUid ? [legacyUid] : []),
    ...matchedUids,
  ]);

  const existingByUid = new Map(
    matchedDocs.map((document) => [document.id, document.data() || {}]),
  );
  for (const uid of [canonicalUid, legacyUid].filter(Boolean) as string[]) {
    if (existingByUid.has(uid)) continue;
    const snapshot = await customers.doc(uid).get();
    if (snapshot.exists) existingByUid.set(uid, snapshot.data() || {});
  }

  const primaryUid = existingByUid.has(canonicalUid)
    ? canonicalUid
    : candidateUids.find((uid) => existingByUid.has(uid)) || canonicalUid;
  const customerRef = customers.doc(primaryUid);

  // A returning login may race with a profile edit. Re-read the chosen
  // customer inside the write transaction so provider refreshes never restore
  // a stale copy of an administrator/customer-edited name or phone number.
  return db.runTransaction(async (transaction) => {
    const currentSnapshot = await transaction.get(customerRef);
    const existing = currentSnapshot.exists
      ? currentSnapshot.data() || {}
      : existingByUid.get(primaryUid) || {};
    const now = new Date().toISOString();
    const name = nonEmptyString(existing.name) || identity.displayName;
    const phone = nonEmptyString(existing.phone) || identity.phone;
    const username = identity.username || nonEmptyString(existing.username);
    const picture = identity.picture || nonEmptyString(existing.picture);
    const identityUids = unique([
      primaryUid,
      ...candidateUids.filter((uid) => existingByUid.has(uid)),
      ...(Array.isArray(existing.identityUids)
        ? existing.identityUids.filter((uid): uid is string => typeof uid === 'string')
        : []),
    ]);

    transaction.set(customerRef, {
      uid: primaryUid,
      provider: 'telegram',
      telegramId: identity.telegramId,
      telegramSubject: identity.oidcSubject || nonEmptyString(existing.telegramSubject) || '',
      telegramDisplayName: identity.displayName,
      telegramPhone: identity.phone || nonEmptyString(existing.telegramPhone) || '',
      name,
      phone: phone || '',
      username: username || '',
      picture: picture || '',
      languageCode: identity.languageCode || nonEmptyString(existing.languageCode) || '',
      identityUids,
      lastLoginAt: now,
      ...(!existing.createdAt ? { createdAt: now } : {}),
    }, { merge: true });

    return {
      uid: primaryUid,
      identityUids,
      telegramId: identity.telegramId,
      name,
      ...(username ? { username } : {}),
      ...(picture ? { picture } : {}),
      ...(phone ? { phone } : {}),
    };
  });
}

export function getTelegramOidcIdentity(input: {
  sub: string;
  id?: string | number;
  name?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  picture?: string;
  phone_number?: string;
  phone_number_verified?: boolean;
}): VerifiedTelegramIdentity {
  if (input.id === undefined || input.id === null || !String(input.id).trim()) {
    throw new Error('Telegram profile does not contain a user id.');
  }
  const displayName = input.name
    || [input.given_name, input.family_name].filter(Boolean).join(' ')
    || input.preferred_username
    || 'Покупатель';
  return {
    telegramId: String(input.id),
    oidcSubject: input.sub,
    displayName,
    ...(input.preferred_username ? { username: input.preferred_username } : {}),
    ...(input.picture ? { picture: input.picture } : {}),
    ...(input.phone_number && input.phone_number_verified ? { phone: input.phone_number } : {}),
  };
}
