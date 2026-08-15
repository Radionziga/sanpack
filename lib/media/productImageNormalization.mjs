import sharp from 'sharp';

const DEFAULT_SIZE = 1200;
const DEFAULT_QUALITY = 92;

function isLightNeutralBackground(r, g, b) {
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  const chroma = max - min;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  return min >= 202 && chroma <= 42 && luminance >= 214;
}

/**
 * Prepares a catalog image for a seamless white product-card surface.
 *
 * Gemini can visually describe a white background while still returning a
 * light grey vignette. A border-connected flood fill removes only that light,
 * neutral background and leaves the product (and its compact contact shadow)
 * intact. The safety frame guarantees mathematically white edge pixels.
 */
export async function normalizeCatalogProductImage(
  input,
  { size = DEFAULT_SIZE, quality = DEFAULT_QUALITY, safetyFrame = 10 } = {},
) {
  const { data, info } = await sharp(input)
    .rotate()
    .resize(size, size, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
      withoutEnlargement: false,
    })
    .flatten({ background: '#ffffff' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const pixelCount = width * height;
  const visited = new Uint8Array(pixelCount);
  const queue = new Uint32Array(pixelCount);
  let head = 0;
  let tail = 0;

  const addCandidate = (x, y) => {
    const pixelIndex = y * width + x;
    if (visited[pixelIndex]) return;

    const offset = pixelIndex * channels;
    if (!isLightNeutralBackground(data[offset], data[offset + 1], data[offset + 2])) return;

    visited[pixelIndex] = 1;
    queue[tail++] = pixelIndex;
  };

  for (let x = 0; x < width; x += 1) {
    addCandidate(x, 0);
    addCandidate(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    addCandidate(0, y);
    addCandidate(width - 1, y);
  }

  while (head < tail) {
    const pixelIndex = queue[head++];
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    if (x > 0) addCandidate(x - 1, y);
    if (x + 1 < width) addCandidate(x + 1, y);
    if (y > 0) addCandidate(x, y - 1);
    if (y + 1 < height) addCandidate(x, y + 1);
  }

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    const inSafetyFrame =
      x < safetyFrame ||
      y < safetyFrame ||
      x >= width - safetyFrame ||
      y >= height - safetyFrame;

    if (!visited[pixelIndex] && !inSafetyFrame) continue;

    const offset = pixelIndex * channels;
    data[offset] = 255;
    data[offset + 1] = 255;
    data[offset + 2] = 255;
  }

  return sharp(data, { raw: { width, height, channels } })
    .webp({ quality, smartSubsample: true })
    .toBuffer();
}

