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
});

function canMutate(role: UserRole, resource?: Resource, action?: string) {
  if (role === 'super_admin') return true;
  if (role === 'viewer' || action === 'seed') return false;
  if (role === 'sales_manager') return resource === 'requests';
  return resource !== 'requests';
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
      return NextResponse.json(document.exists ? document.data() : {});
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
      { error: 'Не удалось загрузить данные из Firestore.' },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  const authorization = await denyUnlessAdmin();
  if (authorization.response || !authorization.admin) return authorization.response;

  try {
    const mutation = mutationSchema.parse(await request.json());
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
        revalidateTag(name);
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
      revalidateTag(mutation.resource);
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

    const timestamp = new Date().toISOString();
    const data = {
      ...mutation.data,
      id: mutation.id,
      updatedAt: timestamp,
      updatedBy: authorization.admin.uid,
    };
    await document.set(data, { merge: true });
    revalidateTag(mutation.resource);
    const saved = await document.get();
    return NextResponse.json({ id: saved.id, ...saved.data() });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Некорректная операция.' }, { status: 400 });
    }
    console.error('Admin mutation failed.', error);
    return NextResponse.json(
      { error: 'Firestore отклонил операцию. Изменения не сохранены.' },
      { status: 503 }
    );
  }
}
