import 'server-only';

import { z } from 'zod';
import { generateGeminiJson } from '@/lib/gemini/api';

export const languageSchema = z.enum(['ru', 'uz', 'en']);

export const translationRequestSchema = z.object({
  sourceLanguage: languageSchema,
  fields: z.array(z.object({
    key: z.string().trim().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),
    label: z.string().trim().min(1).max(100),
    value: z.string().trim().min(1).max(5_000),
  }).strict()).min(1).max(20),
}).strict().superRefine((request, context) => {
  const totalCharacters = request.fields.reduce((sum, field) => sum + field.value.length, 0);
  if (totalCharacters > 20_000) {
    context.addIssue({
      code: 'custom',
      path: ['fields'],
      message: 'За один раз можно перевести до 20 000 символов.',
    });
  }
});

const translatedFieldSchema = z.object({
  key: z.string(),
  ru: z.string(),
  uz: z.string(),
  en: z.string(),
}).strict();

const translationOutputSchema = z.object({
  translations: z.array(translatedFieldSchema).min(1).max(20),
}).strict();

const translationJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    translations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          key: { type: 'string' },
          ru: { type: 'string' },
          uz: { type: 'string' },
          en: { type: 'string' },
        },
        required: ['key', 'ru', 'uz', 'en'],
      },
    },
  },
  required: ['translations'],
} satisfies Record<string, unknown>;

export async function translateCommerceFields({
  apiKey,
  model,
  sourceLanguage,
  fields,
}: {
  apiKey: string;
  model: string;
  sourceLanguage: z.infer<typeof languageSchema>;
  fields: z.infer<typeof translationRequestSchema>['fields'];
}) {
  const languageName = { ru: 'Russian', uz: 'Uzbek (Latin script)', en: 'English' }[sourceLanguage];
  const payload = JSON.stringify(fields.map(({ key, label, value }) => ({ key, label, value })));
  const prompt = [
    'You translate user-facing ecommerce content for a professional online store.',
    `The source language is ${languageName}. Translate every field into Russian, Uzbek in Latin script, and English.`,
    'Preserve brand names, product codes, model names, numbers, units, punctuation, URLs and factual meaning.',
    'Do not invent specifications, benefits, claims, prices or details absent from the source.',
    'Keep concise UI labels concise. Keep each output in the same plain-text format as the input.',
    'For the source language, copy the source value without rewriting it.',
    `Fields: ${payload}`,
  ].join('\n');

  const result = await generateGeminiJson({
    apiKey,
    model,
    prompt,
    schema: translationJsonSchema,
    outputSchema: translationOutputSchema,
  });

  const requestedKeys = new Set(fields.map((field) => field.key));
  const unique = new Map(result.translations.map((field) => [field.key, field]));
  if (unique.size !== requestedKeys.size || [...requestedKeys].some((key) => !unique.has(key))) {
    throw new Error('Gemini перевёл не все поля. Попробуйте ещё раз.');
  }
  return [...requestedKeys].map((key) => unique.get(key)!);
}
