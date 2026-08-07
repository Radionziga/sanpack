import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { getAdminSession } from '@/lib/auth/server';
import { getAdminDb } from '@/lib/firebase/admin';
import {
  initialAttributes,
  initialBanners,
  initialCategories,
  initialClients,
  initialProducts,
  initialSiteSettings,
} from '@/lib/seedData';
import type { UserRole } from '@/types';
import { validateAdminResourceData } from '@/lib/validation/adminContent';
import { mergeSiteSettings } from '@/lib/settings/mergeSiteSettings';
import { firebaseAdminUnavailableMessage } from '@/lib/firebase/adminErrors';

export const runtime = 'nodejs';

const resourceSchema = z.enum([
  'products',
  'categories',
  'attributes',
  'requests',
  'clients',
  'banners',
  'settings',
]);
type Resource = z.infer<typeof resourceSchema>;

const mutationSchema = z.object({
  action: z.enum(['save', 'delete', 'seed', 'updateRequestStatus']),
  resource: resourceSchema.optional(),
  id: z.string().max(160).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
}).strict();

function canMutate(role: UserRole, resource?: Resource, action?: string) {
  // Orders are append-only business records. All allowed changes go through the
  // dedicated order endpoint, which validates the payload and writes an audit trail.
  if (resource === 'requests') return false;
  if (role === 'super_admin') return true;
  if (role === 'viewer' || action === 'seed') return false;
  if (role === 'sales_manager') return false;
  return true;
}

async function denyUnlessAdmin() {
  const admin = await getAdminSession();
  if (!admin) {
    return {
      response: NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 }),
      admin: null,
    };
  }
  return { response: null, admin };
}

export async function GET(request: Request) {
  const authorization = await denyUnlessAdmin();
  if (authorization.response) return authorization.response;

  const parsed = resourceSchema.safeParse(
    new URL(request.url).searchParams.get('resource')
  );
  if (!parsed.success) {
    return NextResponse.json({ error: 'Неизвестный ресурс.' }, { status: 400 });
  }

  try {
    if (parsed.data === 'settings') {
      const document = await getAdminDb().collection('settings').doc('global').get();
      return NextResponse.json(
        document.exists
          ? mergeSiteSettings(initialSiteSettings, document.data() as Partial<typeof initialSiteSettings>)
          : initialSiteSettings
      );
    }
    const snapshot = await getAdminDb().collection(parsed.data).get();
    const data = snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    }));
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Admin read failed for ${parsed.data}.`, error);
    return NextResponse.json(
      { error: firebaseAdminUnavailableMessage('данных', error) },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  const authorization = await denyUnlessAdmin();
  if (authorization.response || !authorization.admin) return authorization.response;

  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Некорректное тело запроса.' }, { status: 400 });
    }

    const parsedMutation = mutationSchema.safeParse(rawBody);
    if (!parsedMutation.success) {
      return NextResponse.json(
        { error: 'Некорректная операция.', issues: parsedMutation.error.issues },
        { status: 400 }
      );
    }
    const mutation = parsedMutation.data;
    if (!canMutate(authorization.admin.role, mutation.resource, mutation.action)) {
      return NextResponse.json(
        { error: 'У вашей роли нет прав на эту операцию.' },
        { status: 403 }
      );
    }

    const database = getAdminDb();

    if (mutation.action === 'seed') {
      const batch = database.batch();
      const collections = [
        ['products', initialProducts],
        ['categories', initialCategories],
        ['attributes', initialAttributes],
        ['clients', initialClients],
        ['banners', initialBanners],
      ] as const;
      for (const [name, records] of collections) {
        for (const record of records) {
          batch.set(database.collection(name).doc(record.id), record);
        }
      }
      batch.set(database.collection('settings').doc('global'), initialSiteSettings);
      await batch.commit();
      for (const name of ['products', 'categories', 'attributes', 'clients', 'banners', 'settings']) {
        revalidateTag(name, { expire: 0 });
      }
      return NextResponse.json({
        success: true,
        message: 'Firestore заполнен начальными данными.',
      });
    }

    if (!mutation.resource || !mutation.id) {
      return NextResponse.json(
        { error: 'Для операции не указан ресурс или ID.' },
        { status: 400 }
      );
    }

    const document = database.collection(mutation.resource).doc(mutation.id);
    if (mutation.action === 'delete') {
      await document.delete();
      revalidateTag(mutation.resource, { expire: 0 });
      return NextResponse.json({ success: true });
    }

    if (mutation.action === 'updateRequestStatus') {
      await document.update({
        ...mutation.data,
        updatedAt: new Date().toISOString(),
      });
      const updated = await document.get();
      return NextResponse.json({ id: updated.id, ...updated.data() });
    }

    const validatedData = validateAdminResourceData(
      mutation.resource,
      mutation.data ?? {}
    );
    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'Проверьте заполненные поля.', issues: validatedData.error.issues },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();
    const data = {
      ...(validatedData.data as Record<string, unknown>),
      id: mutation.id,
      updatedAt: timestamp,
      updatedBy: authorization.admin.uid,
    };
    await document.set(data, { merge: true });
    revalidateTag(mutation.resource, { expire: 0 });
    const saved = await document.get();
    return NextResponse.json({ id: saved.id, ...saved.data() });
  } catch (error) {
    console.error('Admin mutation failed.', error);
    return NextResponse.json(
      { error: firebaseAdminUnavailableMessage('данных', error) },
      { status: 503 }
    );
  }
}
