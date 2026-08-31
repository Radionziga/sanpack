'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Phone, Send, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { contactPhoneHref } from '@/lib/settings/contacts';

const contactCopy = {
  ru: { open: 'Связаться', close: 'Закрыть контакты', title: (name: string) => `Связаться с ${name}`, phone: 'Позвонить' },
  uz: { open: 'Bog‘lanish', close: 'Kontaktlarni yopish', title: (name: string) => `${name} bilan bog‘lanish`, phone: 'Qo‘ng‘iroq qilish' },
  en: { open: 'Contact us', close: 'Close contacts', title: (name: string) => `Contact ${name}`, phone: 'Call us' },
  zh: { open: '联系我们', close: '关闭联系方式', title: (name: string) => `联系 ${name}`, phone: '拨打电话' },
} as const;

export function FloatingContactMenu() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const { company, contacts } = useSiteSettings();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const copy = contactCopy[language];
  const title = copy.title(company.name);
  const phones = [contacts.phone1, contacts.phone2].filter(Boolean);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  if (pathname.includes('/catalog/print')) return null;
  if (phones.length === 0 && !contacts.telegram && !contacts.whatsapp) return null;

  return (
    <div
      ref={panelRef}
      className="fixed bottom-[calc(var(--sp-mobile-nav-height)+env(safe-area-inset-bottom)+1rem)] right-4 z-50 md:bottom-6 md:right-6"
    >
      {open ? (
        <div role="dialog" aria-label={title} className="mb-3 w-[min(19rem,calc(100vw-2rem))] rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-3 shadow-[0_20px_60px_rgb(21_27_24/22%)]">
          <div className="flex items-center justify-between gap-3 px-1 pb-2">
            <strong className="text-sm text-[var(--sp-ink)]">{title}</strong>
            <button type="button" onClick={() => setOpen(false)} aria-label={copy.close} className="grid size-10 place-items-center rounded-[var(--sp-radius-control-inner)] text-[var(--sp-ink-muted)] hover:bg-[var(--sp-surface-inset)]">
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="grid gap-2">
            {phones.map((phone) => (
              <a key={phone} href={contactPhoneHref(phone)} className="flex min-h-11 items-center gap-3 rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)] px-3 text-xs font-semibold text-[var(--sp-ink)] hover:text-[var(--sp-brand)]">
                <Phone className="size-4 text-[var(--sp-brand)]" aria-hidden="true" />
                <span className="min-w-0 flex-1">{copy.phone}</span>
                <span className="tabular-nums text-[var(--sp-ink-secondary)]">{phone}</span>
              </a>
            ))}
            {contacts.telegram ? <a href={contacts.telegram} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-3 rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)] px-3 text-xs font-semibold text-[var(--sp-ink)] hover:text-[var(--sp-brand)]"><Send className="size-4 text-[var(--sp-brand)]" aria-hidden="true" />Telegram</a> : null}
            {contacts.whatsapp ? <a href={contacts.whatsapp} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-3 rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)] px-3 text-xs font-semibold text-[var(--sp-ink)] hover:text-[var(--sp-brand)]"><MessageCircle className="size-4 text-[var(--sp-brand)]" aria-hidden="true" />WhatsApp</a> : null}
          </div>
        </div>
      ) : null}

      <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-label={open ? copy.close : copy.open} className="ml-auto flex size-12 items-center justify-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] text-sm font-bold text-[var(--sp-on-brand)] shadow-[0_14px_36px_rgb(12_83_55/30%)] transition-[background-color,transform] hover:bg-[var(--sp-brand-deep)] active:scale-[0.96] motion-reduce:active:scale-100 sm:w-auto sm:px-4">
        {open ? <X className="size-5" aria-hidden="true" /> : <MessageCircle className="size-5" aria-hidden="true" />}
        <span className="hidden sm:inline">{open ? copy.close : copy.open}</span>
      </button>
    </div>
  );
}
