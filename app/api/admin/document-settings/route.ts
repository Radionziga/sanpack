import { logError } from '@/lib/observability/logger';
import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { getInternalDocumentSettings } from '@/lib/documents/settings';
import { internalDocumentSettingsSchema } from '@/lib/validation/order';
import { firebaseAdminUnavailableMessage } from '@/lib/firebase/adminErrors';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 });
    if (admin.role !== 'super_admin') return NextResponse.json({ error: 'Недостаточно прав.' }, { status: 403 });
    return NextResponse.json(await getInternalDocumentSettings());
  } catch (error) {
    logError('Document settings loading failed.', error);
    return NextResponse.json(
      { error: firebaseAdminUnavailableMessage('данных', error) },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 });
    if (admin.role !== 'super_admin') return NextResponse.json({ error: 'Недостаточно прав.' }, { status: 403 });
    const parsed = internalDocumentSettingsSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Проверьте реквизиты документа.', issues: parsed.error.issues }, { status: 400 });
    }
    await getAdminDb().collection('backofficeSettings').doc('documents').set({
      ...parsed.data,
      updatedAt: new Date().toISOString(),
      updatedBy: admin.uid,
    });
    return NextResponse.json(parsed.data);
  } catch (error) {
    logError('Document settings saving failed.', error);
    return NextResponse.json(
      { error: firebaseAdminUnavailableMessage('данных', error) },
      { status: 503 }
    );
  }
}
