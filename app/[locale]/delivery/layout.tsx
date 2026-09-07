import type { Language } from '@/types';
import { getStaticRouteMetadata } from '@/lib/seo/serverMetadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return getStaticRouteMetadata('delivery', (await params).locale as Language);
}
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return children; }
