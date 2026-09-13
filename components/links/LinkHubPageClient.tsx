'use client';

import { useState } from 'react';
import {
  ArrowUpRight,
  ExternalLink,
  Instagram,
  LayoutGrid,
  MapPin,
  PackageSearch,
  Phone,
  Send,
  Share2,
  Truck,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useLanguage } from '@/context/LanguageContext';
import { enabledLinkHubLinks, getLinkHubText, isInternalLinkHubHref } from '@/lib/settings/linkHub';
import type { LinkHubIcon, LinkHubSettings, SiteSettings } from '@/types';

const icons: Record<LinkHubIcon, typeof LayoutGrid> = {
  catalog: LayoutGrid,
  telegram: Send,
  instagram: Instagram,
  phone: Phone,
  location: MapPin,
  delivery: Truck,
  bag: PackageSearch,
  website: ExternalLink,
};

const shareCopy = {
  ru: { share: 'Поделиться', copied: 'Ссылка скопирована' },
  uz: { share: 'Ulashish', copied: 'Havola nusxalandi' },
  en: { share: 'Share', copied: 'Link copied' },
  zh: { share: '分享', copied: '链接已复制' },
} as const;

export function LinkHubPageClient({ settings, linkHub }: { settings: SiteSettings; linkHub: LinkHubSettings }) {
  const { language } = useLanguage();
  const [shareStatus, setShareStatus] = useState('');
  const copy = shareCopy[language];
  const title = getLinkHubText(language, linkHub, 'title') || settings.company.name;
  const description = getLinkHubText(language, linkHub, 'description');
  const highlightTitle = getLinkHubText(language, linkHub, 'highlightTitle');
  const highlightDescription = getLinkHubText(language, linkHub, 'highlightDescription');
  const city = getLinkHubText(language, {
    ...linkHub,
    titleRu: settings.contacts.cityRu,
    titleUz: settings.contacts.cityUz,
    titleEn: settings.contacts.cityEn,
    titleZh: settings.contacts.cityZh,
  }, 'title');

  async function share() {
    setShareStatus('');
    try {
      if (navigator.share) {
        await navigator.share({ title, text: description, url: window.location.href });
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus(copy.copied);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareStatus('');
    }
  }

  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[var(--sp-canvas)] px-[max(1rem,env(safe-area-inset-left))] pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-[var(--sp-ink)]">
      <div className="mx-auto w-full max-w-[34rem]">
        <header className="flex min-h-11 items-center justify-between gap-3">
          <LanguageSwitcher menuAlign="start" />
          <div className="flex items-center gap-2">
            <span className="sr-only" role="status" aria-live="polite">{shareStatus}</span>
            <button
              type="button"
              onClick={() => void share()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--sp-line)] bg-[var(--sp-surface)] px-4 text-sm font-semibold text-[var(--sp-ink-secondary)] shadow-sm transition-[border-color,color,transform] hover:border-[var(--sp-brand)] hover:text-[var(--sp-brand)] active:scale-[0.98] motion-reduce:active:scale-100"
            >
              <Share2 className="size-4" aria-hidden="true" />
              <span>{shareStatus || copy.share}</span>
            </button>
          </div>
        </header>

        <section className="pb-6 pt-8 text-center sm:pt-10">
          <div className="mx-auto grid size-[5.5rem] place-items-center overflow-hidden rounded-[1.75rem] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-4 shadow-[0_14px_40px_rgb(15_61_41/10%)]">
            <BrandLogo src={settings.company.logo} srcDark={settings.company.logoDark} label={settings.company.name} className="max-h-12 max-w-full" />
          </div>
          <h1 className="mt-5 text-balance font-extended text-[clamp(1.75rem,7vw,2.5rem)] font-bold leading-[1.08] tracking-[-0.035em]">{title}</h1>
          {description ? <p className="mx-auto mt-3 max-w-md text-pretty text-sm leading-6 text-[var(--sp-ink-secondary)] sm:text-base sm:leading-7">{description}</p> : null}
        </section>

        {linkHub.highlightEnabled && (highlightTitle || highlightDescription) ? (
          <section className="mb-3 rounded-[var(--sp-radius-card)] border border-[color-mix(in_srgb,var(--sp-brand)_16%,var(--sp-line))] bg-[var(--sp-brand-soft)] p-5 text-left">
            {highlightTitle ? <h2 className="font-extended text-base font-bold text-[var(--sp-brand-deep)]">{highlightTitle}</h2> : null}
            {highlightDescription ? <p className="mt-1.5 text-sm leading-6 text-[var(--sp-ink-secondary)]">{highlightDescription}</p> : null}
          </section>
        ) : null}

        <nav aria-label={title} className="grid gap-3">
          {enabledLinkHubLinks(linkHub).map((item) => {
            const Icon = icons[item.icon] || ExternalLink;
            const label = getLinkHubText(language, item, 'label') || item.labelRu;
            const className = 'group grid min-h-16 grid-cols-[2.75rem_minmax(0,1fr)_1.25rem] items-center gap-3 rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] px-3 py-2.5 text-left text-sm font-semibold text-[var(--sp-ink)] shadow-[0_5px_20px_rgb(21_27_24/5%)] transition-[border-color,box-shadow,transform] hover:border-[color-mix(in_srgb,var(--sp-brand)_45%,var(--sp-line))] hover:shadow-[0_10px_28px_rgb(15_61_41/10%)] active:scale-[0.99] motion-reduce:active:scale-100';
            const content = <><span className="grid size-11 place-items-center rounded-[var(--sp-radius-control)] bg-[var(--sp-brand-soft)] text-[var(--sp-brand)]"><Icon className="size-5" aria-hidden="true" /></span><span className="min-w-0 break-words leading-5">{label}</span><ArrowUpRight className="size-4 text-[var(--sp-ink-muted)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" /></>;
            return isInternalLinkHubHref(item.href) ? (
              <Link key={item.id} href={item.href} className={className}>{content}</Link>
            ) : (
              <a key={item.id} href={item.href} className={className} target={/^https:/i.test(item.href) ? '_blank' : undefined} rel={/^https:/i.test(item.href) ? 'noreferrer' : undefined}>{content}</a>
            );
          })}
        </nav>

        <footer className="pt-8 text-center text-xs leading-5 text-[var(--sp-ink-muted)]">
          <p>{settings.company.name}{city ? ` · ${city}` : ''}</p>
        </footer>
      </div>
    </main>
  );
}
