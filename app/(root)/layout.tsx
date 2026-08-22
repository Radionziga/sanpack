import type { Metadata, Viewport } from 'next';
import '../globals.css';
import { storefrontFontVariables } from '../fonts';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Интернет-магазин',
  description: 'Онлайн-каталог товаров и услуг.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RedirectRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={storefrontFontVariables}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
