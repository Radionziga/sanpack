export const MAX_MEDIA_FILE_SIZE = 15 * 1024 * 1024;

export const mediaPresets = {
  'banner-desktop': {
    directory: 'media/banners',
    width: 1920,
    height: 560,
    quality: 88,
    label: 'Баннер для компьютеров',
  },
  'banner-mobile': {
    directory: 'media/banners',
    width: 960,
    height: 960,
    quality: 88,
    label: 'Баннер для телефонов',
  },
  category: {
    directory: 'media/categories',
    width: 800,
    height: 600,
    quality: 86,
    label: 'Изображение категории',
  },
} as const;

export type MediaKind = keyof typeof mediaPresets;
