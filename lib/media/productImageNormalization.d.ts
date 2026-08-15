export interface ProductImageNormalizationOptions {
  size?: number;
  quality?: number;
  safetyFrame?: number;
}

export function normalizeCatalogProductImage(
  input: Buffer | Uint8Array,
  options?: ProductImageNormalizationOptions,
): Promise<Buffer>;
