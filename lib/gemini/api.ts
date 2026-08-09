import 'server-only';

import { z } from 'zod';

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta';

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
