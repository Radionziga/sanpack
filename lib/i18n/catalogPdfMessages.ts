import enMessages from '@/messages/en.json';
import ruMessages from '@/messages/ru.json';
import uzMessages from '@/messages/uz.json';
import zhMessages from '@/messages/zh.json';
import type { Language } from '@/types';

export type CatalogPdfMessages = typeof ruMessages.catalogPdf;

const catalogPdfMessages: Record<Language, CatalogPdfMessages> = {
  ru: ruMessages.catalogPdf,
  uz: uzMessages.catalogPdf,
  en: enMessages.catalogPdf,
  zh: zhMessages.catalogPdf,
};

export function getCatalogPdfMessages(language: Language): CatalogPdfMessages {
  return catalogPdfMessages[language];
}

export function formatCatalogPdfMessage(
  message: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    message,
  );
}
