import type { CSSProperties, ReactNode } from 'react';
import type { SiteSettings } from '@/types';
import { accessibleForeground, darkenHex, normalizeHex } from '@/lib/theme/colors';

type ThemeStyle = CSSProperties & Record<`--${string}`, string>;

export function StorefrontTheme({
  design,
  children,
}: {
  design: SiteSettings['design'];
  children: ReactNode;
}) {
  const legacyBrandTheme = !design.fontPair || design.fontPair === 'brand';
  const fontPair = legacyBrandTheme ? 'modern' : design.fontPair;
  const configuredRadius = design.borderRadius ?? 14;
  // The original storefront shipped with brand + 8px. Treat that exact pair as
  // the legacy preset so existing installations adopt the approved softer UI
  // without a production settings write. Explicit custom radii remain intact.
  const radius = legacyBrandTheme && configuredRadius === 8 ? 14 : configuredRadius;
  const primary = normalizeHex(design.primaryColor || '#0F6E43');
  // Before design v2 secondaryColor stored an auto-generated dark primary shade.
  // Existing Firestore documents therefore receive the new SANPACK lime accent once.
  const secondary = design.designVersion === 2
    ? normalizeHex(design.secondaryColor || '#DCE9AF', '#DCE9AF')
    : '#DCE9AF';
  const primaryStrong = darkenHex(primary, 0.68);
  const secondaryStrong = darkenHex(secondary, 0.72);
  const style: ThemeStyle = {
    '--sp-primary': primary,
    '--sp-primary-strong': primaryStrong,
    '--sp-secondary': secondary,
    '--sp-secondary-strong': secondaryStrong,
    '--sp-on-primary': accessibleForeground(primary),
    '--sp-on-primary-strong': accessibleForeground(primaryStrong),
    '--sp-on-secondary': accessibleForeground(secondary),
    '--sp-on-secondary-strong': accessibleForeground(secondaryStrong),
    // Compatibility aliases for components that are being moved to semantic tokens.
    '--sp-brand': primary,
    '--sp-brand-deep': primaryStrong,
    '--sp-on-brand': accessibleForeground(primary),
    '--sp-on-brand-deep': accessibleForeground(primaryStrong),
    '--sp-accent': secondary,
    '--sp-on-accent': accessibleForeground(secondary),
    '--sp-cta-bg': primaryStrong,
    '--sp-cta-ink': accessibleForeground(primaryStrong),
    '--sp-cta-action': secondary,
    '--sp-cta-action-ink': accessibleForeground(secondary),
    '--sp-radius': `${Math.min(32, Math.max(0, radius))}px`,
  };

  return (
    <div
      data-storefront-theme={design.themeMode || 'light'}
      data-font-pair={fontPair}
      style={style}
      className="min-h-screen bg-[var(--sp-canvas)] text-[var(--sp-ink)]"
    >
      {children}
    </div>
  );
}
