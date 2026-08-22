import { AuthProvider } from '@/context/AuthContext';
import { StorefrontTheme } from '@/components/theme/StorefrontTheme';
import { getPublicSettings } from '@/lib/repositories/serverCatalogRepository';
import type { SiteSettings } from '@/types';
import '../globals.css';
import { storefrontFontVariables } from '../fonts';

export const metadata = {
  title: 'Панель управления',
  robots: { index: false, follow: false },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
} as const;

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
    <html lang="ru" className={storefrontFontVariables}>
      <body suppressHydrationWarning>
        <StorefrontTheme design={design}>
          <AuthProvider>{children}</AuthProvider>
        </StorefrontTheme>
      </body>
    </html>
  );
}
