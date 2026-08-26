'use client';

import { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import type { Language } from '@/types';

interface DeliveryDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  language: Language;
  label: string;
  error?: string;
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DeliveryDatePicker({ value, onChange, language, label, error }: DeliveryDatePickerProps) {
  const locale = language === 'uz' ? 'uz-UZ' : language === 'en' ? 'en-US' : language === 'zh' ? 'zh-CN' : 'ru-RU';
  const dates = useMemo(() => Array.from({ length: 10 }, (_, index) => {
    const next = new Date();
    next.setHours(12, 0, 0, 0);
    next.setDate(next.getDate() + index + 1);
    return next;
  }), []);
  const weekday = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short' }), [locale]);
  const month = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'short' }), [locale]);

  return (
    <fieldset className="min-w-0" aria-invalid={error ? true : undefined}>
      <legend className="flex items-center gap-2 text-xs font-medium">
        <CalendarDays className="size-4 text-[var(--sp-brand)]" aria-hidden="true" />
        {label}
      </legend>
      <input type="hidden" name="deliveryDate" value={value} />
      <div className="no-scrollbar -mx-1 mt-2 flex max-w-full snap-x gap-2 overflow-x-auto px-1 pb-1">
        {dates.map((date) => {
          const key = dateKey(date);
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              aria-pressed={selected}
              className={`flex min-h-[4.75rem] w-[4.5rem] shrink-0 snap-start flex-col items-center justify-center rounded-[var(--sp-radius-control)] border px-2 text-center transition-[border-color,background-color,color,transform] active:scale-[0.96] motion-reduce:active:scale-100 ${
                selected
                  ? 'border-[var(--sp-brand)] bg-[var(--sp-brand-soft)] text-[var(--sp-brand-deep)] shadow-[0_0_0_1px_var(--sp-brand)]'
                  : 'border-[var(--sp-line-strong)] bg-[var(--sp-control)] text-[var(--sp-ink-secondary)] hover:border-[var(--sp-brand)]'
              }`}
            >
              <span className="text-[11px] font-semibold capitalize">{weekday.format(date)}</span>
              <span className="mt-0.5 text-xl font-extrabold leading-none tabular-nums text-[var(--sp-ink)]">{date.getDate()}</span>
              <span className="mt-1 text-[10px] font-medium capitalize">{month.format(date)}</span>
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-1.5 text-xs leading-5 text-[var(--sp-danger)]">{error}</p> : null}
    </fieldset>
  );
}
