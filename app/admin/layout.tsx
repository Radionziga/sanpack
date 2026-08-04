import { AuthProvider } from '@/context/AuthContext';
import { SanpackTheme } from '@/components/theme/SanpackTheme';
import { getPublicSettings } from '@/lib/repositories/serverCatalogRepository';

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getPublicSettings();
  return (
    <SanpackTheme design={settings.design}>
      <AuthProvider>{children}</AuthProvider>
    </SanpackTheme>
  );
}
