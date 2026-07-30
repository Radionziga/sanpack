import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'SANPACK — комплексные поставки для HoReCa',
    template: '%s | SANPACK',
  },
  description:
    'Упаковка, расходные материалы, продукты и брендирование для бизнеса в Узбекистане.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body suppressHydrationWarning className="bg-[#F5F7F6] text-[#18231E] antialiased">
        {children}
      </body>
    </html>
  );
}
