'use client';

import { FilePlus2, Plus, Trash2 } from 'lucide-react';
import type { Product, ProductDocument, WholesaleTier } from '@/types';

interface ProductCmsFieldsProps {
  product: Partial<Product>;
  products: Product[];
  onChange: (patch: Partial<Product>) => void;
}

export function ProductCmsFields({ product, products, onChange }: ProductCmsFieldsProps) {
  const tiers = product.wholesaleTiers || [];
  const documents = product.documents || [];
  const availableRelations = products.filter((candidate) => candidate.id !== product.id);

  const updateTier = (index: number, patch: Partial<WholesaleTier>) => {
    onChange({ wholesaleTiers: tiers.map((tier, tierIndex) => tierIndex === index ? { ...tier, ...patch } : tier) });
  };
  const updateDocument = (index: number, patch: Partial<ProductDocument>) => {
    onChange({ documents: documents.map((document, documentIndex) => documentIndex === index ? { ...document, ...patch } : document) });
  };
  const toggleRelation = (field: 'relatedProductIds' | 'accessoryProductIds', id: string) => {
    const current = product[field] || [];
    onChange({ [field]: current.includes(id) ? current.filter((value) => value !== id) : [...current, id] });
  };

  return <>
    <section className="admin-panel space-y-5 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="admin-section-heading">Оптовые цены</h4>
          <p className="admin-section-description">Цена уровня применяется от указанного количества единиц продажи.</p>
        </div>
        <button type="button" onClick={() => onChange({ wholesaleTiers: [...tiers, { minQuantity: 1, price: product.price || 0 }] })} className="admin-button-secondary"><Plus className="size-4" aria-hidden="true" />Добавить уровень</button>
      </div>
      {tiers.length === 0 ? <p className="admin-panel-muted p-4 text-xs text-[var(--sp-ink-tertiary)]">Оптовые уровни не настроены.</p> : (
        <div className="space-y-3">{tiers.map((tier, index) => <div key={index} className="admin-panel-muted grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[8rem_10rem_repeat(4,minmax(0,1fr))_2.5rem]">
          <label className="admin-field-label">От количества<input type="number" min="0.001" step="any" value={tier.minQuantity} onChange={(event) => updateTier(index, { minQuantity: Number(event.target.value) || 1 })} className="admin-control mt-1.5 font-normal" /></label>
          <label className="admin-field-label">Цена<input type="number" min="0" value={tier.price} onChange={(event) => updateTier(index, { price: Number(event.target.value) || 0 })} className="admin-control mt-1.5 font-normal" /></label>
          {(['Ru', 'Uz', 'En', 'Zh'] as const).map((suffix) => {
            const field = `name${suffix}` as const;
            return <label key={field} className="admin-field-label">Подпись {suffix.toUpperCase()}<input value={tier[field] || ''} onChange={(event) => updateTier(index, { [field]: event.target.value })} className="admin-control mt-1.5 font-normal" /></label>;
          })}
          <button type="button" onClick={() => onChange({ wholesaleTiers: tiers.filter((_, tierIndex) => tierIndex !== index) })} className="admin-icon-button self-end text-[var(--sp-danger)]" aria-label="Удалить оптовый уровень"><Trash2 className="size-4" /></button>
        </div>)}</div>
      )}
    </section>

    <section className="admin-panel space-y-5 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h4 className="admin-section-heading">Документы товара</h4><p className="admin-section-description">Сертификаты, спецификации и PDF, которые видит покупатель на странице товара.</p></div>
        <button type="button" onClick={() => onChange({ documents: [...documents, { id: `doc-${crypto.randomUUID()}`, titleRu: '', titleUz: '', url: '', type: 'pdf' }] })} className="admin-button-secondary"><FilePlus2 className="size-4" aria-hidden="true" />Добавить документ</button>
      </div>
      {documents.map((document, index) => <div key={document.id} className="admin-panel-muted space-y-3 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{(['Ru', 'Uz', 'En', 'Zh'] as const).map((suffix) => {
          const field = `title${suffix}` as const;
          return <label key={field} className="admin-field-label">Название {suffix.toUpperCase()}<input required={suffix === 'Ru' || suffix === 'Uz'} value={document[field] || ''} onChange={(event) => updateDocument(index, { [field]: event.target.value })} className="admin-control mt-1.5 font-normal" /></label>;
        })}</div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_8rem_8rem_2.5rem]">
          <label className="admin-field-label">URL файла<input required value={document.url} onChange={(event) => updateDocument(index, { url: event.target.value })} placeholder="/documents/file.pdf или https://…" className="admin-control mt-1.5 font-normal" /></label>
          <label className="admin-field-label">Тип<input required value={document.type} onChange={(event) => updateDocument(index, { type: event.target.value })} className="admin-control mt-1.5 font-normal" /></label>
          <label className="admin-field-label">Размер<input value={document.size || ''} onChange={(event) => updateDocument(index, { size: event.target.value })} placeholder="1,2 МБ" className="admin-control mt-1.5 font-normal" /></label>
          <button type="button" onClick={() => onChange({ documents: documents.filter((_, documentIndex) => documentIndex !== index) })} className="admin-icon-button self-end text-[var(--sp-danger)]" aria-label="Удалить документ"><Trash2 className="size-4" /></button>
        </div>
      </div>)}
      {documents.length === 0 ? <p className="admin-panel-muted p-4 text-xs text-[var(--sp-ink-tertiary)]">Документы не добавлены.</p> : null}
    </section>

    <section className="admin-panel space-y-5 p-5 md:p-6">
      <div><h4 className="admin-section-heading">Связанные и сопутствующие товары</h4><p className="admin-section-description">Явный список имеет приоритет над автоматической подборкой из той же категории.</p></div>
      <div className="grid gap-5 lg:grid-cols-2">{([
        ['relatedProductIds', 'Похожие товары'],
        ['accessoryProductIds', 'Сопутствующие товары'],
      ] as const).map(([field, label]) => <fieldset key={field} className="admin-panel-muted max-h-64 overflow-y-auto p-4">
        <legend className="px-1 text-xs font-bold text-[var(--sp-ink)]">{label}</legend>
        <div className="mt-2 space-y-1">{availableRelations.map((candidate) => <label key={candidate.id} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-[var(--sp-radius-control-inner)] px-2 text-xs hover:bg-[var(--sp-surface)]">
          <input type="checkbox" checked={(product[field] || []).includes(candidate.id)} onChange={() => toggleRelation(field, candidate.id)} className="size-4 accent-[var(--sp-brand)]" />
          <span className="min-w-0 flex-1 truncate">{candidate.titleRu}</span><span className="font-mono text-[10px] text-[var(--sp-ink-tertiary)]">{candidate.sku}</span>
        </label>)}</div>
      </fieldset>)}</div>
    </section>

    <section className="admin-panel space-y-5 p-5 md:p-6">
      <div><h4 className="admin-section-heading">SEO товара</h4><p className="admin-section-description">Необязательные метаданные. При пустом значении storefront использует название и краткое описание товара.</p></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{(['Ru', 'Uz', 'En', 'Zh'] as const).map((suffix) => <label key={`seo-title-${suffix}`} className="admin-field-label">SEO title {suffix.toUpperCase()}<input value={product.seo?.[`title${suffix}`] || ''} onChange={(event) => onChange({ seo: { ...product.seo, [`title${suffix}`]: event.target.value } })} className="admin-control mt-1.5 font-normal" /></label>)}</div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{(['Ru', 'Uz', 'En', 'Zh'] as const).map((suffix) => <label key={`seo-description-${suffix}`} className="admin-field-label">SEO description {suffix.toUpperCase()}<textarea rows={3} value={product.seo?.[`description${suffix}`] || ''} onChange={(event) => onChange({ seo: { ...product.seo, [`description${suffix}`]: event.target.value } })} className="admin-control mt-1.5 font-normal" /></label>)}</div>
    </section>
  </>;
}
