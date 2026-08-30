export type MediaUsageType =
  | 'product'
  | 'category'
  | 'banner'
  | 'client'
  | 'settings'
  | 'document'
  | 'bag_request';

export interface MediaUsageLocation {
  type: MediaUsageType;
  id: string;
  title: string;
  field: string;
  editUrl?: string;
  sku?: string;
}

export interface MediaUsageSummary {
  isUsed: boolean;
  totalCount: number;
  locations: MediaUsageLocation[];
}

export type MediaFolderKey =
  | 'all'
  | 'products'
  | 'categories'
  | 'services'
  | 'banners'
  | 'clients'
  | 'bag-designer'
  | 'documents'
  | 'uploads'
  | 'other';

export interface MediaItem {
  id: string;
  name: string;
  path: string;
  url: string;
  size: number;
  contentType: string;
  folder: string;
  createdAt: string;
  updatedAt: string;
  width?: number;
  height?: number;
  originalName?: string;
  usage: MediaUsageSummary;
}

export interface MediaStats {
  totalCount: number;
  totalSizeBytes: number;
  usedCount: number;
  unusedCount: number;
  folderCounts: Record<string, number>;
}

export interface MediaLibraryResponse {
  files: MediaItem[];
  stats: MediaStats;
}
