import { describe, expect, it } from 'vitest';
import { buildLocalizedPath } from '@/lib/i18n/localeNavigation';

describe('locale navigation', () => {
  it('preserves search/filter query and hash', () => {
    expect(buildLocalizedPath('/ru/search', 'en', 'q=milk&sort=name', '#results'))
      .toBe('/en/search?q=milk&sort=name#results');
  });
});
