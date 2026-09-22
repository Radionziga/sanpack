'use client';

import { useState } from 'react';
import { CheckCircle2, CircleAlert, RotateCcw } from 'lucide-react';
import type { Language } from '@/types';
import type { EffectiveSeo } from '@/lib/seo/policy';

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

function removeLocaleOverrides(value: SeoFields | undefined, titleKey: keyof SeoFields, descriptionKey: keyof SeoFields) {
  const next = { ...(value || {}) };
  delete next[titleKey];
  delete next[descriptionKey];
  return next;
}

export function SeoFieldsEditor({
  value,
  onChange,
  automaticValues,
  effectiveValues,
}: {
  value?: SeoFields;
  onChange: (value: SeoFields) => void;
  automaticValues: Record<Language, EffectiveSeo>;
  effectiveValues: Record<Language, EffectiveSeo>;
}) {
  const [locale, setLocale] = useState<Language>('ru');
  const current = locales.find((candidate) => candidate.value === locale)!;
  const titleKey = `title${current.suffix}` as keyof SeoFields;
  const descriptionKey = `description${current.suffix}` as keyof SeoFields;
  const explicitTitle = value?.[titleKey] || '';
  const explicitDescription = value?.[descriptionKey] || '';
  const automatic = automaticValues[locale];
  const effective = effectiveValues[locale];
  const hasLocaleOverride = Boolean(explicitTitle.trim() || explicitDescription.trim());
  const isReady = effective.issues.length === 0;

  return (
    <div className="space-y-5">
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

      <div className="rounded-[var(--sp-radius-card)] border border-[color-mix(in_srgb,var(--sp-brand)_24%,var(--sp-line))] bg-[color-mix(in_srgb,var(--sp-brand)_6%,var(--sp-surface))] p-4 md:p-5">
        <div className="flex items-start gap-3">
          {isReady
            ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[var(--sp-brand)]" aria-hidden="true" />
            : <CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden="true" />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[var(--sp-ink)]">{isReady ? 'SEO готово' : 'SEO нужно проверить'}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--sp-ink-secondary)]">
              {effective.indexable
                ? 'Страница индексируется. Все основные значения сформированы автоматически.'
                : 'Метаданные уже подготовлены; индексация включится после публикации и появления в видимой категории.'}
            </p>
            {!isReady ? <ul className="mt-2 space-y-1 text-xs text-amber-800">{effective.issues.map((issue) => <li key={issue}>• {issue}</li>)}</ul> : null}
          </div>
        </div>

        <dl className="mt-4 grid min-w-0 gap-3 border-t border-[color-mix(in_srgb,var(--sp-brand)_18%,var(--sp-line))] pt-4 text-xs">
          <div className="min-w-0"><dt className="font-bold text-[var(--sp-ink-tertiary)]">Автоматический title</dt><dd className="mt-1 break-words leading-5 text-[var(--sp-ink)]">{automatic.title}</dd></div>
          <div className="min-w-0"><dt className="font-bold text-[var(--sp-ink-tertiary)]">Автоматическое описание</dt><dd className="mt-1 break-words leading-5 text-[var(--sp-ink-secondary)]">{automatic.description}</dd></div>
          <div className="min-w-0"><dt className="font-bold text-[var(--sp-ink-tertiary)]">Canonical</dt><dd className="mt-1 break-all text-emerald-800">{automatic.absoluteCanonical}</dd></div>
          <div className="min-w-0"><dt className="font-bold text-[var(--sp-ink-tertiary)]">OG image</dt><dd className="mt-1 break-all text-[var(--sp-ink-secondary)]">{automatic.image || 'Изображение не найдено'}</dd></div>
        </dl>
      </div>

      <div className="space-y-4 border-t border-[var(--sp-line)] pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h5 className="text-sm font-bold text-[var(--sp-ink)]">Переопределить вручную</h5>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--sp-ink-secondary)]">Необязательно. Заполняйте только если автоматическое значение действительно нужно заменить.</p>
          </div>
          {hasLocaleOverride ? (
            <button
              type="button"
              onClick={() => onChange(removeLocaleOverrides(value, titleKey, descriptionKey))}
              className="admin-button-secondary min-h-9 px-3 text-xs"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Использовать автоматическое значение
            </button>
          ) : null}
        </div>

        <label className="admin-field-label block">
          SEO title {current.label}
          <input
            value={explicitTitle}
            onChange={(event) => onChange({ ...value, [titleKey]: event.target.value })}
            placeholder={automatic.title}
            className="admin-control mt-1.5 font-normal"
          />
          <span className="mt-1 block text-[10px] font-normal text-[var(--sp-ink-tertiary)]">
            {(explicitTitle.trim() || automatic.title).length} символов · {explicitTitle.trim() ? 'ручное значение' : 'автоматическое значение'}
          </span>
        </label>

        <label className="admin-field-label block">
          Meta description {current.label}
          <textarea
            rows={3}
            value={explicitDescription}
            onChange={(event) => onChange({ ...value, [descriptionKey]: event.target.value })}
            placeholder={automatic.description}
            className="admin-control mt-1.5 font-normal"
          />
          <span className="mt-1 block text-[10px] font-normal text-[var(--sp-ink-tertiary)]">
            {(explicitDescription.trim() || automatic.description).length} символов · длина является подсказкой, а не блокирующим правилом
          </span>
        </label>
      </div>

      <div className="admin-panel-muted space-y-2 p-4" aria-label="Предпросмотр поискового результата">
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--sp-ink-tertiary)]">Фактический предпросмотр</span>
        <p className="break-all text-[11px] text-emerald-700">{effective.absoluteCanonical}</p>
        <p className="break-words text-lg font-semibold leading-6 text-blue-700">{effective.title}</p>
        <p className="line-clamp-2 text-xs leading-5 text-[var(--sp-ink-secondary)]">{effective.description}</p>
      </div>
    </div>
  );
}
