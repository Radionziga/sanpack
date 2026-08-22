import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import pdfMake from 'pdfmake';
import type { Content, Margins, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { Category, ClientPartner, Language, Product, SiteSettings } from '@/types';
import {
  getCatalogCompanyName,
  getCatalogDocumentTheme,
  getCatalogSiteLabel,
} from '@/lib/documents/catalogIdentity';

function initPdfFonts() {
  const robotoDir = path.join(process.cwd(), 'node_modules', 'pdfmake', 'fonts', 'Roboto');
  const customFonts = {
    Roboto: {
      normal: path.join(robotoDir, 'Roboto-Regular.ttf'),
      bold: path.join(robotoDir, 'Roboto-Medium.ttf'),
      italics: path.join(robotoDir, 'Roboto-Italic.ttf'),
      bolditalics: path.join(robotoDir, 'Roboto-MediumItalic.ttf'),
    },
  };
  pdfMake.addFonts(customFonts);
  pdfMake.setLocalAccessPolicy(() => true);
  pdfMake.setUrlAccessPolicy(() => false);
}

try {
  initPdfFonts();
} catch (fontErr) {
  console.warn('PDFMake font init error:', fontErr);
}

export interface CatalogPdfOptions {
  withPrices?: boolean;
  language?: Language;
  categoryId?: string;
}

const imageCache = new Map<string, string | null>();

// Helper to convert local or remote image to optimized base64 JPEG
async function getOptimizedImage(
  imagePath?: string,
  maxWidth = 280,
  maxHeight = 220
): Promise<string | null> {
  if (!imagePath) return null;
  const cleanPath = imagePath.trim();
  if (!cleanPath) return null;

  const cacheKey = `${cleanPath}_${maxWidth}x${maxHeight}`;
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey) ?? null;
  }

  try {
    let buffer: Buffer | null = null;

    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      try {
        const response = await fetch(cleanPath, { signal: controller.signal });
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        }
      } catch {
        // Skip timed out or failed remote image
      } finally {
        clearTimeout(timeout);
      }
    } else {
      let relativePath = cleanPath;
      if (relativePath.startsWith('/')) relativePath = relativePath.slice(1);
      const fullPath = path.resolve('public', relativePath);
      if (fs.existsSync(fullPath)) {
        const ext = path.extname(fullPath).toLowerCase();
        if (ext !== '.svg') {
          buffer = await fs.promises.readFile(fullPath);
        }
      }
    }

    if (!buffer) {
      imageCache.set(cacheKey, null);
      return null;
    }

    const optimized = await sharp(buffer)
      .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const dataUrl = `data:image/jpeg;base64,${optimized.toString('base64')}`;
    imageCache.set(cacheKey, dataUrl);
    return dataUrl;
  } catch {
    imageCache.set(cacheKey, null);
    return null;
  }
}

function formatMoney(amount?: number, currency = 'сум'): string {
  if (amount === undefined || amount === null || amount <= 0) return 'По запросу';
  return `${new Intl.NumberFormat('ru-RU').format(amount)} ${currency}`;
}

async function preloadImages(imageUrls: (string | undefined)[], concurrency = 16) {
  const uniqueUrls = Array.from(
    new Set(imageUrls.filter((u): u is string => Boolean(u && u.trim())))
  );
  for (let i = 0; i < uniqueUrls.length; i += concurrency) {
    const chunk = uniqueUrls.slice(i, i + concurrency);
    await Promise.all(chunk.map((url) => getOptimizedImage(url, 140, 110)));
  }
}

export async function createCatalogPdf(
  products: Product[],
  categories: Category[],
  settings: SiteSettings,
  clients: ClientPartner[],
  options: CatalogPdfOptions = {}
): Promise<Buffer> {
  const withPrices = options.withPrices !== false;
  const lang = options.language || 'ru';
  const companyName = getCatalogCompanyName(settings);
  const siteLabel = getCatalogSiteLabel(process.env.NEXT_PUBLIC_SITE_URL);
  const phone1 = settings.contacts.phone1.trim();
  const phone2 = settings.contacts.phone2.trim();
  const email = settings.contacts.email.trim();

  const catalogTheme = getCatalogDocumentTheme(settings.design);
  const brandGreen = catalogTheme.brand;
  const darkGreen = catalogTheme.brandDeep;
  const onBrand = catalogTheme.onBrand;
  const onDarkBrand = catalogTheme.onBrandDeep;
  const lightBg = '#F3F4F6';
  const darkInk = '#111827';
  const secondaryInk = '#4B5563';
  const mutedInk = '#9CA3AF';

  // Sort categories
  const sortedCategories = [...categories].sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));

  // Map products by category
  const productsByCategory = new Map<string, Product[]>();
  const allImagesToPreload: (string | undefined)[] = [
    '/catalog/extracted_p1_img1.jpeg',
    '/catalog/commercial_packaging_10.webp',
  ];

  for (const client of clients.slice(0, 16)) {
    allImagesToPreload.push(client.logo);
  }

  for (const product of products) {
    if (product.status && product.status !== 'published') continue;
    if (options.categoryId && product.categoryId !== options.categoryId) continue;

    const catId = product.categoryId || 'other';
    if (!productsByCategory.has(catId)) {
      productsByCategory.set(catId, []);
    }
    productsByCategory.get(catId)!.push(product);
    allImagesToPreload.push(product.mainImage || product.images?.[0]);
  }

  // Pre-load all images concurrently for blazingly fast PDF compilation
  await preloadImages(allImagesToPreload, 16);

  // Pre-load cover hero image & branding images
  const coverHero = await getOptimizedImage('/catalog/extracted_p1_img1.jpeg', 500, 360);
  const brandingHero = await getOptimizedImage('/catalog/commercial_packaging_10.webp', 500, 300);

  // Pre-load client logos (top 16)
  const clientLogos: { name: string; image: string | null }[] = [];
  for (const client of clients.slice(0, 16)) {
    const logoData = await getOptimizedImage(client.logo, 140, 100);
    clientLogos.push({ name: client.name, image: logoData });
  }

  // Common page header builder
  const makeHeader = (): Content => ({
    margin: [28, 20, 28, 0] as Margins,
    table: {
      widths: ['*'],
      body: [
        [
          {
            fillColor: brandGreen,
            border: [false, false, false, false],
            margin: [14, 8, 14, 8] as Margins,
            columns: [
              {
                text: companyName,
                fontSize: 15,
                bold: true,
                color: onBrand,
                characterSpacing: 1.5,
              },
              {
                text: '|   Каталог продукции  /  Mahsulotlar katalogi' + (withPrices ? ' (Прайс-лист)' : ''),
                fontSize: 9,
                color: onBrand,
                alignment: 'right',
                margin: [0, 4, 0, 0] as Margins,
              },
            ],
          },
        ],
      ],
    },
    layout: 'noBorders',
  });

  // Footer function for pages
  const footerBuilder = (currentPage: number, pageCount: number): Content => {
    if (currentPage === 1) return { text: '' }; // No footer on cover page
    return {
      margin: [28, 10, 28, 0] as Margins,
      columns: [
        {
          text: [phone1, phone2].filter(Boolean).join('    '),
          fontSize: 8,
          color: secondaryInk,
          bold: true,
        },
        {
          text: `${siteLabel ? `${siteLabel}   |   ` : ''}Стр. ${currentPage} из ${pageCount}`,
          fontSize: 8,
          color: secondaryInk,
          alignment: 'right',
        },
      ],
    };
  };

  const docContent: Content[] = [];

  // ==========================================
  // PAGE 1: COVER PAGE
  // ==========================================
  const coverStack: Content[] = [
    {
      text: companyName,
      fontSize: 38,
      bold: true,
      color: onDarkBrand,
      alignment: 'center',
      characterSpacing: 4,
      margin: [0, 0, 0, 8] as Margins,
    },
    {
      text: 'Комплексные поставки для HoReCa\nHoReCa uchun kompleks ta’minot',
      fontSize: 12,
      color: onDarkBrand,
      alignment: 'center',
      lineHeight: 1.3,
      margin: [0, 0, 0, 16] as Margins,
    },
    {
      text: 'КАТАЛОГ ПРОДУКЦИИ\nMAHSULOTLAR KATALOGI',
      fontSize: 17,
      bold: true,
      color: onDarkBrand,
      alignment: 'center',
      characterSpacing: 1.5,
      lineHeight: 1.25,
      margin: [0, 0, 0, 18] as Margins,
    },
  ];

  if (coverHero) {
    coverStack.push({
      image: coverHero,
      width: 420,
      alignment: 'center',
      margin: [0, 10, 0, 20] as Margins,
    });
  }

  coverStack.push({
    text: 'Упаковка  •  Расходные материалы  •  Продукты питания\nQadoqlash  •  Sarf materiallari  •  Oziq-ovqat mahsulotlari',
    fontSize: 10,
    color: '#E5E7EB',
    alignment: 'center',
    lineHeight: 1.4,
    margin: [0, 15, 0, 0] as Margins,
  });

  docContent.push({
    margin: [-30, -30, -30, -40] as Margins,
    table: {
      widths: ['*'],
      body: [
        [
          {
            fillColor: darkGreen,
            border: [false, false, false, false],
            margin: [36, 44, 36, 44] as Margins,
            stack: coverStack,
          },
        ],
      ],
    },
    layout: 'noBorders',
    pageBreak: 'after',
  });

  // ==========================================
  // PAGE 2: CLIENTS & PARTNERS
  // ==========================================
  if (clientLogos.length > 0 && !options.categoryId) {
    const clientRows: TableCell[][] = [];
    const chunkSize = 4;
    for (let i = 0; i < clientLogos.length; i += chunkSize) {
      const slice = clientLogos.slice(i, i + chunkSize);
      const rowCells: TableCell[] = slice.map((item) => ({
        margin: [4, 6, 4, 6] as Margins,
        alignment: 'center',
        stack: [
          item.image
            ? {
                image: item.image,
                width: 90,
                height: 60,
                alignment: 'center' as const,
              }
            : {
                text: item.name,
                fontSize: 9,
                bold: true,
                color: darkInk,
                margin: [0, 20, 0, 20] as Margins,
              },
        ],
      }));
      while (rowCells.length < 4) {
        rowCells.push({ text: '' });
      }
      clientRows.push(rowCells);
    }

    docContent.push(
      makeHeader(),
      {
        margin: [0, 14, 0, 12] as Margins,
        fillColor: lightBg,
        table: {
          widths: ['*'],
          body: [
            [
              {
                border: [false, false, false, false],
                margin: [12, 8, 12, 8] as Margins,
                stack: [
                  {
                    text: 'Наши клиенты и партнеры',
                    fontSize: 14,
                    bold: true,
                    color: darkInk,
                  },
                  {
                    text: 'Bizning mijozlarimiz va hamkorlarimiz',
                    fontSize: 10,
                    color: secondaryInk,
                    margin: [0, 2, 0, 0] as Margins,
                  },
                ],
              },
            ],
          ],
        },
        layout: 'noBorders',
      },
      {
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: clientRows,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#E5E7EB',
          vLineColor: () => '#E5E7EB',
        },
        margin: [0, 6, 0, 0] as Margins,
      },
      {
        text: '',
        pageBreak: 'after',
      }
    );
  }

  // ==========================================
  // PAGES 3+: CATEGORIES & PRODUCTS GRID
  // ==========================================
  for (const category of sortedCategories) {
    const catProducts = productsByCategory.get(category.id) || [];
    if (catProducts.length === 0) continue;

    // Split category products into pages (6 products per page for clean visual layout)
    const itemsPerPage = 6;
    for (let pageIdx = 0; pageIdx < catProducts.length; pageIdx += itemsPerPage) {
      const pageProducts = catProducts.slice(pageIdx, pageIdx + itemsPerPage);

      // Pre-load images for these products
      const renderedCards: TableCell[] = [];
      for (const prod of pageProducts) {
        const prodImg = await getOptimizedImage(prod.mainImage || prod.images?.[0], 130, 100);

        // Extract key attribute specs
        const specsList: string[] = [];
        if (prod.attributes?.size) specsList.push(String(prod.attributes.size));
        if (prod.attributes?.volume) specsList.push(String(prod.attributes.volume));
        if (prod.attributes?.package_quantity) specsList.push(String(prod.attributes.package_quantity));
        if (prod.attributes?.weight) specsList.push(String(prod.attributes.weight));

        const specLine = specsList.slice(0, 2).join(' | ');
        const secondSpecLine = specsList.slice(2).join(' • ');

        // Price line
        let priceText = '';
        if (withPrices) {
          if (prod.variants && prod.variants.length > 0 && prod.variants[0].price) {
            priceText = formatMoney(prod.variants[0].price, prod.currency || 'сум');
          } else if (prod.price) {
            priceText = formatMoney(prod.price, prod.currency || 'сум');
          } else {
            priceText = 'Цена по запросу';
          }
          if (prod.salesUnit) priceText += ` / ${prod.salesUnit}`;
        }

        const cardStack: Content[] = [
          {
            text: prod.titleRu.toUpperCase(),
            fontSize: 8.5,
            bold: true,
            color: darkGreen,
            alignment: 'center',
          },
        ];

        if (specLine) {
          cardStack.push({
            text: specLine,
            fontSize: 7.5,
            color: secondaryInk,
            alignment: 'center',
            margin: [0, 1, 0, 0] as Margins,
          });
        }

        if (secondSpecLine) {
          cardStack.push({
            text: secondSpecLine,
            fontSize: 7,
            color: mutedInk,
            alignment: 'center',
            margin: [0, 1, 0, 0] as Margins,
          });
        }

        if (prodImg) {
          cardStack.push({
            image: prodImg,
            width: 100,
            height: 80,
            alignment: 'center',
            margin: [0, 4, 0, 4] as Margins,
          });
        } else {
          cardStack.push({
            text: '\n[ Фото позиции ]\n',
            fontSize: 7,
            color: mutedInk,
            alignment: 'center',
            margin: [0, 24, 0, 24] as Margins,
          });
        }

        if (withPrices) {
          cardStack.push({
            text: priceText,
            fontSize: 8.5,
            bold: true,
            color: brandGreen,
            alignment: 'center',
            margin: [0, 2, 0, 0] as Margins,
          });
        } else {
          cardStack.push({
            text: prod.sku ? `Арт: ${prod.sku}` : (prod.ownProduction ? 'Собственное производство' : ''),
            fontSize: 7,
            color: secondaryInk,
            alignment: 'center',
            margin: [0, 2, 0, 0] as Margins,
          });
        }

        renderedCards.push({
          margin: [3, 4, 3, 4] as Margins,
          stack: cardStack,
        });
      }

      // Build 3-column table rows
      const gridRows: TableCell[][] = [];
      for (let i = 0; i < renderedCards.length; i += 3) {
        const row = renderedCards.slice(i, i + 3);
        while (row.length < 3) {
          row.push({ text: '' });
        }
        gridRows.push(row);
      }

      // Add page to doc
      docContent.push(
        makeHeader(),
        {
          margin: [0, 12, 0, 10] as Margins,
          fillColor: lightBg,
          table: {
            widths: ['*'],
            body: [
              [
                {
                  border: [false, false, false, false],
                  margin: [12, 7, 12, 7] as Margins,
                  columns: [
                    {
                      stack: [
                        {
                          text: category.titleRu,
                          fontSize: 13,
                          bold: true,
                          color: darkInk,
                        },
                        {
                          text: category.titleUz,
                          fontSize: 9.5,
                          color: secondaryInk,
                          margin: [0, 1, 0, 0] as Margins,
                        },
                      ],
                    },
                    ...(category.slug.includes('zelen') || category.slug.includes('greens')
                      ? [
                          {
                            text: 'Novagreen',
                            fontSize: 14,
                            bold: true,
                            color: brandGreen,
                            alignment: 'right' as const,
                            margin: [0, 4, 0, 0] as Margins,
                          },
                        ]
                      : []),
                  ],
                },
              ],
            ],
          },
          layout: 'noBorders',
        },
        {
          table: {
            widths: ['33.33%', '33.33%', '33.33%'],
            body: gridRows,
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#E5E7EB',
            vLineColor: () => '#E5E7EB',
          },
          margin: [0, 2, 0, 0] as Margins,
        },
        {
          text: '',
          pageBreak: 'after',
        }
      );
    }
  }

  // ==========================================
  // FINAL PAGE: POLYGRAPHY & BRANDING
  // ==========================================
  if (!options.categoryId) {
    docContent.push(
      makeHeader(),
      {
        margin: [0, 14, 0, 12] as Margins,
        fillColor: lightBg,
        table: {
          widths: ['*'],
          body: [
            [
              {
                border: [false, false, false, false],
                margin: [12, 8, 12, 8] as Margins,
                stack: [
                  {
                    text: 'Полиграфия, упаковка и брендирование',
                    fontSize: 14,
                    bold: true,
                    color: darkInk,
                  },
                  {
                    text: 'Poligrafiya, qadoqlash va brendlash',
                    fontSize: 10,
                    color: secondaryInk,
                    margin: [0, 2, 0, 0] as Margins,
                  },
                ],
              },
            ],
          ],
        },
        layout: 'noBorders',
      },
      ...(brandingHero
        ? [
            {
              image: brandingHero,
              width: 440,
              alignment: 'center' as const,
              margin: [0, 10, 0, 15] as Margins,
            },
          ]
        : []),
      {
        margin: [0, 10, 0, 0] as Margins,
        table: {
          widths: ['*'],
          body: [
            [
              {
                border: [false, false, false, false],
                fillColor: '#F9FAFB',
                margin: [14, 12, 14, 12] as Margins,
                stack: [
                  {
                    text: 'ПОЛИГРАФИЯ И БРЕНДИРОВАНИЕ ДЛЯ ВАШЕГО БИЗНЕСА',
                    fontSize: 10,
                    bold: true,
                    color: brandGreen,
                    margin: [0, 0, 0, 6] as Margins,
                  },
                  {
                    text: `${companyName} совместно с производственными партнёрами предлагает комплексные услуги по брендированию и полиграфии для HoReCa:\n\n• Разработка и изготовление брендированных мусорных мешков и пакетов «майка» с логотипом\n• Печать меню, визиток, флаеров, буклетов, каталогов, блокнотов и конвертов\n• Картонные коробки для пиццы, фастфуда, стаканчики и пергамент с вашей фирменной айдентикой\n• Самоклеящиеся стикеры, этикетки и маркировка для пищевой продукции\n• Корпоративный текстиль, фартуки, мерч и оформление транспорта доставки`,
                    fontSize: 8.5,
                    color: darkInk,
                    lineHeight: 1.35,
                  },
                  {
                    text: '\nДля расчета тиража и индивидуального коммерческого предложения свяжитесь с отделом продаж:\n' +
                      [phone1, phone2, email].filter(Boolean).join('  |  '),
                    fontSize: 8.5,
                    bold: true,
                    color: darkGreen,
                  },
                ],
              },
            ],
          ],
        },
        layout: 'noBorders',
      }
    );
  }

  // Remove the trailing empty pageBreak if present
  if (docContent.length > 0) {
    const last = docContent[docContent.length - 1];
    if (typeof last === 'object' && last && 'pageBreak' in last) {
      delete last.pageBreak;
    }
  }

  const document: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [28, 20, 28, 32],
    language: lang === 'uz' ? 'uz-UZ' : lang === 'en' ? 'en-US' : 'ru-RU',
    info: {
      title: `${companyName} — Каталог продукции${withPrices ? ' (Прайс-лист)' : ''}`,
      author: companyName,
      subject: 'Оптовый каталог и комплексные поставки для HoReCa',
      creator: 'Commerce Platform',
    },
    defaultStyle: { font: 'Roboto', fontSize: 8.5, color: darkInk, lineHeight: 1.2 },
    footer: footerBuilder,
    content: docContent,
  };

  const pdf = pdfMake.createPdf(document);
  return Buffer.from(await pdf.getBuffer());
}
