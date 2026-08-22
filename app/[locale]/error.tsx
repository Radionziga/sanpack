'use client';

import { useParams } from 'next/navigation';

const copy = {
  ru: {
    title: 'Каталог временно недоступен',
    description: 'Не удалось загрузить актуальные данные. Попробуйте ещё раз немного позже.',
    retry: 'Попробовать снова',
  },
  uz: {
    title: 'Katalog vaqtincha ishlamayapti',
    description: 'Hozirgi maʼlumotlarni yuklab bo‘lmadi. Birozdan keyin yana urinib ko‘ring.',
    retry: 'Qayta urinish',
  },
  en: {
    title: 'Catalog temporarily unavailable',
    description: 'Current data could not be loaded. Please try again a little later.',
    retry: 'Try again',
  },
} as const;

export default function StorefrontError({ reset }: { reset: () => void }) {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale === 'uz' || params.locale === 'en' ? params.locale : 'ru';
  const labels = copy[locale];

  return (
    <main className="grid min-h-[60vh] place-items-center px-6 py-16">
      <section className="max-w-lg text-center">
        <h1 className="text-2xl font-semibold text-[var(--sp-ink)]">{labels.title}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--sp-muted)]">{labels.description}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-xl bg-[var(--sp-primary)] px-5 py-3 text-sm font-semibold text-[var(--sp-on-primary)]"
        >
          {labels.retry}
        </button>
      </section>
    </main>
  );
}
