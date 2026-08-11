import { ClientPartner, Banner, SiteSettings } from '@/types';
import { catalogV14Attributes, catalogV14Categories, catalogV14Products } from '@/lib/catalog/sanpackCatalogV14';

export const initialSiteSettings: SiteSettings = {
  company: {
    name: 'SANPACK',
    logo: '/logo-sanpack.svg',
    favicon: '/favicon.ico',
    descriptionRu: 'Комплексный поставщик упаковки, расходных материалов и продуктов питания для HoReCa',
    descriptionUz: 'HoReCa uchun qadoqlash, sarf materiallari va oziq-ovqat mahsulotlarining kompleks yetkazib beruvchisi',
  },
  contacts: {
    phone1: '+998 99 851 05 06',
    phone2: '+998 99 232 39 99',
    email: 'info@sanpack.uz',
    addressRu: 'г. Ташкент, Сергелийский р-н, ул. Янги Сергели, 14А',
    addressUz: 'Toshkent sh., Sergeli t-ni, Yangi Sergeli ko‘ch., 14A',
    workingHoursRu: 'Пн — Сб: 09:00 - 18:00',
    workingHoursUz: 'Du — Sha: 09:00 - 18:00',
    telegram: 'https://t.me/sanpack_uz',
    whatsapp: 'https://wa.me/998998510506',
    cityRu: 'Ташкент',
    cityUz: 'Toshkent',
  },
  salesMode: 'request_only',
  commerce: {
    currency: 'UZS',
    checkoutFields: {
      name: true,
      phone: true,
    },
  },
  locale: {
    defaultLanguage: 'ru',
    supportedLanguages: ['ru'],
  },
  design: {
    designVersion: 2,
    primaryColor: '#0F6E43',
    secondaryColor: '#DCE9AF',
    borderRadius: 8,
    themeMode: 'light',
    fontPair: 'brand',
  },
  seo: {
    defaultTitleRu: 'SANPACK — Упаковка, расходные материалы и продукты для HoReCa в Ташкенте',
    defaultTitleUz: 'SANPACK — Toshkentda HoReCa uchun qadoqlash, sarf materiallari va oziq-ovqat',
    defaultDescriptionRu: 'Производство и оптовые поставки мусорных мешков, пакетов, перчаток, фольги, стрейч-пленки, бакалеи и полиграфии для ресторанов, отелей и бизнеса.',
    defaultDescriptionUz: 'Restoranlar, mehmonxonalar va biznes uchun chiqindi qoplari, paketlar, qo‘lqoplar, folga, strech plyonka va oziq-ovqat mahsulotlarini ulgurji yetkazib berish.',
  },
  modules: {
    bagDesigner: {
      enabled: true,
    },
  },
};

export const initialCategories = catalogV14Categories;

export const initialAttributes = catalogV14Attributes;

export const initialClients: ClientPartner[] = [
  { id: 'cl-1', name: 'BON! Cafe Français', logo: '/catalog/extracted_p2_img1.jpeg', category: 'cafe', sortOrder: 1 },
  { id: 'cl-2', name: 'Safia Cafe & Bakery', logo: '/catalog/extracted_p2_img2.jpeg', category: 'bakery', sortOrder: 2 },
  { id: 'cl-3', name: 'Apex Pizza', logo: '/catalog/extracted_p2_img3.jpeg', category: 'restaurant', sortOrder: 3 },
  { id: 'cl-4', name: 'Breadly', logo: '/catalog/extracted_p2_img4.jpeg', category: 'bakery', sortOrder: 4 },
  { id: 'cl-5', name: 'Чайкоф', logo: '/catalog/extracted_p2_img5.jpeg', category: 'cafe', sortOrder: 5 },
  { id: 'cl-6', name: 'Mövenpick Tashkent', logo: '/catalog/extracted_p2_img6.jpeg', category: 'hotel', sortOrder: 6 },
  { id: 'cl-7', name: 'Broccoli', logo: '/catalog/extracted_p2_img7.jpeg', category: 'restaurant', sortOrder: 7 },
  { id: 'cl-8', name: 'Gumma Xonim', logo: '/catalog/extracted_p2_img8.jpeg', category: 'cafe', sortOrder: 8 },
  { id: 'cl-9', name: 'DoubleTree by Hilton', logo: '/catalog/extracted_p2_img9.jpeg', category: 'hotel', sortOrder: 9 },
  { id: 'cl-10', name: 'Pie Republic', logo: '/catalog/extracted_p2_img10.jpeg', category: 'cafe', sortOrder: 10 },
  { id: 'cl-11', name: 'Sariq Bola Pizza', logo: '/catalog/extracted_p2_img11.jpeg', category: 'restaurant', sortOrder: 11 },
  { id: 'cl-12', name: 'Positano', logo: '/catalog/extracted_p2_img12.jpeg', category: 'restaurant', sortOrder: 12 },
  { id: 'cl-13', name: 'Tarelka Bistro', logo: '/catalog/extracted_p2_img13.jpeg', category: 'restaurant', sortOrder: 13 },
  { id: 'cl-14', name: 'Benedict Cafe', logo: '/catalog/extracted_p2_img14.jpeg', category: 'cafe', sortOrder: 14 },
  { id: 'cl-15', name: 'Shavi', logo: '/catalog/extracted_p2_img15.jpeg', category: 'restaurant', sortOrder: 15 },
  { id: 'cl-16', name: 'Unique', logo: '/catalog/extracted_p3_img1.jpeg', category: 'restaurant', sortOrder: 16 },
  { id: 'cl-17', name: 'Arboroma', logo: '/catalog/extracted_p3_img3.jpeg', category: 'restaurant', sortOrder: 17 },
  { id: 'cl-18', name: 'Zarqand', logo: '/catalog/extracted_p3_img5.jpeg', category: 'bakery', sortOrder: 18 },
  { id: 'cl-19', name: 'Big Chefs', logo: '/catalog/extracted_p3_img11.jpeg', category: 'restaurant', sortOrder: 19 },
  { id: 'cl-20', name: 'Minor Somsa', logo: '/catalog/extracted_p3_img15.jpeg', category: 'restaurant', sortOrder: 20 },
];

export const initialBanners: Banner[] = [
  {
    id: 'ban-1',
    titleRu: 'Собственное производство мусорных мешков и пакетов',
    titleUz: 'Chiqindi qoplari va paketlar o‘z ishlab chiqarishimiz',
    subtitleRu: 'Прямые оптовые поставки по Ташкенту и Узбекистану от производителя SANPACK',
    subtitleUz: 'SANPACK ishlab chiqaruvchisidan Toshkent va O‘zbekiston bo‘ylab ulgurji yetkazib berish',
    imageDesktop: '/promo/sanpack-supply-desktop.webp',
    imageMobile: '/promo/sanpack-supply-mobile.webp',
    buttonTextRu: 'Перейти в каталог',
    buttonTextUz: 'Katalogni ko‘rish',
    buttonTextEn: 'View catalog',
    link: '/catalog',
    sortOrder: 1,
    active: true,
  },
];

export const initialProducts = catalogV14Products;
