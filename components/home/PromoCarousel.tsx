'use client';

import { useEffect, useRef, useState } from 'react';
import { getImageProps } from 'next/image';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Banner, Language } from '@/types';
import { Link } from '@/i18n/navigation';

const labels = {
  ru: {
    region: 'Промо-предложения SANPACK',
    previous: 'Предыдущий баннер',
    next: 'Следующий баннер',
    slide: 'Показать баннер',
  },
  uz: {
    region: 'SANPACK promo takliflari',
    previous: 'Oldingi banner',
    next: 'Keyingi banner',
    slide: 'Bannerni ko‘rsatish',
  },
  en: {
    region: 'SANPACK promotions',
    previous: 'Previous banner',
    next: 'Next banner',
    slide: 'Show banner',
  },
} satisfies Record<Language, Record<string, string>>;

function localizedTitle(banner: Banner, locale: Language) {
  if (locale === 'uz') return banner.titleUz || banner.titleRu || '';
  if (locale === 'en') return banner.titleEn || banner.titleRu || '';
  return banner.titleRu || '';
}

function localizedSubtitle(banner: Banner, locale: Language) {
  if (locale === 'uz') return banner.subtitleUz || banner.subtitleRu || '';
  if (locale === 'en') return banner.subtitleEn || banner.subtitleRu || '';
  return banner.subtitleRu || '';
}

function localizedButtonText(banner: Banner, locale: Language) {
  if (locale === 'uz') return banner.buttonTextUz || banner.buttonTextRu || '';
  if (locale === 'en') return banner.buttonTextEn || banner.buttonTextRu || '';
  return banner.buttonTextRu || '';
}

function BannerImage({ banner, alt, priority }: { banner: Banner; alt: string; priority: boolean }) {
  const desktop = getImageProps({
    src: banner.imageDesktop,
    alt,
    width: 2400,
    height: 700,
    sizes: '(max-width: 767px) 100vw, min(1400px, 100vw)',
    priority,
    quality: 90,
  });
  const mobile = getImageProps({
    src: banner.imageMobile || banner.imageDesktop,
    alt,
    width: 1600,
    height: 900,
    sizes: '100vw',
    priority,
    quality: 90,
  });
  const { srcSet: mobileSrcSet } = mobile.props;

  return (
    <picture>
      <source media="(max-width: 767px)" srcSet={mobileSrcSet} sizes="100vw" />
      <img
        {...desktop.props}
        alt={alt}
        className="h-full w-full object-cover"
      />
    </picture>
  );
}

export function PromoCarousel({ banners, locale }: { banners: Banner[]; locale: Language }) {
  const slides = banners
    .filter((banner) => banner.active && banner.imageDesktop)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHoverPaused, setIsHoverPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const regionRef = useRef<HTMLElement>(null);
  const copy = labels[locale];

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (slides.length < 2 || isHoverPaused || reduceMotion) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [isHoverPaused, reduceMotion, slides.length]);

  if (slides.length === 0) return null;

  const move = (direction: -1 | 1) => {
    setActiveIndex((current) => (current + direction + slides.length) % slides.length);
  };

  return (
    <div className="relative group">
      <section
        ref={regionRef}
        aria-label={copy.region}
        aria-roledescription={slides.length > 1 ? 'carousel' : undefined}
        onMouseEnter={() => setIsHoverPaused(true)}
        onMouseLeave={() => setIsHoverPaused(false)}
        className="relative overflow-hidden rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] shadow-sm"
      >
        <div
          className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {slides.map((banner, index) => {
            const title = localizedTitle(banner, locale);
            const subtitle = localizedSubtitle(banner, locale);
            const buttonText = localizedButtonText(banner, locale);
            const hasText = Boolean(title || subtitle);
            const hasButton = Boolean(buttonText && banner.link);

            const content = (
              <div className="relative h-full w-full">
                <BannerImage banner={banner} alt={title || 'SANPACK Promo'} priority={index === 0} />
                
                {(hasText || hasButton) && (
                  <div className="absolute inset-0 z-10 flex flex-col justify-center px-5 sm:px-8 md:px-12 lg:px-16 py-4 sm:py-6 md:py-8 pointer-events-none">
                    <div className="max-w-[62%] sm:max-w-[55%] md:max-w-[50%] lg:max-w-[46%] space-y-1.5 sm:space-y-2 md:space-y-3">
                      {title ? (
                        <h2 className="font-extended text-sm sm:text-lg md:text-2xl lg:text-3xl font-extrabold text-white leading-tight tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
                          {title}
                        </h2>
                      ) : null}

                      {subtitle ? (
                        <p className="line-clamp-2 sm:line-clamp-3 text-[11px] sm:text-xs md:text-sm lg:text-base text-white/95 font-medium leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
                          {subtitle}
                        </p>
                      ) : null}

                      {hasButton ? (
                        <div className="pt-1 sm:pt-2">
                          <span
                            aria-hidden="true"
                            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 font-compact text-[11px] sm:text-xs md:text-sm font-semibold text-[var(--sp-on-brand)] shadow-[0_8px_20px_rgba(0,0,0,0.3)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:bg-[var(--sp-brand-deep)] group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.4)]"
                          >
                            <span className="truncate">{buttonText}</span>
                            <ArrowRight className="size-3.5 sm:size-4 shrink-0" />
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            );

            return (
              <div
                key={banner.id}
                aria-hidden={index !== activeIndex}
                className="relative aspect-video min-w-full bg-[var(--sp-surface-inset)] md:aspect-[24/7]"
              >
                {banner.link ? (
                  banner.link.startsWith('/') ? (
                    <Link
                      href={banner.link}
                      tabIndex={index === activeIndex ? 0 : -1}
                      aria-label={buttonText ? `${buttonText}: ${title || 'SANPACK'}` : (title || 'SANPACK')}
                      className="group relative block h-full w-full focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--sp-focus)]"
                    >
                      {content}
                    </Link>
                  ) : (
                    <a
                      href={banner.link}
                      tabIndex={index === activeIndex ? 0 : -1}
                      aria-label={buttonText ? `${buttonText}: ${title || 'SANPACK'}` : (title || 'SANPACK')}
                      className="group relative block h-full w-full focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--sp-focus)]"
                    >
                      {content}
                    </a>
                  )
                ) : (
                  <div className="relative h-full w-full">
                    {content}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Minimalist Floating Dots - Clean dots without wrapper/borders */}
        {slides.length > 1 && (
          <div className="absolute bottom-2.5 sm:bottom-3.5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 sm:gap-1.5">
            {slides.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`${copy.slide} ${index + 1}`}
                aria-current={index === activeIndex ? 'true' : undefined}
                className="group/dot flex h-3 sm:h-4 items-center justify-center p-0.5 focus-visible:outline-none"
              >
                <span
                  className={`h-1 sm:h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${
                    index === activeIndex
                      ? 'w-4 sm:w-5 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.65)]'
                      : 'w-1.5 sm:w-2 bg-white/50 hover:bg-white/80 shadow-[0_1px_3px_rgba(0,0,0,0.45)]'
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Outside Clean Arrows - Positioned outside slider without circles */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label={copy.previous}
            className="hidden md:flex absolute -left-7 lg:-left-9 top-1/2 z-10 -translate-y-1/2 items-center justify-center p-1 text-[var(--sp-ink-muted)] hover:text-[var(--sp-ink)] transition-all duration-200 hover:scale-110 active:scale-95 focus-visible:outline-none"
          >
            <ChevronLeft className="size-6 lg:size-7" strokeWidth={2.2} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label={copy.next}
            className="hidden md:flex absolute -right-7 lg:-right-9 top-1/2 z-10 -translate-y-1/2 items-center justify-center p-1 text-[var(--sp-ink-muted)] hover:text-[var(--sp-ink)] transition-all duration-200 hover:scale-110 active:scale-95 focus-visible:outline-none"
          >
            <ChevronRight className="size-6 lg:size-7" strokeWidth={2.2} aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}
