import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/context/LanguageContext';
import { RequestCartProvider } from '@/context/RequestCartContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { AuthProvider } from '@/context/AuthContext';

import { ToastProvider } from '@/context/ToastContext';

export const metadata: Metadata = {
  title: 'SANPACK — Упаковка, расходные материалы и продукты для HoReCa',
  description: 'Комплексный B2B-каталог и поставщик упаковочных материалов, перчаток, фольги, плёнок, бакалеи и полиграфии для бизнеса в Узбекистане',
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
        <AuthProvider>
          <LanguageProvider>
            <FavoritesProvider>
              <RequestCartProvider>
                <ToastProvider>
                  {children}
                </ToastProvider>
              </RequestCartProvider>
            </FavoritesProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
