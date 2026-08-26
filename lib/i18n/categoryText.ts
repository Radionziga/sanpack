import type { Category, Language } from '@/types';

const chineseCategoryTitles: Record<string, string> = {
  'upakovka-i-rashodnye-materialy': '包装与耗材',
  upakovka: '包装与耗材',
  'musornye-pakety': '垃圾袋',
  'otryvnye-pakety': '点断式连卷袋',
  'pakety-mayka': '背心袋',
  'vakuumnye-i-pizza-pakety': '真空袋与披萨袋',
  'upakovka-dlya-produktov': '食品包装耗材',
  perchatki: '手套',
  'hozyaystvennye-tovary': '清洁与家居用品',
  khoztovary: '清洁与家居用品',
  'bumazhnaya-produktsiya': '纸制品',
  'produkty-pitaniya': '食品',
  govyadina: '牛肉',
  kuritsa: '鸡肉',
  'kurinye-yaytsa': '鸡蛋',
  yaytsa: '鸡蛋',
  muka: '面粉',
  sahar: '糖',
  sakhar: '糖',
  'krupy-i-bobovye': '谷物与豆类',
  'rastitelnye-i-frityurnye-masla': '植物油与煎炸油',
  'rastitelnye-masla': '植物油与煎炸油',
  frukty: '水果',
  yagody: '浆果',
  ovoshchi: '蔬菜',
  'svezhaya-zelen-novagreen': 'Novagreen 新鲜香草',
  'svezhaya-zelen': 'Novagreen 新鲜香草',
  mikrozelen: '微型蔬菜',
  'molochnaya-produktsiya': '乳制品',
};

export function getCategoryTitle(
  category: Pick<Category, 'slug' | 'titleZh'>,
  language: Language,
  fallback: string,
) {
  if (language !== 'zh') return fallback;
  return category.titleZh?.trim() || chineseCategoryTitles[category.slug] || fallback;
}
