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
  values: { ru?: string; uz?: string; en?: string; zh?: string },
): LocalizedTextResult {
  const ru = clean(values.ru);
  const uz = clean(values.uz);
  const en = clean(values.en);
  const zh = clean(values.zh);
  const requested = requestedLanguage === 'ru'
    ? ru
    : requestedLanguage === 'uz'
      ? uz
      : requestedLanguage === 'zh'
        ? zh
        : en;

  // A Russian value copied verbatim into another locale field is not a real
  // translation. Treat it as a fallback so the UI and admin diagnostics can
  // still distinguish translated content from inherited Russian content.
  if (requested && (requestedLanguage === 'ru' || requested !== ru)) {
    return {
      text: requested,
      requestedLanguage,
      sourceLanguage: requestedLanguage,
      isFallback: false,
    };
  }

  const fallbacks: Array<[Language, string | undefined]> = requestedLanguage === 'zh'
    ? [['en', en], ['ru', ru], ['uz', uz]]
    : [['ru', ru], ['uz', uz], ['en', en], ['zh', zh]];
  const [sourceLanguage, text] = fallbacks.find(([, value]) => value) || [requestedLanguage, ''];
  return {
    text: text || '',
    requestedLanguage,
    sourceLanguage,
    isFallback: sourceLanguage !== requestedLanguage,
  };
}
