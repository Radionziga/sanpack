import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminSession } from '@/lib/auth/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { getBagDesignerSettings } from '@/lib/bag-designer/settings';
import type { BagDesignRequestRecord } from '@/lib/bag-designer/types';

export const runtime = 'nodejs';

const typeSchema = z.enum(['tshirt', 'die-cut', 'flat']);
const settingsSchema = z.object({
  enabled: z.boolean(),
  minimumQuantity: z.number().int().min(1).max(10_000_000),
  sizePresets: z.array(z.object({
    id: z.string().trim().min(1).max(80),
    bagType: typeSchema,
    label: z.string().trim().min(1).max(80),
    width: z.number().min(10).max(120),
    height: z.number().min(15).max(150),
    gusset: z.number().min(0).max(40),
  }).strict()).min(3).max(60),
  colors: z.array(z.object({
    id: z.string().trim().min(1).max(80),
    label: z.string().trim().min(1).max(80),
    value: z.string().regex(/^#[0-9a-f]{6}$/i),
  }).strict()).min(1).max(30),
}).strict();

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save'), settings: settingsSchema }).strict(),
  z.object({ action: z.literal('status'), id: z.string().min(8).max(100), status: z.enum(['new', 'in_progress', 'completed', 'cancelled']) }).strict(),
]);

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 });
    const [settings, requests] = await Promise.all([
      getBagDesignerSettings(),
      getAdminDb().collection('bagDesignRequests').orderBy('createdAt', 'desc').limit(100).get(),
    ]);
    const list = requests.docs.map((document) => ({ id: document.id, ...document.data(), requestTokenHash: undefined }) as unknown as BagDesignRequestRecord)
      .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
    return NextResponse.json({ settings, requests: list });
  } catch (error) {
    console.error('Bag designer admin loading failed.', error);
    return NextResponse.json({ error: 'Не удалось загрузить модуль конструктора.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 });
    const parsed = actionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Проверьте заполненные настройки.' }, { status: 400 });
    if (parsed.data.action === 'status') {
      await getAdminDb().collection('bagDesignRequests').doc(parsed.data.id).update({ status: parsed.data.status, updatedAt: new Date().toISOString() });
      return NextResponse.json({ message: 'Статус заявки обновлён.' });
    }
    const settings = { ...parsed.data.settings, updatedAt: new Date().toISOString(), updatedBy: admin.uid };
    const batch = getAdminDb().batch();
    batch.set(getAdminDb().collection('moduleSettings').doc('bagDesigner'), settings);
    batch.set(getAdminDb().collection('settings').doc('global'), { modules: { bagDesigner: { enabled: settings.enabled } } }, { merge: true });
    await batch.commit();
    revalidateTag('settings', { expire: 0 });
    return NextResponse.json({ settings, message: 'Настройки конструктора сохранены.' });
  } catch (error) {
    console.error('Bag designer admin operation failed.', error);
    return NextResponse.json({ error: 'Изменения не сохранены. Попробуйте ещё раз.' }, { status: 503 });
  }
}
