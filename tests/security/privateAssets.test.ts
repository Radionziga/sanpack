import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/firebase/admin', () => ({ getAdminStorage: vi.fn() }));
import { isPrivateBagAssetPath, isPublicMediaPath } from '@/lib/media/storagePaths';
import { privateBagAssetUrl, verifyPrivateBagAssetUrl, withPrivateBagAssetUrls } from '@/lib/bag-designer/privateAssets';

afterEach(() => vi.unstubAllEnvs());
describe('private Storage capability boundary', () => {
  it('separates public CMS and private customer paths', () => {
    expect(isPublicMediaPath('media/products/a.webp')).toBe(true);
    expect(isPublicMediaPath('bag-design-requests/request-1/logo.png')).toBe(false);
    expect(isPrivateBagAssetPath('bag-design-requests/request-1/logo.png')).toBe(true);
    expect(isPrivateBagAssetPath('bag-design-requests/../logo.png')).toBe(false);
  });
  it('creates a short-lived signed application URL and rejects expiry/tampering', () => {
    vi.stubEnv('TELEGRAM_CONFIG_ENCRYPTION_KEY', 'fixture-secret-material-at-least-24-chars');
    const now = Date.UTC(2026, 8, 1);
    const url = new URL(privateBagAssetUrl('bag-design-requests/request-1/ai-mockup.webp', true, now));
    expect(url.origin).toBe('http://localhost:3000');
    expect(verifyPrivateBagAssetUrl(url, now + 59 * 60 * 1000)).toBe(true);
    expect(verifyPrivateBagAssetUrl(url, now + 61 * 60 * 1000)).toBe(false);
    url.searchParams.set('path', 'bag-design-requests/request-1/logo.png');
    expect(verifyPrivateBagAssetUrl(url, now)).toBe(false);
  });
  it('removes legacy download tokens from serialized records', () => {
    vi.stubEnv('TELEGRAM_CONFIG_ENCRYPTION_KEY', 'fixture-secret-material-at-least-24-chars');
    const result = withPrivateBagAssetUrls({
      aiMockupUrl: 'https://firebasestorage.googleapis.com/v0/b/b/o/bag-design-requests%2Frequest-1%2Fai-mockup.png?alt=media&token=private',
      assetPaths: { logo: 'bag-design-requests/request-1/logo.png', technicalPreview: 'bag-design-requests/request-1/technical-preview.png', aiMockup: 'bag-design-requests/request-1/ai-mockup.png' },
    });
    expect(result.aiMockupUrl).toContain('/api/bag-designer/asset?');
    expect(result.aiMockupUrl).not.toContain('token=private');
  });
});
