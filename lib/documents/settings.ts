import 'server-only';

import type { InternalDocumentSettings } from '@/types';
import { getAdminDb } from '@/lib/firebase/admin';
import { initialSiteSettings } from '@/lib/seedData';

export const defaultDocumentSettings: InternalDocumentSettings = {
  documentTitle: 'Внутренняя накладная',
  companyName: initialSiteSettings.company.name,
  legalName: '',
  taxId: '',
  address: initialSiteSettings.contacts.addressRu,
  phone: initialSiteSettings.contacts.phone1,
  email: initialSiteSettings.contacts.email,
  bankDetails: '',
  logoUrl: initialSiteSettings.company.logo,
  footerText: 'Внутренний документ. Не является счётом-фактурой или фискальным документом.',
  numberPrefix: 'НК',
  showSignatureFields: true,
  showStampPlaceholder: true,
};

export async function getInternalDocumentSettings() {
  const snapshot = await getAdminDb().collection('backofficeSettings').doc('documents').get();
  return snapshot.exists
    ? { ...defaultDocumentSettings, ...snapshot.data() } as InternalDocumentSettings
    : defaultDocumentSettings;
}

