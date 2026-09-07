'use client';

import { useState } from 'react';
import type { Language } from '@/types';

type SeoFields = Partial<Record<
  'titleRu' | 'titleUz' | 'titleEn' | 'titleZh' |
  'descriptionRu' | 'descriptionUz' | 'descriptionEn' | 'descriptionZh',
  string
>>;

const locales: Array<{ value: Language; label: string; suffix: 'Ru' | 'Uz' | 'En' | 'Zh' }> = [
  { value: 'ru', label: 'RU', suffix: 'Ru' },
  { value: 'uz', label: 'UZ', suffix: 'Uz' },
  { value: 'en', label: 'EN', suffix: 'En' },
  { value: 'zh', label: 'ZH', suffix: 'Zh' },
];

export function SeoFieldsEditor({
  value,
  onChange,
  fallbackTitles,
  fallbackDescriptions,
  canonicalPath,
}: {
  value?: SeoFields;
  onChange: (value: SeoFields) => void;
  fallbackTitles: Partial<Record<Language, string>>;
  fallbackDescriptions: Partial<Record<Language, string>>;
  canonicalPath: string;
}) {
  const [locale, setLocale] = useState<Language>('ru');
  const current = locales.find((candidate) => candidate.value === locale)!;
  const titleKey = `title${current.suffix}` as keyof SeoFields;
  const descriptionKey = `description${current.suffix}` as keyof SeoFields;
  const explicitTitle = value?.[titleKey] || '';
  const explicitDescription = value?.[descriptionKey] || '';
  const previewTitle = explicitTitle.trim() || fallbackTitles[locale]?.trim() || fallbackTitles.ru || '';
  const previewDescription = explicitDescription.trim() || fallbackDescriptions[locale]?.trim() || fallbackDescriptions.ru || '';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const canonical = new URL(`/${locale}${canonicalPath}`, baseUrl).toString();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Язык SEO-полей">
        {locales.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={locale === item.value}
            onClick={() => setLocale(item.value)}
            className={locale === item.value ? 'admin-button-primary min-h-9 px-3 text-xs' : 'admin-button-secondary min-h-9 px-3 text-xs'}
          >
            {item.label}
          </button>
        ))}
      </div>

      <label className="admin-field-label block">
        SEO title {current.label}
        <input
          value={explicitTitle}
          onChange={(event) => onChange({ ...value, [titleKey]: event.target.value })}
          placeholder={previewTitle}
          className="admin-control mt-1.5 font-normal"
        />
        <span className="mt-1 block text-[10px] font-normal text-[var(--sp-ink-tertiary)]">
          {explicitTitle.length || previewTitle.length} символов · пустое поле использует автоматически сформированный title
        </span>
      </label>

      <label className="admin-field-label block">
        Meta description {current.label}
        <textarea
          rows={3}
          value={explicitDescription}
          onChange={(event) => onChange({ ...value, [descriptionKey]: event.target.value })}
          placeholder={previewDescription}
          className="admin-control mt-1.5 font-normal"
        />
        <span className="mt-1 block text-[10px] font-normal text-[var(--sp-ink-tertiary)]">
          {explicitDescription.length || previewDescription.length} символов · длина является подсказкой, а не блокирующим правилом
        </span>
      </label>

      <div className="admin-panel-muted space-y-2 p-4" aria-label="Предпросмотр поискового результата">
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--sp-ink-tertiary)]">Приблизительный предпросмотр</span>
        <p className="truncate text-[11px] text-emerald-700">{canonical}</p>
        <p className="text-lg font-semibold leading-6 text-blue-700">{previewTitle || 'Название страницы'}</p>
        <p className="line-clamp-2 text-xs leading-5 text-[var(--sp-ink-secondary)]">{previewDescription || 'Описание будет взято из содержимого страницы или настроек сайта.'}</p>
      </div>
    </div>
  );
}
