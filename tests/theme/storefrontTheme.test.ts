import type { CSSProperties, ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { StorefrontTheme } from '@/components/theme/StorefrontTheme';
import type { SiteSettings } from '@/types';

type ThemeElement = ReactElement<{
  'data-storefront-theme': string;
  'data-font-pair': string;
  style: CSSProperties & Record<`--${string}`, string>;
}>;

function renderTheme(
  themeMode: SiteSettings['design']['themeMode'],
  borderRadius: number,
) {
  return StorefrontTheme({
    design: {
      designVersion: 2,
      primaryColor: '#176B4D',
      secondaryColor: '#E5D36A',
      borderRadius,
      themeMode,
      fontPair: 'neutral',
    },
    children: null,
  }) as ThemeElement;
}

describe('StorefrontTheme contract', () => {
  it.each([
    ['light', 0, '0px'],
    ['dark', 16, '16px'],
    ['light', 32, '32px'],
  ] as const)('exposes %s mode with configured radius %i', (mode, radius, expectedRadius) => {
    const element = renderTheme(mode, radius);

    expect(element.props['data-storefront-theme']).toBe(mode);
    expect(element.props.style['--sp-radius']).toBe(expectedRadius);
    expect(element.props.style['--sp-primary']).toBe('#176B4D');
    expect(element.props.style['--sp-secondary']).toBe('#E5D36A');
  });

  it('bounds unexpected radius values at the design-system limits', () => {
    expect(renderTheme('light', -4).props.style['--sp-radius']).toBe('0px');
    expect(renderTheme('dark', 48).props.style['--sp-radius']).toBe('32px');
  });

  it('maps the legacy brand preset to the approved modern storefront defaults', () => {
    const element = StorefrontTheme({
      design: {
        designVersion: 2,
        primaryColor: '#0F6E43',
        secondaryColor: '#DCE9AF',
        borderRadius: 8,
        themeMode: 'light',
        fontPair: 'brand',
      },
      children: null,
    }) as ThemeElement;

    expect(element.props['data-font-pair']).toBe('modern');
    expect(element.props.style['--sp-radius']).toBe('14px');
  });
});
