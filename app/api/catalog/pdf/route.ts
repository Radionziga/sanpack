import { NextResponse } from 'next/server';
import {
  getPublicCategories,
  getPublicClients,
  getPublicProducts,
  getPublicSettings,
} from '@/lib/repositories/serverCatalogRepository';
import { createCatalogPdf } from '@/lib/documents/createCatalogPdf';
import type { Language } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const pricesParam = searchParams.get('prices') ?? searchParams.get('withPrices');
    const withPrices = pricesParam === null ? true : pricesParam === '1' || pricesParam === 'true';

    const langParam = searchParams.get('lang') || 'ru';
    const language: Language = ['ru', 'uz', 'en'].includes(langParam) ? (langParam as Language) : 'ru';

    const categoryParam = searchParams.get('category') || searchParams.get('categoryId') || undefined;
    const download = searchParams.get('download') === '1' || searchParams.get('download') === 'true';

    // Fetch live catalog data
    const [products, categories, settings, clients] = await Promise.all([
      getPublicProducts(),
      getPublicCategories(),
      getPublicSettings(),
      getPublicClients(),
    ]);

    // Find category ID if slug was passed
    let categoryId = categoryParam;
    if (categoryParam) {
      const match = categories.find((c) => c.slug === categoryParam || c.id === categoryParam);
      if (match) categoryId = match.id;
    }

    const pdfBuffer = await createCatalogPdf(products, categories, settings, clients, {
      withPrices,
      language,
      categoryId,
    });

    const filename = withPrices
      ? `sanpack-catalog-price-list-${language}.pdf`
      : `sanpack-catalog-presentation-${language}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
        'cache-control': 'public, s-maxage=300, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Catalog PDF generation failed:', error);
    return NextResponse.json(
      { error: 'Не удалось сгенерировать PDF-каталог.' },
      { status: 500 }
    );
  }
}
