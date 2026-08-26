import { NextResponse } from 'next/server';
import { getCatalogPrintPath } from '@/lib/documents/catalogIdentity';
import type { Language } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pricesParam = url.searchParams.get('prices') ?? url.searchParams.get('withPrices');
  const withPrices = pricesParam === null || pricesParam === '1' || pricesParam === 'true';
  const langParam = url.searchParams.get('lang') || 'ru';
  const language: Language = ['ru', 'uz', 'en', 'zh'].includes(langParam)
    ? (langParam as Language)
    : 'ru';
  const category = url.searchParams.get('category') || url.searchParams.get('categoryId') || undefined;

  return NextResponse.redirect(
    new URL(getCatalogPrintPath(withPrices, language, category), url.origin),
  );
}
