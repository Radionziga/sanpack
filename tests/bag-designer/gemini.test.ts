import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateBagMockup } from '@/lib/bag-designer/gemini';

describe('bag designer Gemini integration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the supported Gemini image request and returns inline image data', async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'aW1hZ2U=' } }] } }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(generateBagMockup({
      apiKey: 'test-key',
      model: 'models/gemini-3.1-flash-image',
      technicalPreview: { mimeType: 'image/png', data: 'cHJldmlldw==' },
      prompt: 'Create a branded bag mockup.',
    })).resolves.toEqual({ mimeType: 'image/png', data: 'aW1hZ2U=' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/v1/models/gemini-3.1-flash-image:generateContent');
    expect(init?.headers).toMatchObject({ 'x-goog-api-key': 'test-key' });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      generationConfig: {
        responseModalities: ['IMAGE'],
        responseFormat: { image: { aspectRatio: '4:5', imageSize: '1K' } },
      },
    });
  });

  it('surfaces the API error without logging the key or request payload', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      error: { message: 'Requested model is unavailable.' },
    }), { status: 404, headers: { 'content-type': 'application/json' } })));

    await expect(generateBagMockup({
      apiKey: 'secret-key',
      model: 'gemini-3.1-flash-image',
      technicalPreview: { mimeType: 'image/png', data: 'cHJldmlldw==' },
      prompt: 'Create a branded bag mockup.',
    })).rejects.toThrow('Requested model is unavailable.');
  });
});
