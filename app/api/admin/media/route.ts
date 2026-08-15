import { randomUUID } from 'node:crypto';
import { getDownloadURL } from 'firebase-admin/storage';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { z } from 'zod';
import { getAdminSession } from '@/lib/auth/server';
import { getAdminStorage } from '@/lib/firebase/admin';
import { firebaseAdminUnavailableMessage } from '@/lib/firebase/adminErrors';
import { MAX_MEDIA_FILE_SIZE, mediaPresets } from '@/lib/media/presets';
import {
  deleteBatchMediaFilesWithSafety,
  deleteMediaFileWithSafety,
  getAllMediaLibrary,
  uploadSingleMediaFile,
} from '@/lib/media/storageService';

export const runtime = 'nodejs';

const MAX_INPUT_PIXELS = 40_000_000;
const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/gif',
  'application/pdf',
]);
const allowedFormats = new Set(['jpeg', 'png', 'webp', 'svg', 'gif']);

const mediaKindSchema = z.enum(Object.keys(mediaPresets) as [keyof typeof mediaPresets, ...(keyof typeof mediaPresets)[]]);

const deleteSchema = z.union([
  z.object({
    path: z.string().trim().min(1).max(500),
    force: z.boolean().optional().default(false),
  }),
  z.object({
    paths: z.array(z.string().trim().min(1).max(500)).min(1).max(200),
    force: z.boolean().optional().default(false),
  }),
]);

async function authorizeMediaRead() {
  const admin = await getAdminSession();
  if (!admin) {
    return { response: NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 }), admin: null };
  }
  return { response: null, admin };
}

async function authorizeMediaMutation() {
  const admin = await getAdminSession();
  if (!admin) {
    return { response: NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 }), admin: null };
  }
  if (admin.role !== 'super_admin' && admin.role !== 'content_manager') {
    return { response: NextResponse.json({ error: 'У вашей роли нет прав на изменение медиа.' }, { status: 403 }), admin: null };
  }
  return { response: null, admin };
}

export async function GET() {
  const authorization = await authorizeMediaRead();
  if (authorization.response || !authorization.admin) return authorization.response;

  try {
    const data = await getAllMediaLibrary();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to list media files:', error);
    return NextResponse.json(
      { error: firebaseAdminUnavailableMessage('изображений', error) },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeMediaMutation();
  if (authorization.response || !authorization.admin) return authorization.response;

  try {
    const formData = await request.formData();
    const rawKind = formData.get('kind');
    const targetFolder = (formData.get('folder') as string | null) || 'uploads';
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Выберите файл для загрузки.' }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_MEDIA_FILE_SIZE) {
      return NextResponse.json({ error: 'Файл должен быть меньше 15 МБ.' }, { status: 413 });
    }
    if (!allowedMimeTypes.has(file.type)) {
      return NextResponse.json({ error: 'Поддерживаются форматы JPEG, PNG, WebP, SVG, GIF и PDF.' }, { status: 415 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // 1. Legacy preset crop flow (from MediaUploadField / ImageCropEditor)
    const kindResult = mediaKindSchema.safeParse(rawKind);
    if (kindResult.success) {
      const processor = sharp(fileBuffer, {
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
    }

    // 2. General Media Library direct upload
    const uploadedItem = await uploadSingleMediaFile({
      buffer: fileBuffer,
      originalName: file.name,
      mimeType: file.type,
      folder: targetFolder,
      uploaderUid: authorization.admin.uid,
    });

    return NextResponse.json(uploadedItem, { status: 201 });
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
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Некорректные параметры удаления.' }, { status: 400 });
  }

  try {
    // 1. Batch deletion
    if ('paths' in parsed.data) {
      const result = await deleteBatchMediaFilesWithSafety({
        paths: parsed.data.paths,
        force: parsed.data.force,
      });

      return NextResponse.json(result);
    }

    // 2. Single deletion
    const result = await deleteMediaFileWithSafety({
      path: parsed.data.path,
      force: parsed.data.force,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Файл используется на сайте.',
          inUse: true,
          usage: result.usage,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin media deletion failed.', error);
    return NextResponse.json({ error: firebaseAdminUnavailableMessage('изображений', error) }, { status: 503 });
  }
}
