import type { Language, SiteSettings } from '@/types';

type Contacts = SiteSettings['contacts'];

export function contactPhoneHref(phone: string) {
  return `tel:${phone.replace(/(?!^\+)[^\d]/g, '')}`;
}

export function localizedContact(
  contacts: Contacts,
  field: 'address' | 'workingHours' | 'city',
  language: Language
) {
  const suffix = language === 'uz' ? 'Uz' : language === 'en' ? 'En' : 'Ru';
  const fallbackKey = `${field}Ru` as keyof Contacts;
  const localizedKey = `${field}${suffix}` as keyof Contacts;
  return String(contacts[localizedKey] || contacts[fallbackKey] || '');
}
