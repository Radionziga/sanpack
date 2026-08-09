import 'server-only';

import { z } from 'zod';

const imageResponseSchema = z.object({
  candidates: z.array(z.object({
    content: z.object({
      parts: z.array(z.object({
        inlineData: z.object({
          mimeType: z.string(),
          data: z.string(),
        }).optional(),
      }).passthrough()),
    }),
  }).passthrough()).min(1),
}).passthrough();

export async function generateBagMockup({
  apiKey,
  model,
  technicalPreview,
  prompt,
}: {
  apiKey: string;
  model: string;
  technicalPreview: { mimeType: string; data: string };
  prompt: string;
}) {
  const normalizedModel = model.replace(/^models\//, '');
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(normalizedModel)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: technicalPreview },
          ],
        }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: { aspectRatio: '4:5', imageSize: '1K' },
        },
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(90_000),
    }
  );

  const raw = await response.text();
  let body: unknown;
  try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
  if (!response.ok) {
    const message = z.object({ error: z.object({ message: z.string().optional() }).optional() }).safeParse(body);
    throw new Error(message.success && message.data.error?.message
      ? message.data.error.message
      : 'Gemini не смог создать визуализацию.');
  }

  const parsed = imageResponseSchema.safeParse(body);
  if (!parsed.success) throw new Error('Gemini вернул неполный результат визуализации.');
  const image = parsed.data.candidates
    .flatMap((candidate) => candidate.content.parts)
    .map((part) => part.inlineData)
    .find(Boolean);
  if (!image) throw new Error('Gemini не вернул изображение.');
  return image;
}
