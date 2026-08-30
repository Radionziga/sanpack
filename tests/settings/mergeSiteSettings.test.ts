import { describe, expect, it } from 'vitest';
import { initialSiteSettings } from '@/lib/seedData';
import { mergeSiteSettings } from '@/lib/settings/mergeSiteSettings';

describe('mergeSiteSettings service modules', () => {
  it('keeps default service artwork when an older document only stores the enabled flag', () => {
    const settings = mergeSiteSettings(initialSiteSettings, {
      modules: {
        bagDesigner: { enabled: false },
      },
    });

    expect(settings.modules?.branding).toEqual({
      enabled: true,
      navigationImage: '/catalog/category-icons-v3/branding-service-v2.webp',
    });
    expect(settings.modules?.bagDesigner).toEqual({
      enabled: false,
      navigationImage: '/catalog/category-icons-v3/bag-designer-service-v2.webp',
    });
  });

  it('preserves an image uploaded from the admin service editor', () => {
    const settings = mergeSiteSettings(initialSiteSettings, {
      modules: {
        branding: {
          enabled: true,
          navigationImage: 'https://example.com/branding.webp',
          navigationImagePath: 'media/services/branding.webp',
        },
      },
    });

    expect(settings.modules?.branding).toEqual({
      enabled: true,
      navigationImage: 'https://example.com/branding.webp',
      navigationImagePath: 'media/services/branding.webp',
    });
  });
});
