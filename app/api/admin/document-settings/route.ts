import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { getInternalDocumentSettings } from '@/lib/documents/settings';
import { internalDocumentSettingsSchema } from '@/lib/validation/order';

export const runtime = 'nodejs';

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 });
  return NextResponse.json(await getInternalDocumentSettings());
}

export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 });
  const parsed = internalDocumentSettingsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Проверьте реквизиты документа.', issues: parsed.error.issues }, { status: 400 });
  }
  await getAdminDb().collection('backofficeSettings').doc('documents').set({
    ...parsed.data,
    updatedAt: new Date().toISOString(),
    updatedBy: admin.uid,
  });
  return NextResponse.json(parsed.data);
}

