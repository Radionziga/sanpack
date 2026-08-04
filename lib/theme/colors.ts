const DEFAULT_BRAND = '#0F6E43';

export function normalizeHex(value: string, fallback = DEFAULT_BRAND) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : fallback;
}

function srgbChannel(value: number) {
  const channel = value / 255;
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string) {
  const normalized = normalizeHex(hex).slice(1);
  const [red, green, blue] = [0, 2, 4].map((offset) =>
    srgbChannel(Number.parseInt(normalized.slice(offset, offset + 2), 16))
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(first: string, second: string) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

export function accessibleForeground(background: string) {
  const dark = '#14231C';
  const light = '#FFFFFF';
  return contrastRatio(background, dark) >= contrastRatio(background, light) ? dark : light;
}

export function darkenHex(hex: string, factor = 0.72) {
  const normalized = normalizeHex(hex).slice(1);
  const channels = [0, 2, 4].map((offset) =>
    Math.round(Number.parseInt(normalized.slice(offset, offset + 2), 16) * factor)
  );
  return `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}
