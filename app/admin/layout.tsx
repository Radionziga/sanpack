import { AuthProvider } from '@/context/AuthContext';
import { SanpackTheme } from '@/components/theme/SanpackTheme';
import { getPublicSettings } from '@/lib/repositories/serverCatalogRepository';
import type { SiteSettings } from '@/types';

const neutralAdminDesign: SiteSettings['design'] = {
  designVersion: 2,
  primaryColor: '#334155',
  secondaryColor: '#E2E8F0',
  borderRadius: 8,
  themeMode: 'light',
  fontPair: 'neutral',
};

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  let design = neutralAdminDesign;
  try {
    design = (await getPublicSettings()).design;
  } catch (error) {
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
      console.error('Public settings could not be loaded for the admin theme.', error);
    }
  }
  return (
    <SanpackTheme design={design}>
      <AuthProvider>{children}</AuthProvider>
    </SanpackTheme>
  );
}
