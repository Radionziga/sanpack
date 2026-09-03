import { randomUUID } from 'node:crypto';
import { isPublicMediaPath } from './storagePaths';
import { prepareMediaUpload } from './prepareUpload';
import { logError } from '@/lib/observability/logger';
import { getAdminDb, getAdminStorage } from '@/lib/firebase/admin';
import { buildSiteMediaUsageIndex, lookupMediaUsage } from './mediaUsageScanner';
import type { MediaItem, MediaLibraryResponse, MediaStats } from './types';

function determineFolder(path: string): string {
  const lower = path.toLowerCase();
  if (lower.startsWith('media/products') || lower.startsWith('products/')) return 'products';
  if (lower.startsWith('media/categories') || lower.startsWith('categories/')) return 'categories';
  if (lower.startsWith('media/services') || lower.startsWith('services/')) return 'services';
  if (lower.startsWith('media/banners') || lower.startsWith('banners/')) return 'banners';
  if (lower.startsWith('media/clients') || lower.startsWith('clients/')) return 'clients';
  if (lower.startsWith('bag-design-requests') || lower.startsWith('bag-designer')) return 'bag-designer';
  if (lower.startsWith('documents') || lower.startsWith('media/documents')) return 'documents';
  if (lower.startsWith('media/uploads') || lower.startsWith('uploads/')) return 'uploads';
  return 'other';
}

function constructPublicUrl(bucketName: string, filePath: string, downloadToken?: string): string {
  const encodedPath = encodeURIComponent(filePath);
  if (downloadToken) {
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;
  }
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media`;
}

export async function getAllMediaLibrary(): Promise<MediaLibraryResponse> {
  const bucket = getAdminStorage().bucket();
  const db = getAdminDb();

  // 1. Concurrently fetch all files from Storage and build Firestore usage index
  const [filesResult, usageIndex] = await Promise.all([
    bucket.getFiles({ autoPaginate: true }),
    buildSiteMediaUsageIndex(db),
  ]);

  const rawFiles = filesResult[0] || [];
  const files: MediaItem[] = [];

  let totalSizeBytes = 0;
  let usedCount = 0;
  let unusedCount = 0;
  const folderCounts: Record<string, number> = {
    all: 0,
    products: 0,
    categories: 0,
    services: 0,
    banners: 0,
    clients: 0,
    'bag-designer': 0,
    documents: 0,
    uploads: 0,
    other: 0,
  };

  for (const file of rawFiles) {
    // Skip folder marker placeholder files ending with '/'
    if (file.name.endsWith('/') || !isPublicMediaPath(file.name)) continue;

    const metadata = file.metadata || {};
    const size = parseInt(String(metadata.size || '0'), 10) || 0;
    const contentType = metadata.contentType || 'application/octet-stream';
    const folder = determineFolder(file.name);
    const downloadToken = (metadata.metadata as Record<string, string> | undefined)?.firebaseStorageDownloadTokens;
    const originalName = (metadata.metadata as Record<string, string> | undefined)?.originalName;
    const publicUrl = constructPublicUrl(bucket.name, file.name, downloadToken);

    // Look up usage across products, categories, banners, etc.
    const usage = lookupMediaUsage(usageIndex, file.name, publicUrl);

    if (usage.isUsed) {
      usedCount++;
    } else {
      unusedCount++;
    }

    totalSizeBytes += size;
    folderCounts.all = (folderCounts.all || 0) + 1;
    folderCounts[folder] = (folderCounts[folder] || 0) + 1;

    const parts = file.name.split('/');
    const name = parts[parts.length - 1] || file.name;

    files.push({
      id: Buffer.from(file.name).toString('base64url'),
      name,
      path: file.name,
      url: publicUrl,
      size,
      contentType,
      folder,
      createdAt: metadata.timeCreated || new Date().toISOString(),
      updatedAt: metadata.updated || metadata.timeCreated || new Date().toISOString(),
      originalName,
      usage,
    });
  }

  // Sort files by newest creation date first by default
  files.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const stats: MediaStats = {
    totalCount: files.length,
    totalSizeBytes,
    usedCount,
    unusedCount,
    folderCounts,
  };

  return { files, stats };
}

export async function uploadSingleMediaFile({
  buffer,
  originalName,
  mimeType,
  folder,
  uploaderUid,
}: {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  folder: string;
  uploaderUid?: string;
}): Promise<MediaItem> {
  const bucket = getAdminStorage().bucket();
  const token = randomUUID();
  const sanitizedFolder = folder.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'uploads';
  const prepared = await prepareMediaUpload(buffer, mimeType);
  const outputBuffer = prepared.buffer;
  const outputMimeType = prepared.mimeType;
  const targetExt = prepared.extension;

  const cleanBaseName = originalName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g, '_')
    .slice(0, 40)
    .toLowerCase();

  const fileName = `${cleanBaseName || 'file'}_${randomUUID().slice(0, 8)}.${targetExt}`;
  const storagePath = `media/${sanitizedFolder}/${fileName}`;
  if (!isPublicMediaPath(storagePath)) throw new Error('Invalid public media path.');
  const file = bucket.file(storagePath);

  await file.save(outputBuffer, {
    resumable: false,
    validation: 'crc32c',
    metadata: {
      contentType: outputMimeType,
      contentDisposition: prepared.disposition,
      cacheControl: 'public,max-age=31536000,immutable',
      metadata: {
        firebaseStorageDownloadTokens: token,
        originalName: originalName.slice(0, 180),
        uploadedBy: uploaderUid || 'admin',
      },
    },
  });

  const publicUrl = constructPublicUrl(bucket.name, storagePath, token);
  const now = new Date().toISOString();

  return {
    id: Buffer.from(storagePath).toString('base64url'),
    name: fileName,
    path: storagePath,
    url: publicUrl,
    size: outputBuffer.length,
    contentType: outputMimeType,
    folder: sanitizedFolder,
    createdAt: now,
    updatedAt: now,
    originalName,
    usage: {
      isUsed: false,
      totalCount: 0,
      locations: [],
    },
  };
}

export async function deleteMediaFileWithSafety({
  path,
  force = false,
}: {
  path: string;
  force?: boolean;
}): Promise<{ success: boolean; usage?: ReturnType<typeof lookupMediaUsage> }> {
  if (!isPublicMediaPath(path)) throw new Error('Only public CMS media can be deleted here.');
  const bucket = getAdminStorage().bucket();
  const db = getAdminDb();

  // If not forced, check if it's currently used anywhere on the site
  if (!force) {
    const usageIndex = await buildSiteMediaUsageIndex(db);
    const usage = lookupMediaUsage(usageIndex, path);
    if (usage.isUsed) {
      return {
        success: false,
        usage,
      };
    }
  }

  // Delete from bucket
  await bucket.file(path).delete({ ignoreNotFound: true });
  return { success: true };
}

export interface BatchDeleteResult {
  deleted: string[];
  skippedInUse: Array<{ path: string; usage: ReturnType<typeof lookupMediaUsage> }>;
  failed: Array<{ path: string; error: string }>;
}

export async function deleteBatchMediaFilesWithSafety({
  paths,
  force = false,
}: {
  paths: string[];
  force?: boolean;
}): Promise<BatchDeleteResult> {
  const bucket = getAdminStorage().bucket();
  const db = getAdminDb();

  const uniquePaths = Array.from(new Set(paths.map((p) => p.trim()).filter(Boolean)));
  const result: BatchDeleteResult = {
    deleted: [],
    skippedInUse: [],
    failed: [],
  };

  if (uniquePaths.length === 0) {
    return result;
  }

  // Build usage index once for the entire batch if safety check is requested
  const usageIndex = !force ? await buildSiteMediaUsageIndex(db) : null;

  for (const path of uniquePaths) {
    try {
      if (!isPublicMediaPath(path)) throw new Error('Only public CMS media can be deleted here.');
      if (!force && usageIndex) {
        const usage = lookupMediaUsage(usageIndex, path);
        if (usage.isUsed) {
          result.skippedInUse.push({ path, usage });
          continue;
        }
      }

      await bucket.file(path).delete({ ignoreNotFound: true });
      result.deleted.push(path);
    } catch (err) {
      logError('media.delete_failed', err);
      result.failed.push({
        path,
        error: 'Не удалось удалить файл',
      });
    }
  }

  return result;
}
