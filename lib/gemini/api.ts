import 'server-only';

import { z } from 'zod';

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta';
const IMAGE_API_ROOT = 'https://generativelanguage.googleapis.com/v1';

const modelListSchema = z.object({
  models: z.array(z.object({
    name: z.string(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    supportedGenerationMethods: z.array(z.string()).optional(),
  }).passthrough()).default([]),
}).passthrough();

const generateResponseSchema = z.object({
  candidates: z.array(z.object({
    content: z.object({
      parts: z.array(z.object({ text: z.string().optional() }).passthrough()),
    }).passthrough(),
  }).passthrough()).min(1),
}).passthrough();

export interface GeminiModelOption {
  id: string;
  name: string;
  description: string;
}

const curatedImageModels: Record<string, Omit<GeminiModelOption, 'id'>> = {
  'gemini-3.1-flash-image': {
    name: 'Gemini 3.1 Flash Image',
    description: 'Рекомендуемая модель для товарных изображений и визуализаций.',
  },
  'gemini-3.1-flash-lite-image': {
    name: 'Gemini 3.1 Flash-Lite Image',
    description: 'Быстрая и экономичная генерация изображений в 1K.',
  },
  'gemini-3-pro-image': {
    name: 'Gemini 3 Pro Image',
    description: 'Более качественная модель для сложных визуальных задач.',
  },
  'gemini-2.5-flash-image': {
    name: 'Gemini 2.5 Flash Image',
    description: 'Предыдущее поколение модели генерации изображений.',
  },
};

export const geminiImageModelIds = Object.keys(curatedImageModels);

async function readGoogleResponse(response: Response) {
  const raw = await response.text();
  let body: unknown = null;
  try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
  if (!response.ok) {
    const parsed = z.object({ error: z.object({ message: z.string().optional() }).optional() }).safeParse(body);
    throw new Error(parsed.success && parsed.data.error?.message
      ? parsed.data.error.message
      : 'Gemini не принял запрос. Проверьте API-ключ и выбранную модель.');
  }
  return body;
}

export async function listGeminiTextModels(apiKey: string): Promise<GeminiModelOption[]> {
  const response = await fetch(`${API_ROOT}/models?pageSize=1000`, {
    headers: { 'x-goog-api-key': apiKey },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  const parsed = modelListSchema.safeParse(await readGoogleResponse(response));
  if (!parsed.success) throw new Error('Gemini вернул неполный список моделей.');

  return parsed.data.models
    .filter((model) => model.supportedGenerationMethods?.includes('generateContent'))
    .filter((model) => model.name.startsWith('models/gemini-'))
    .filter((model) => !/(image|live|tts|audio|embedding)/i.test(model.name))
    .map((model) => ({
      id: model.name.replace(/^models\//, ''),
      name: model.displayName || model.name.replace(/^models\//, ''),
      description: model.description || '',
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'en'));
}

export async function listGeminiImageModels(apiKey: string): Promise<GeminiModelOption[]> {
  const response = await fetch(`${API_ROOT}/models?pageSize=1000`, {
    headers: { 'x-goog-api-key': apiKey },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  const parsed = modelListSchema.safeParse(await readGoogleResponse(response));
  if (!parsed.success) throw new Error('Gemini вернул неполный список моделей.');

  const available = new Set(
    parsed.data.models
      .filter((model) => model.supportedGenerationMethods?.includes('generateContent'))
      .map((model) => model.name.replace(/^models\//, '')),
  );

  return geminiImageModelIds
    .filter((id) => available.has(id))
    .map((id) => ({ id, ...curatedImageModels[id] }));
}

const imageResponseSchema = z.object({
  candidates: z.array(z.object({
    content: z.object({
      parts: z.array(z.object({
        inlineData: z.object({
          mimeType: z.string(),
          data: z.string(),
        }).optional(),
      }).passthrough()),
    }).passthrough(),
  }).passthrough()).min(1),
}).passthrough();

export async function generateGeminiImage({
  apiKey,
  model,
  prompt,
}: {
  apiKey: string;
  model: string;
  prompt: string;
}) {
  const normalizedModel = model.replace(/^models\//, '');
  if (!geminiImageModelIds.includes(normalizedModel)) {
    throw new Error('Выбранная модель не поддерживает генерацию изображений.');
  }

  const response = await fetch(`${IMAGE_API_ROOT}/models/${encodeURIComponent(normalizedModel)}:generateContent`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: normalizedModel === 'gemini-2.5-flash-image'
          ? { aspectRatio: '1:1' }
          : { aspectRatio: '1:1', imageSize: '1K' },
      },
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(90_000),
  });
  const parsed = imageResponseSchema.safeParse(await readGoogleResponse(response));
  if (!parsed.success) throw new Error('Gemini не вернул готовое изображение.');
  const image = parsed.data.candidates
    .flatMap((candidate) => candidate.content.parts)
    .map((part) => part.inlineData)
    .find(Boolean);
  if (!image) throw new Error('Gemini не вернул изображение. Попробуйте сформулировать товар иначе.');
  return image;
}

export async function generateGeminiJson<T>({
  apiKey,
  model,
  prompt,
  schema,
  outputSchema,
}: {
  apiKey: string;
  model: string;
  prompt: string;
  schema: Record<string, unknown>;
  outputSchema: z.ZodType<T>;
}): Promise<T> {
  const normalizedModel = model.replace(/^models\//, '');
  const response = await fetch(`${API_ROOT}/models/${encodeURIComponent(normalizedModel)}:generateContent`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8_192,
        responseMimeType: 'application/json',
        responseJsonSchema: schema,
      },
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  });
  const parsedResponse = generateResponseSchema.safeParse(await readGoogleResponse(response));
  if (!parsedResponse.success) throw new Error('Gemini не вернул готовый перевод.');
  const text = parsedResponse.data.candidates[0].content.parts.map((part) => part.text || '').join('').trim();
  let json: unknown;
  try { json = JSON.parse(text); } catch { throw new Error('Gemini вернул перевод в неверном формате.'); }
  const parsedOutput = outputSchema.safeParse(json);
  if (!parsedOutput.success) throw new Error('Gemini вернул неполный перевод.');
  return parsedOutput.data;
}
