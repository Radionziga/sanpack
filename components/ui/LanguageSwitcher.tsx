'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/context/LanguageContext';
import type { Language } from '@/types';

const languages: Array<{ value: Language; label: string; flag: ReactNode }> = [
  {
    value: 'ru',
    label: 'Русский',
    flag: (
      <svg viewBox="0 0 24 16" aria-hidden="true" className="h-4 w-6 overflow-hidden rounded-[2px] shadow-[0_0_0_1px_rgb(21_27_24/12%)]">
        <path fill="#fff" d="M0 0h24v16H0z" />
        <path fill="#1C57A7" d="M0 5.33h24v5.34H0z" />
        <path fill="#D52B1E" d="M0 10.67h24V16H0z" />
      </svg>
    ),
  },
  {
    value: 'uz',
    label: 'O‘zbekcha',
    flag: (
      <svg viewBox="0 0 24 16" aria-hidden="true" className="h-4 w-6 overflow-hidden rounded-[2px] shadow-[0_0_0_1px_rgb(21_27_24/12%)]">
        <path fill="#1EB4E8" d="M0 0h24v4.8H0z" />
        <path fill="#CE1126" d="M0 4.8h24v.8H0zM0 10.4h24v.8H0z" />
        <path fill="#fff" d="M0 5.6h24v4.8H0z" />
        <path fill="#1EB53A" d="M0 11.2h24V16H0z" />
        <circle cx="3.25" cy="2.35" r="1.45" fill="#fff" />
        <circle cx="3.85" cy="2.35" r="1.22" fill="#1EB4E8" />
        <g fill="#fff">
          <circle cx="6.1" cy="1.15" r=".22" /><circle cx="7.15" cy="1.15" r=".22" /><circle cx="8.2" cy="1.15" r=".22" />
          <circle cx="5.55" cy="2.05" r=".22" /><circle cx="6.6" cy="2.05" r=".22" /><circle cx="7.65" cy="2.05" r=".22" /><circle cx="8.7" cy="2.05" r=".22" />
          <circle cx="5.55" cy="2.95" r=".22" /><circle cx="6.6" cy="2.95" r=".22" /><circle cx="7.65" cy="2.95" r=".22" /><circle cx="8.7" cy="2.95" r=".22" />
        </g>
      </svg>
    ),
  },
  {
    value: 'en',
    label: 'English',
    flag: (
      <svg viewBox="0 0 24 16" aria-hidden="true" className="h-4 w-6 overflow-hidden rounded-[2px] shadow-[0_0_0_1px_rgb(21_27_24/12%)]">
        <path fill="#21468B" d="M0 0h24v16H0z" />
        <path stroke="#fff" strokeWidth="3.2" d="m0 0 24 16M24 0 0 16" />
        <path stroke="#CF142B" strokeWidth="1.45" d="m0 0 24 16M24 0 0 16" />
        <path fill="#fff" d="M9.5 0h5v16h-5zM0 5.5h24v5H0z" />
        <path fill="#CF142B" d="M10.5 0h3v16h-3zM0 6.5h24v3H0z" />
      </svg>
    ),
  },
];

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = languages.find((item) => item.value === language) ?? languages[0];

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={`Выбрать язык. Сейчас: ${active.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 items-center gap-1.5 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface)] px-2.5 text-[var(--sp-ink-secondary)] transition-colors hover:border-[var(--sp-brand)] hover:bg-[var(--sp-surface-inset)] hover:text-[var(--sp-brand)]"
      >
        {active.flag}
        <ChevronDownIcon className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Язык сайта"
          className="absolute right-0 top-full z-50 mt-2 min-w-48 rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface-raised)] p-1.5 shadow-[var(--sp-shadow-raised)]"
        >
          {languages.map((item) => {
            const selected = item.value === language;
            return (
              <button
                key={item.value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setOpen(false);
                  if (!selected) setLanguage(item.value);
                }}
                className={`flex min-h-10 w-full items-center gap-2.5 rounded-[var(--sp-radius-control-inner)] px-3 text-left text-sm transition-colors ${selected ? 'bg-[var(--sp-brand-soft)] font-semibold text-[var(--sp-brand)]' : 'font-medium text-[var(--sp-ink-secondary)] hover:bg-[var(--sp-surface-inset)] hover:text-[var(--sp-ink)]'}`}
              >
                {item.flag}
                <span className="flex-1">{item.label}</span>
                {selected ? <CheckIcon className="size-4" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
