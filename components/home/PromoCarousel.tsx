'use client';

import { useEffect, useRef, useState } from 'react';
import { getImageProps } from 'next/image';
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import type { Banner, Language } from '@/types';
import { Link } from '@/i18n/navigation';

const labels = {
  ru: {
    region: 'Промо-предложения SANPACK',
    previous: 'Предыдущий баннер',
    next: 'Следующий баннер',
    slide: 'Показать баннер',
    pause: 'Пауза',
    play: 'Продолжить',
  },
  uz: {
    region: 'SANPACK promo takliflari',
    previous: 'Oldingi banner',
    next: 'Keyingi banner',
    slide: 'Bannerni ko‘rsatish',
    pause: 'Pauza',
    play: 'Davom ettirish',
  },
  en: {
    region: 'SANPACK promotions',
    previous: 'Previous banner',
    next: 'Next banner',
    slide: 'Show banner',
    pause: 'Pause',
    play: 'Play',
  },
} satisfies Record<Language, Record<string, string>>;

function localizedTitle(banner: Banner, locale: Language) {
  if (locale === 'uz') return banner.titleUz || banner.titleRu;
  if (locale === 'en') return banner.titleEn || banner.titleRu;
  return banner.titleRu;
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
    width: 1920,
    height: 560,
    sizes: '(max-width: 767px) 100vw, min(1280px, 100vw)',
    priority,
    quality: 88,
  });
  const mobile = getImageProps({
    src: banner.imageMobile || banner.imageDesktop,
    alt,
    width: 960,
    height: 540,
    sizes: '100vw',
    priority,
    quality: 88,
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
  const [isUserPaused, setIsUserPaused] = useState(false);
  const [isHoverPaused, setIsHoverPaused] = useState(false);
  const [pausePreferenceReady, setPausePreferenceReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const regionRef = useRef<HTMLElement>(null);
  const copy = labels[locale];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsUserPaused(window.localStorage.getItem('sanpack-carousel-paused') === 'true');
      setPausePreferenceReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (slides.length < 2 || !pausePreferenceReady || isUserPaused || isHoverPaused || reduceMotion) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [isHoverPaused, isUserPaused, pausePreferenceReady, reduceMotion, slides.length]);

  if (slides.length === 0) return null;

  const move = (direction: -1 | 1) => {
    setActiveIndex((current) => (current + direction + slides.length) % slides.length);
  };

  const togglePlayback = () => {
    setIsUserPaused((current) => {
      const next = !current;
      window.localStorage.setItem('sanpack-carousel-paused', String(next));
      return next;
    });
  };

  return (
    <section
      ref={regionRef}
      aria-label={copy.region}
      aria-roledescription={slides.length > 1 ? 'carousel' : undefined}
      onMouseEnter={() => setIsHoverPaused(true)}
      onMouseLeave={() => setIsHoverPaused(false)}
      className="relative overflow-hidden rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)]"
    >
      <div
        className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {slides.map((banner, index) => {
          const title = localizedTitle(banner, locale);
          const buttonText = localizedButtonText(banner, locale);
          const content = (
            <>
              <BannerImage banner={banner} alt={title} priority={index === 0} />
              {banner.link && buttonText ? (
                <span
                  aria-hidden="true"
                  className={`absolute left-[clamp(24px,4vw,64px)] hidden min-h-11 max-w-[min(360px,42%)] items-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-5 font-compact text-xs font-semibold text-[var(--sp-on-brand)] shadow-[0_10px_24px_rgb(0_0_0/18%)] transition-[transform,background-color] duration-200 group-hover:-translate-y-0.5 group-hover:bg-[var(--sp-brand-deep)] md:inline-flex ${
                    slides.length > 1
                      ? 'bottom-[clamp(68px,18%,92px)]'
                      : 'bottom-[clamp(28px,10%,52px)]'
                  }`}
                >
                  <span className="truncate">{buttonText}</span>
                  <ArrowRight className="size-4 shrink-0" />
                </span>
              ) : null}
            </>
          );
          return (
            <div
              key={banner.id}
              aria-hidden={index !== activeIndex}
              className="aspect-video min-w-full bg-[var(--sp-surface-inset)] md:aspect-[24/7]"
            >
              {banner.link ? (
                banner.link.startsWith('/') ? (
                  <Link
                    href={banner.link}
                    tabIndex={index === activeIndex ? 0 : -1}
                    aria-label={buttonText ? `${buttonText}: ${title}` : title}
                    className="group relative block h-full w-full focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--sp-focus)]"
                  >
                    {content}
                  </Link>
                ) : (
                  <a
                    href={banner.link}
                    tabIndex={index === activeIndex ? 0 : -1}
                    aria-label={buttonText ? `${buttonText}: ${title}` : title}
                    className="group relative block h-full w-full focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--sp-focus)]"
                  >
                    {content}
                  </a>
                )
              ) : <BannerImage banner={banner} alt={title} priority={index === 0} />}
            </div>
          );
        })}
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label={copy.previous}
            className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-[var(--sp-radius-control)] border border-white/30 bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55 md:left-4"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label={copy.next}
            className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-[var(--sp-radius-control)] border border-white/30 bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55 md:right-4"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={togglePlayback}
            aria-label={isUserPaused ? copy.play : copy.pause}
            aria-pressed={isUserPaused}
            className="absolute bottom-3 left-3 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[var(--sp-radius-control)] border border-white/30 bg-black/45 px-3 font-compact text-[10px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/65 md:bottom-4 md:left-4"
          >
            {isUserPaused ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}
            {isUserPaused ? copy.play : copy.pause}
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-0.5 rounded-full bg-black/35 px-2 py-1 backdrop-blur-sm md:bottom-4">
            {slides.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`${copy.slide} ${index + 1}`}
                aria-current={index === activeIndex ? 'true' : undefined}
                className="group flex size-7 items-center justify-center rounded-full"
              >
                <span className={`h-2 rounded-full transition-[width,background-color] motion-reduce:transition-none ${
                  index === activeIndex ? 'w-5 bg-white' : 'w-2 bg-white/55 group-hover:bg-white/80'
                }`} />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
