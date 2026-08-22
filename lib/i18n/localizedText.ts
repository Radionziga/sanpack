import type { Language } from '@/types';

export interface LocalizedTextResult {
  text: string;
  requestedLanguage: Language;
  sourceLanguage: Language;
  isFallback: boolean;
}

function clean(value?: string) {
  const text = value?.trim();
  return text || undefined;
}

export function resolveLocalizedText(
  requestedLanguage: Language,
  values: { ru?: string; uz?: string; en?: string },
): LocalizedTextResult {
  const ru = clean(values.ru);
  const uz = clean(values.uz);
  const en = clean(values.en);
  const requested = requestedLanguage === 'ru' ? ru : requestedLanguage === 'uz' ? uz : en;

  if (requested && (requestedLanguage === 'ru' || requested !== ru)) {
    return {
      text: requested,
      requestedLanguage,
      sourceLanguage: requestedLanguage,
      isFallback: false,
    };
  }

  const fallbacks: Array<[Language, string | undefined]> = [
    ['ru', ru],
    ['uz', uz],
    ['en', en],
  ];
  const [sourceLanguage, text] = fallbacks.find(([, value]) => value) || [requestedLanguage, ''];
  return {
    text: text || '',
    requestedLanguage,
    sourceLanguage,
    isFallback: sourceLanguage !== requestedLanguage,
  };
}
