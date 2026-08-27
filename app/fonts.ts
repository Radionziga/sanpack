import { Inter, Manrope, Roboto_Slab } from 'next/font/google';

// Alternative typefaces are bundled by Next.js and served from the application.
// They are exposed as variables so an admin choice can switch the design without a redeploy.
export const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
  preload: false,
});

export const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
  display: 'swap',
});

export const robotoSlab = Roboto_Slab({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-roboto-slab',
  display: 'swap',
  preload: false,
});

export const storefrontFontVariables = `${inter.variable} ${manrope.variable} ${robotoSlab.variable}`;
