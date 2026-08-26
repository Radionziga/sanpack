'use client';

import { useMemo, useState } from 'react';
import { Languages, Sparkles } from 'lucide-react';
import { parseJsonResponse } from '@/lib/http/parseJsonResponse';
import { CustomSelect } from '@/components/ui/CustomSelect';

export type TranslationLanguage = 'ru' | 'uz' | 'en' | 'zh';

export interface TranslatableField {
  key: string;
  label: string;
  values: Record<TranslationLanguage, string>;
  onChange: (language: TranslationLanguage, value: string) => void;
}

const languageLabels: Record<TranslationLanguage, string> = {
  ru: 'Русский',
  uz: 'Узбекский',
  en: 'Английский',
  zh: 'Китайский',
};

interface TranslationResult {
  translations: Array<{ key: string; ru: string; uz: string; en: string; zh: string }>;
  model: string;
}

export function AiTranslateButton({ fields, compact = false }: { fields: TranslatableField[]; compact?: boolean }) {
  const [sourceLanguage, setSourceLanguage] = useState<TranslationLanguage>('ru');
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sourceLengths = useMemo(() => ({
    ru: fields.reduce((sum, field) => sum + field.values.ru.trim().length, 0),
    uz: fields.reduce((sum, field) => sum + field.values.uz.trim().length, 0),
    en: fields.reduce((sum, field) => sum + field.values.en.trim().length, 0),
    zh: fields.reduce((sum, field) => sum + field.values.zh.trim().length, 0),
  }), [fields]);

  function resolveSourceLanguage() {
    if (sourceLengths[sourceLanguage] > 0) return sourceLanguage;
    return (Object.entries(sourceLengths).sort((left, right) => right[1] - left[1])[0]?.[0] || sourceLanguage) as TranslationLanguage;
  }

  async function translate() {
    const resolvedSource = resolveSourceLanguage();
    const sourceFields = fields
      .map((field) => ({ key: field.key, label: field.label, value: field.values[resolvedSource].trim() }))
      .filter((field) => field.value);
    if (!sourceFields.length) {
      setError('Сначала заполните хотя бы одно поле на исходном языке.');
      setMessage(null);
      return;
    }

    setSourceLanguage(resolvedSource);
    setBusy(true); setError(null); setMessage(null);
    try {
      const response = await fetch('/api/admin/gemini/translate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sourceLanguage: resolvedSource, fields: sourceFields }),
      });
      const result = await parseJsonResponse<TranslationResult>(response, 'Не удалось получить переводы.');
      const byKey = new Map(result.translations.map((translation) => [translation.key, translation]));
      let applied = 0;
      for (const field of fields) {
        const translated = byKey.get(field.key);
        if (!translated) continue;
        for (const language of ['ru', 'uz', 'en', 'zh'] as const) {
          if (language === resolvedSource) continue;
          if (!overwrite && field.values[language].trim()) continue;
          field.onChange(language, translated[language]);
          applied += 1;
        }
      }
      setMessage(applied
        ? `Переводы заполнены: ${applied}. Проверьте текст перед сохранением.`
        : 'Все переводы уже заполнены. Включите замену, если хотите обновить их.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось получить переводы.');
    } finally { setBusy(false); }
  }

  return (
    <div className={`admin-panel-muted w-full ${compact ? 'max-w-xl p-3' : 'max-w-2xl p-3.5'}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <Languages className="mt-0.5 size-4 shrink-0 text-[var(--sp-brand)]" aria-hidden="true" />
          <div>
            <p className="text-xs font-bold text-[var(--sp-ink)]">Заполнить переводы</p>
            {!compact ? <p className="mt-0.5 text-[11px] leading-4 text-[var(--sp-ink-tertiary)]">Заполним пустые поля на других языках.</p> : null}
          </div>
        </div>
        <button type="button" onClick={() => void translate()} disabled={busy} className="admin-button-primary shrink-0 disabled:opacity-50">
          <Sparkles className="size-3.5" aria-hidden="true" />
          {busy ? 'Переводим…' : 'Заполнить'}
        </button>
      </div>

      <details className="mt-2.5 border-t border-[var(--sp-line)] pt-2.5">
        <summary className="w-fit cursor-pointer text-[11px] font-semibold text-[var(--sp-ink-secondary)] hover:text-[var(--sp-ink)]">
          Настройки перевода
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 sm:items-end">
          <CustomSelect
            label="Исходный язык"
            value={sourceLanguage}
            onChange={(value) => setSourceLanguage(value as TranslationLanguage)}
            options={(Object.keys(languageLabels) as TranslationLanguage[]).map((language) => ({ value: language, label: languageLabels[language] }))}
          />
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[11px] text-[var(--sp-ink-secondary)]">
            <input type="checkbox" checked={overwrite} onChange={(event) => setOverwrite(event.target.checked)} className="size-4 accent-[var(--sp-brand)]" />
            Заменять заполненные переводы
          </label>
        </div>
      </details>
      {error || message ? <p role={error ? 'alert' : 'status'} className={`mt-2 text-[11px] leading-4 ${error ? 'text-[var(--sp-danger)]' : 'text-[var(--sp-success)]'}`}>{error || message}</p> : null}
    </div>
  );
}
