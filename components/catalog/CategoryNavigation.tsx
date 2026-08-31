'use client';

import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { getCategoryBreadcrumbs, getCategoryDepth, getCategoryPath, getVisibleCategories } from '@/lib/catalog/categoryHierarchy';
import { getCategoryArtwork } from '@/lib/catalog/categoryArtwork';
import type { Category } from '@/types';

export function CatalogBreadcrumbs({ category, categories, productTitle }: { category?: Category | null; categories: Category[]; productTitle?: string }) {
  const { t, getLocalizedText } = useLanguage();
  const crumbs = category ? getCategoryBreadcrumbs(category, categories) : [];
  return <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-xs text-[var(--sp-ink-tertiary)]">
    <Link href="/" className="hover:text-[var(--sp-brand)]">{t('home')}</Link>
    <ChevronRight className="size-3.5" aria-hidden="true" />
    <Link href="/catalog" className="hover:text-[var(--sp-brand)]">{t('catalog')}</Link>
    {crumbs.map(({ category: node, href }, index) => <span key={node.id} className="contents">
      <ChevronRight className="size-3.5" aria-hidden="true" />
      {!productTitle && index === crumbs.length - 1
        ? <span aria-current="page" className="font-semibold text-[var(--sp-ink)]">{getLocalizedText(node.titleRu, node.titleUz, node.titleEn, node.titleZh)}</span>
        : <Link href={href} className="hover:text-[var(--sp-brand)]">{getLocalizedText(node.titleRu, node.titleUz, node.titleEn, node.titleZh)}</Link>}
    </span>)}
    {productTitle ? <><ChevronRight className="size-3.5" aria-hidden="true" /><span aria-current="page">{productTitle}</span></> : null}
  </nav>;
}

export function SubcategoryNavigation({ category, categories }: { category: Category; categories: Category[] }) {
  const { language, getLocalizedText } = useLanguage();
  const visible = getVisibleCategories(categories);
  const branch = getCategoryDepth(category.id, categories) === 2
    ? visible.find((node) => node.id === category.parentId) : category;
  const children = visible.filter((node) => node.parentId === branch?.id).sort((a, b) => a.sortOrder - b.sortOrder);
  if (!branch || children.length === 0) return null;
  const copy = { ru: { all: 'Все', label: 'Разделы категории' }, uz: { all: 'Barchasi', label: 'Kategoriya bo‘limlari' }, en: { all: 'All', label: 'Category sections' }, zh: { all: '全部', label: '分类栏目' } }[language];
  return <nav aria-label={copy.label} className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-2">
    {[branch, ...children].map((node, index) => {
      const active = node.id === category.id;
      const image = index ? getCategoryArtwork(node) : undefined;
      return <Link key={node.id} href={getCategoryPath(node, categories)} aria-current={active ? 'page' : undefined}
        className={`flex min-h-11 shrink-0 items-center gap-2 rounded-[var(--sp-radius-control)] border px-3 py-2 text-sm font-semibold ${active ? 'border-[var(--sp-brand)] bg-[var(--sp-brand)] text-[var(--sp-on-brand)]' : 'border-[var(--sp-line)] bg-[var(--sp-surface)] text-[var(--sp-ink)] hover:border-[var(--sp-brand)]'}`}>
        {image ? <Image src={image} alt="" width={28} height={28} className="size-7 rounded object-contain" /> : null}
        {index ? getLocalizedText(node.titleRu, node.titleUz, node.titleEn, node.titleZh) : copy.all}
      </Link>;
    })}
  </nav>;
}
