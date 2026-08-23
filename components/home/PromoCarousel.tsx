'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getImageProps } from 'next/image';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Banner, Language } from '@/types';
import { Link } from '@/i18n/navigation';
import { resolveLocalizedText } from '@/lib/i18n/localizedText';

const labels = {
  ru: { region: 'Промо-предложения', previous: 'Предыдущий баннер', next: 'Следующий баннер', slide: 'Показать баннер' },
  uz: { region: 'Promo takliflar', previous: 'Oldingi banner', next: 'Keyingi banner', slide: 'Bannerni ko‘rsatish' },
  en: { region: 'Promotions', previous: 'Previous banner', next: 'Next banner', slide: 'Show banner' },
} satisfies Record<Language, Record<string, string>>;

function localizedTitle(banner: Banner, locale: Language) {
  return resolveLocalizedText(locale, { ru: banner.titleRu, uz: banner.titleUz, en: banner.titleEn }).text;
}

function localizedSubtitle(banner: Banner, locale: Language) {
  return resolveLocalizedText(locale, { ru: banner.subtitleRu, uz: banner.subtitleUz, en: banner.subtitleEn }).text;
}

function localizedButtonText(banner: Banner, locale: Language) {
  return resolveLocalizedText(locale, { ru: banner.buttonTextRu, uz: banner.buttonTextUz, en: banner.buttonTextEn }).text;
}

function BannerImage({ banner, alt, eager }: { banner: Banner; alt: string; eager: boolean }) {
  const desktop = getImageProps({
    src: banner.imageDesktop,
    alt,
    width: 2400,
    height: 700,
    sizes: '(max-width: 767px) 100vw, min(1400px, 100vw)',
    priority: eager,
    quality: 88,
  });
  const mobile = getImageProps({
    src: banner.imageMobile || banner.imageDesktop,
    alt,
    width: 1600,
    height: 900,
    sizes: '100vw',
    priority: eager,
    quality: 88,
  });

  return (
    <picture>
      <source media="(max-width: 767px)" srcSet={mobile.props.srcSet} sizes="100vw" />
      <img
        {...desktop.props}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="h-full w-full object-cover"
      />
    </picture>
  );
}

export function PromoCarousel({ banners, locale }: { banners: Banner[]; locale: Language }) {
  const slides = useMemo(() => banners
    .filter((banner) => banner.active && banner.imageDesktop)
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder), [banners]);
  const copy = labels[locale];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHoverPaused, setIsHoverPaused] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const settleTimerRef = useRef<number | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const rawIndexRef = useRef(0);

  const renderedSlides = useMemo(() => {
    if (slides.length < 2) {
      return slides.map((banner, logicalIndex) => ({ banner, logicalIndex, clone: false, key: banner.id }));
    }
    return [
      ...slides.map((banner, logicalIndex) => ({ banner, logicalIndex, clone: false, key: banner.id })),
      { banner: slides[0], logicalIndex: 0, clone: true, key: `${slides[0].id}-after` },
    ];
  }, [slides]);

  const jumpToRawIndex = useCallback((rawIndex: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    rawIndexRef.current = rawIndex;
    viewport.scrollTo({ left: rawIndex * viewport.clientWidth, behavior: 'auto' });
  }, []);

  const scrollToRawIndex = useCallback((rawIndex: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    rawIndexRef.current = rawIndex;
    viewport.scrollTo({
      left: rawIndex * viewport.clientWidth,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [reduceMotion]);

  const move = useCallback((direction: -1 | 1) => {
    if (slides.length < 2) return;
    if (direction === -1 && rawIndexRef.current === 0) {
      jumpToRawIndex(slides.length);
      window.requestAnimationFrame(() => scrollToRawIndex(slides.length - 1));
      return;
    }
    scrollToRawIndex(rawIndexRef.current + direction);
  }, [jumpToRawIndex, scrollToRawIndex, slides.length]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    rawIndexRef.current = 0;
    const frame = window.requestAnimationFrame(() => jumpToRawIndex(rawIndexRef.current));
    const viewport = viewportRef.current;
    if (!viewport) return () => window.cancelAnimationFrame(frame);
    const observer = new ResizeObserver(() => jumpToRawIndex(rawIndexRef.current));
    observer.observe(viewport);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [jumpToRawIndex, slides.length]);

  useEffect(() => {
    if (slides.length < 2 || isHoverPaused || isInteracting || reduceMotion) return;
    const timer = window.setInterval(() => move(1), 6500);
    return () => window.clearInterval(timer);
  }, [isHoverPaused, isInteracting, move, reduceMotion, slides.length]);

  useEffect(() => () => {
    if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current);
    if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current);
  }, []);

  const settleLoopPosition = useCallback(() => {
    if (slides.length < 2) return;
    const rawIndex = rawIndexRef.current;
    if (rawIndex === slides.length) jumpToRawIndex(0);
  }, [jumpToRawIndex, slides.length]);

  const handleScroll = useCallback(() => {
    if (scrollFrameRef.current !== null) return;
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const viewport = viewportRef.current;
      if (!viewport || viewport.clientWidth === 0) return;
      const rawIndex = Math.round(viewport.scrollLeft / viewport.clientWidth);
      rawIndexRef.current = rawIndex;
      if (slides.length > 1) {
        const logicalIndex = rawIndex === slides.length
          ? 0
          : Math.max(0, Math.min(slides.length - 1, rawIndex));
        setActiveIndex(logicalIndex);
      }
      if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = window.setTimeout(settleLoopPosition, 120);
    });
  }, [settleLoopPosition, slides.length]);

  if (slides.length === 0) return null;

  return (
    <div className="group relative">
      <section
        aria-label={copy.region}
        aria-roledescription={slides.length > 1 ? 'carousel' : undefined}
        onMouseEnter={() => setIsHoverPaused(true)}
        onMouseLeave={() => setIsHoverPaused(false)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
          if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
        }}
        className="relative"
      >
        <div
          ref={viewportRef}
          onScroll={handleScroll}
          onPointerDown={() => setIsInteracting(true)}
          onPointerUp={() => setIsInteracting(false)}
          onPointerCancel={() => setIsInteracting(false)}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {renderedSlides.map(({ banner, logicalIndex, clone, key }) => {
            const title = localizedTitle(banner, locale);
            const subtitle = localizedSubtitle(banner, locale);
            const buttonText = localizedButtonText(banner, locale);
            const hasText = Boolean(title || subtitle);
            const hasButton = Boolean(buttonText && banner.link);
            const isActive = !clone && logicalIndex === activeIndex;

            const content = (
              <div className="relative h-full w-full">
                <BannerImage banner={banner} alt={title || copy.region} eager={logicalIndex === 0 && !clone} />
                {(hasText || hasButton) ? (
                  <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-center px-5 py-4 sm:px-8 sm:py-6 md:px-12 md:py-8 lg:px-16">
                    <div className="max-w-[62%] space-y-1.5 sm:max-w-[55%] sm:space-y-2 md:max-w-[50%] md:space-y-3 lg:max-w-[46%]">
                      {title ? <h2 className="font-extended text-sm font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] sm:text-lg md:text-2xl lg:text-3xl">{title}</h2> : null}
                      {subtitle ? <p className="line-clamp-2 text-[11px] font-medium leading-relaxed text-white/95 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] sm:line-clamp-3 sm:text-xs md:text-sm lg:text-base">{subtitle}</p> : null}
                      {hasButton ? (
                        <div className="pt-1 sm:pt-2">
                          <span aria-hidden="true" className="inline-flex items-center gap-1.5 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-3 py-1.5 font-compact text-[11px] font-semibold text-[var(--sp-on-brand)] shadow-[0_8px_20px_rgba(0,0,0,0.3)] transition-[background-color,box-shadow] duration-200 group-hover:bg-[var(--sp-brand-deep)] group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.4)] sm:gap-2 sm:px-4 sm:py-2 sm:text-xs md:px-5 md:py-2.5 md:text-sm">
                            <span className="truncate">{buttonText}</span><ArrowRight className="size-3.5 shrink-0 sm:size-4" />
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            );

            return (
              <div key={key} aria-hidden={clone || !isActive} className="relative min-w-full snap-center px-px py-1">
                <div className="relative aspect-video overflow-hidden rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] shadow-sm md:aspect-[24/7]">
                  {banner.link ? (
                    banner.link.startsWith('/') ? (
                      <Link href={banner.link} tabIndex={isActive ? 0 : -1} aria-label={buttonText ? `${buttonText}: ${title || copy.region}` : title || copy.region} className="group relative block h-full w-full focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--sp-focus)]">{content}</Link>
                    ) : (
                      <a href={banner.link} tabIndex={isActive ? 0 : -1} aria-label={buttonText ? `${buttonText}: ${title || copy.region}` : title || copy.region} className="group relative block h-full w-full focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--sp-focus)]">{content}</a>
                    )
                  ) : <div className="relative h-full w-full">{content}</div>}
                </div>
              </div>
            );
          })}
        </div>

        {slides.length > 1 ? (
          <div className="absolute bottom-1 left-1/2 z-20 flex -translate-x-1/2 items-center">
            {slides.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => scrollToRawIndex(index)}
                aria-label={`${copy.slide} ${index + 1}`}
                aria-current={index === activeIndex ? 'true' : undefined}
                className="flex size-11 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white"
              >
                <span className={`h-1.5 rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.55)] transition-[width,background-color] duration-200 motion-reduce:transition-none ${index === activeIndex ? 'w-5 bg-white' : 'w-2 bg-white/55 hover:bg-white/85'}`} />
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {slides.length > 1 ? (
        <>
          <button type="button" onClick={() => move(-1)} aria-label={copy.previous} className="absolute -left-7 top-1/2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full text-[var(--sp-ink-muted)] transition-[color,background-color] hover:bg-[var(--sp-surface)] hover:text-[var(--sp-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)] md:flex lg:-left-11"><ChevronLeft className="size-6" strokeWidth={2.2} aria-hidden="true" /></button>
          <button type="button" onClick={() => move(1)} aria-label={copy.next} className="absolute -right-7 top-1/2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full text-[var(--sp-ink-muted)] transition-[color,background-color] hover:bg-[var(--sp-surface)] hover:text-[var(--sp-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)] md:flex lg:-right-11"><ChevronRight className="size-6" strokeWidth={2.2} aria-hidden="true" /></button>
        </>
      ) : null}
    </div>
  );
}
