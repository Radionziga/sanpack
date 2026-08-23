import 'server-only';

import pdfMake from 'pdfmake';
import robotoFonts from 'pdfmake/fonts/Roboto';
import path from 'node:path';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { InternalDocumentSettings, RequestOrder } from '@/types';
import { formatOrderAmount, getOrderAmountOrZero } from '@/lib/orders/orderAmounts';

pdfMake.addFonts(robotoFonts);
const allowedFontPaths = new Set(
  Object.values(robotoFonts.Roboto).map((fontPath) => path.resolve(String(fontPath)))
);
pdfMake.setLocalAccessPolicy((filePath) => allowedFontPaths.has(path.resolve(filePath)));
pdfMake.setUrlAccessPolicy(() => false);

export async function createInternalDocument(
  order: RequestOrder,
  settings: InternalDocumentSettings
) {
  const hasKnownPrices = order.items.some((item) => item.price !== undefined);
  const tableRows: Content[][] = order.items.map((item, index) => [
    { text: String(index + 1), alignment: 'center' },
    { stack: [
      { text: item.productTitleRu, bold: true },
      { text: [item.variantTitleRu, item.sku ? `Арт.: ${item.sku}` : ''].filter(Boolean).join(' · '), color: '#66716B', fontSize: 8 },
    ] },
    { text: item.unit, alignment: 'center' },
    { text: String(item.quantity), alignment: 'right' },
    { text: formatOrderAmount(item.price), alignment: 'right' },
    { text: formatOrderAmount(item.price === undefined ? undefined : item.price * item.quantity), alignment: 'right', bold: true },
  ]);

  const document: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [36, 40, 36, 54],
    language: 'ru-RU',
    info: {
      title: `${settings.documentTitle} ${order.requestNumber}`,
      author: settings.companyName,
      subject: 'Внутренний документ по заказу',
      creator: 'Commerce Platform',
    },
    defaultStyle: { font: 'Roboto', fontSize: 9, color: '#17201C', lineHeight: 1.25 },
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: settings.footerText || '', color: '#7B847F', fontSize: 7 },
        { text: `${currentPage} / ${pageCount}`, alignment: 'right', color: '#7B847F', fontSize: 7 },
      ],
      margin: [36, 16, 36, 0],
    }),
    content: [
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: settings.companyName, fontSize: 18, bold: true, color: '#0F6E43' },
              settings.legalName ? { text: settings.legalName, margin: [0, 3, 0, 0], color: '#4D5953' } : { text: '' },
              { text: [settings.taxId ? `СТИР: ${settings.taxId}` : '', settings.phone || '', settings.email || ''].filter(Boolean).join(' · '), margin: [0, 3, 0, 0], color: '#66716B', fontSize: 8 },
              settings.address ? { text: settings.address, margin: [0, 2, 0, 0], color: '#66716B', fontSize: 8 } : { text: '' },
            ],
          },
          {
            width: 190,
            stack: [
              { text: settings.documentTitle, alignment: 'right', fontSize: 16, bold: true },
              { text: `№ ${settings.numberPrefix}-${order.requestNumber}`, alignment: 'right', margin: [0, 4, 0, 0], color: '#0F6E43', bold: true },
              { text: `Редакция ${order.revision || 1}`, alignment: 'right', margin: [0, 2, 0, 0], color: '#66716B', fontSize: 8 },
              { text: new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long' }).format(new Date()), alignment: 'right', margin: [0, 2, 0, 0], color: '#66716B', fontSize: 8 },
            ],
          },
        ],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 523, y2: 0, lineColor: '#C7D0CB', lineWidth: 1 }], margin: [0, 18, 0, 16] },
      {
        columns: [
          { width: 70, text: 'Покупатель', color: '#66716B', bold: true },
          { width: '*', stack: [
            { text: order.contactName, bold: true },
            { text: order.phone, margin: [0, 2, 0, 0], color: '#4D5953' },
          ] },
          { width: 70, text: 'Заказ', color: '#66716B', bold: true },
          { width: 120, stack: [
            { text: order.requestNumber, bold: true },
            { text: new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(order.createdAt)), margin: [0, 2, 0, 0], color: '#4D5953', fontSize: 8 },
          ] },
        ],
        margin: [0, 0, 0, 18],
      },
      order.deliveryAddress || order.deliveryDate || order.deliveryWindow ? {
        table: {
          widths: [70, '*'],
          body: [
            [{ text: 'Доставка', color: '#66716B', bold: true }, { text: [order.deliveryDate || '', order.deliveryWindow?.replace('-', '–') || ''].filter(Boolean).join(' · ') || 'Не указана' }],
            [{ text: 'Адрес', color: '#66716B', bold: true }, { text: order.deliveryAddress || 'Не указан' }],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 16],
      } : { text: '' },
      {
        table: {
          headerRows: 1,
          widths: [22, '*', 42, 48, 72, 76],
          body: [
            [
              { text: '№', style: 'tableHeader', alignment: 'center' },
              { text: 'Товар', style: 'tableHeader' },
              { text: 'Ед.', style: 'tableHeader', alignment: 'center' },
              { text: 'Кол-во', style: 'tableHeader', alignment: 'right' },
              { text: 'Цена', style: 'tableHeader', alignment: 'right' },
              { text: 'Сумма', style: 'tableHeader', alignment: 'right' },
            ],
            ...tableRows,
          ],
        },
        layout: {
          hLineColor: '#D6DDD9', vLineColor: '#D6DDD9',
          hLineWidth: () => 0.5, vLineWidth: () => 0.5,
          paddingLeft: () => 6, paddingRight: () => 6,
          paddingTop: () => 7, paddingBottom: () => 7,
          fillColor: (rowIndex) => rowIndex === 0 ? '#EAF2ED' : null,
        },
      },
      {
        columns: [
          { width: '*', text: order.notes ? `Комментарий: ${order.notes}` : '', margin: [0, 12, 20, 0], color: '#4D5953', fontSize: 8 },
          {
            width: 220,
            table: {
              widths: ['*', 90],
              body: [
                [{ text: 'Товары', color: '#66716B' }, { text: hasKnownPrices ? formatOrderAmount(getOrderAmountOrZero(order.subtotal)) : 'По запросу', alignment: 'right' }],
                [{ text: 'Корректировка', color: '#66716B' }, { text: formatOrderAmount(getOrderAmountOrZero(order.adjustment)), alignment: 'right' }],
                [{ text: 'Итого', bold: true, fontSize: 11 }, { text: hasKnownPrices ? formatOrderAmount(getOrderAmountOrZero(order.total)) : 'По запросу', bold: true, fontSize: 11, alignment: 'right', color: '#0F6E43' }],
              ],
            },
            layout: 'noBorders',
            margin: [0, 10, 0, 0],
          },
        ],
      },
      settings.bankDetails ? { text: `Реквизиты: ${settings.bankDetails}`, margin: [0, 18, 0, 0], color: '#4D5953', fontSize: 8 } : { text: '' },
      settings.showSignatureFields ? {
        columns: [
          { width: '*', stack: [{ text: 'Отпустил', bold: true }, { text: '________________ / ____________________', margin: [0, 22, 0, 0], color: '#66716B', fontSize: 8 }] },
          { width: '*', stack: [{ text: 'Получил', bold: true }, { text: '________________ / ____________________', margin: [0, 22, 0, 0], color: '#66716B', fontSize: 8 }] },
          settings.showStampPlaceholder ? { width: 72, text: 'М.П.', alignment: 'center', margin: [0, 24, 0, 0], color: '#66716B' } : { width: 0, text: '' },
        ],
        columnGap: 24,
        margin: [0, 34, 0, 0],
      } : { text: '' },
    ],
    styles: {
      tableHeader: { bold: true, fontSize: 8, color: '#304139' },
    },
  };

  return pdfMake.createPdf(document).getBuffer();
}
