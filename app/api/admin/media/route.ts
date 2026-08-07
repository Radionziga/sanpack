import { randomUUID } from 'node:crypto';
import { getDownloadURL } from 'firebase-admin/storage';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { z } from 'zod';
import { getAdminSession } from '@/lib/auth/server';
import { getAdminStorage } from '@/lib/firebase/admin';
import { firebaseAdminUnavailableMessage } from '@/lib/firebase/adminErrors';
import { MAX_MEDIA_FILE_SIZE, mediaPresets } from '@/lib/media/presets';

export const runtime = 'nodejs';

const MAX_INPUT_PIXELS = 40_000_000;
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedFormats = new Set(['jpeg', 'png', 'webp']);

const mediaKindSchema = z.enum(Object.keys(mediaPresets) as [keyof typeof mediaPresets, ...(keyof typeof mediaPresets)[]]);
const deleteSchema = z.object({
  path: z.string().trim().min(1).max(500).refine(
    (path) => path.startsWith('media/banners/') || path.startsWith('media/categories/'),
    'Недопустимый путь файла.'
  ),
}).strict();

async function authorizeMediaMutation() {
  const admin = await getAdminSession();
  if (!admin) {
    return { response: NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 }), admin: null };
  }
  if (admin.role !== 'super_admin' && admin.role !== 'content_manager') {
    return { response: NextResponse.json({ error: 'У вашей роли нет прав на загрузку медиа.' }, { status: 403 }), admin: null };
  }
  return { response: null, admin };
}

export async function POST(request: Request) {
  const authorization = await authorizeMediaMutation();
  if (authorization.response || !authorization.admin) return authorization.response;

  try {
    const formData = await request.formData();
    const kindResult = mediaKindSchema.safeParse(formData.get('kind'));
    const file = formData.get('file');

    if (!kindResult.success || !(file instanceof File)) {
      return NextResponse.json({ error: 'Выберите тип изображения и файл.' }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_MEDIA_FILE_SIZE) {
      return NextResponse.json({ error: 'Файл должен быть меньше 15 МБ.' }, { status: 413 });
    }
    if (!allowedMimeTypes.has(file.type)) {
      return NextResponse.json({ error: 'Поддерживаются только JPEG, PNG и WebP.' }, { status: 415 });
    }

    const input = Buffer.from(await file.arrayBuffer());
    const processor = sharp(input, {
      failOn: 'error',
      limitInputPixels: MAX_INPUT_PIXELS,
    });
    const metadata = await processor.metadata();

    if (!metadata.format || !allowedFormats.has(metadata.format) || !metadata.width || !metadata.height) {
      return NextResponse.json({ error: 'Файл не распознан как поддерживаемое изображение.' }, { status: 415 });
    }

    const config = mediaPresets[kindResult.data];

    const { data, info } = await processor
      .rotate()
      .resize({
        width: config.width,
        height: config.height,
        fit: 'cover',
        position: 'centre',
      })
      .webp({
        quality: config.quality,
        alphaQuality: 92,
        smartSubsample: true,
        effort: 5,
      })
      .toBuffer({ resolveWithObject: true });

    const path = `${config.directory}/${randomUUID()}.webp`;
    const storageFile = getAdminStorage().bucket().file(path);
    const downloadToken = randomUUID();

    await storageFile.save(data, {
      resumable: false,
      validation: 'crc32c',
      metadata: {
        contentType: 'image/webp',
        cacheControl: 'public,max-age=31536000,immutable',
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
          uploadedBy: authorization.admin.uid,
          originalName: file.name.slice(0, 180),
        },
      },
    });

    try {
      const url = await getDownloadURL(storageFile);
      return NextResponse.json({
        url,
        path,
        width: info.width,
        height: info.height,
        size: info.size,
        originalWidth: metadata.width,
        originalHeight: metadata.height,
      });
    } catch (error) {
      await storageFile.delete({ ignoreNotFound: true }).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    console.error('Admin media upload failed.', error);
    return NextResponse.json(
      { error: firebaseAdminUnavailableMessage('изображений', error) },
      { status: 503 }
    );
  }
}

export async function DELETE(request: Request) {
  const authorization = await authorizeMediaMutation();
  if (authorization.response) return authorization.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Некорректное тело запроса.' }, { status: 400 });
  }

  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Некорректный путь.' }, { status: 400 });
  }

  try {
    await getAdminStorage().bucket().file(parsed.data.path).delete({ ignoreNotFound: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin media deletion failed.', error);
    return NextResponse.json({ error: firebaseAdminUnavailableMessage('изображений', error) }, { status: 503 });
  }
}
