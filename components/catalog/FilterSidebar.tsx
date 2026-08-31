'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Filter, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Attribute, Product } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { localizeSeedAttributeValue } from '@/lib/catalog/seedProductLocalization';
import {
  buildAttributeFacet,
  isAttributeFilterActive,
  type AttributeFilterSelection,
  type CatalogAttributeFilters,
} from '@/lib/catalog/productFacets';

interface FilterSidebarProps {
  attributes: Attribute[];
  products?: Product[];
  selectedFilters: CatalogAttributeFilters;
  onFilterChange: (key: string, selection: AttributeFilterSelection | undefined) => void;
  inStockOnly: boolean;
  onInStockChange: (value: boolean) => void;
  ownProductionOnly: boolean;
  onOwnProductionChange: (value: boolean) => void;
  onReset: () => void;
  embedded?: boolean;
  hideHeader?: boolean;
}

function optionalNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isCssColor(value: string) {
  return /^#[0-9a-f]{3,8}$/i.test(value) || /^(?:rgb|hsl)a?\(/i.test(value);
}

export function FilterSidebar({
  attributes,
  products = [],
  selectedFilters,
  onFilterChange,
  inStockOnly,
  onInStockChange,
  ownProductionOnly,
  onOwnProductionChange,
  onReset,
  embedded = false,
  hideHeader = false,
}: FilterSidebarProps) {
  const t = useTranslations('catalogFilters');
  const { getLocalizedText, language } = useLanguage();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [showAllOptions, setShowAllOptions] = useState<Record<string, boolean>>({});
  const facets = useMemo(
    () => attributes.map((attribute) => buildAttributeFacet(attribute, products)),
    [attributes, products],
  );
  const activeAttributeCount = Object.values(selectedFilters).filter(isAttributeFilterActive).length;
  const showOwnProduction = products.some((product) => product.ownProduction);
  const hasActiveFilters = inStockOnly || ownProductionOnly || activeAttributeCount > 0;
  const yesLabel = language === 'zh' ? '是' : language === 'uz' ? 'Ha' : language === 'en' ? 'Yes' : 'Да';

  return (
    <div className={embedded ? 'space-y-5' : 'space-y-5 rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-5 shadow-[var(--sp-shadow-soft)]'}>
      {!hideHeader ? (
        <div className="flex items-center justify-between border-b border-[var(--sp-line-soft)] pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--sp-ink)]">
            <Filter className="size-4 text-[var(--sp-brand)]" aria-hidden="true" />
            <span>{t('title')}</span>
            {activeAttributeCount > 0 ? <span className="rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-brand-soft)] px-2 py-0.5 text-[10px] text-[var(--sp-brand)]">{activeAttributeCount}</span> : null}
          </div>
          {hasActiveFilters ? (
            <button type="button" onClick={onReset} className="flex min-h-9 items-center gap-1 rounded-[var(--sp-radius-control-inner)] px-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-50">
              <RotateCcw className="size-3" aria-hidden="true" />{t('reset')}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="flex min-h-11 cursor-pointer items-center justify-between rounded-[var(--sp-radius-control)] border border-[var(--sp-line-soft)] bg-[var(--sp-surface-inset)] p-2.5">
          <span className="text-xs font-medium text-[var(--sp-ink)]">{t('inStockOnly')}</span>
          <input type="checkbox" checked={inStockOnly} onChange={(event) => onInStockChange(event.target.checked)} className="size-4 accent-[var(--sp-brand)]" />
        </label>
        {showOwnProduction ? (
          <label className="flex min-h-11 cursor-pointer items-center justify-between rounded-[var(--sp-radius-control)] border border-[var(--sp-line-soft)] bg-[var(--sp-surface-inset)] p-2.5">
            <span className="text-xs font-medium text-[var(--sp-ink)]">{t('ownProductionOnly')}</span>
            <input type="checkbox" checked={ownProductionOnly} onChange={(event) => onOwnProductionChange(event.target.checked)} className="size-4 accent-[var(--sp-brand)]" />
          </label>
        ) : null}
      </div>

      <div className="space-y-3">
        {facets.map((facet) => {
          const { attribute } = facet;
          const current = selectedFilters[attribute.key];
          const active = isAttributeFilterActive(current);
          const isRange = attribute.type === 'number' || attribute.type === 'range';
          const isBoolean = attribute.type === 'boolean';
          if (isRange && facet.minimum === undefined && facet.maximum === undefined) return null;
          if (!isRange && !isBoolean && facet.options.length === 0) return null;

          const isExpanded = expandedGroups[attribute.key] === true || active;
          const selectedOptions = current?.kind === 'options' ? current.values : [];
          const predefined = attribute.options || [];
          const counts = new Map(facet.options.map((option) => [option.value.toLocaleLowerCase(), option.count]));
          const predefinedValues = new Set(predefined.map((option) => option.value.toLocaleLowerCase()));
          const options = [
            ...predefined.map((option) => ({ ...option, count: counts.get(option.value.toLocaleLowerCase()) || 0 })),
            ...facet.options.filter((option) => !predefinedValues.has(option.value.toLocaleLowerCase())).map((option) => ({
              value: option.value,
              labelRu: option.value,
              labelUz: localizeSeedAttributeValue(option.value, 'uz'),
              labelEn: localizeSeedAttributeValue(option.value, 'en'),
              labelZh: localizeSeedAttributeValue(option.value, 'zh'),
              count: option.count,
            })),
          ].filter((option) => option.count > 0 || selectedOptions.includes(option.value));
          const showAll = showAllOptions[attribute.key] === true;
          const displayedOptions = showAll ? options : options.slice(0, 5);

          return (
            <section key={attribute.id} className="border-t border-[var(--sp-line-soft)] pt-3">
              <button type="button" onClick={() => setExpandedGroups((state) => ({ ...state, [attribute.key]: !isExpanded }))} aria-expanded={isExpanded} className="group flex min-h-11 w-full items-center justify-between py-2 text-left text-xs font-semibold text-[var(--sp-ink)] hover:text-[var(--sp-brand)]">
                <span className="flex items-center gap-2">
                  {getLocalizedText(attribute.titleRu, attribute.titleUz, attribute.titleEn, attribute.titleZh)}
                  {attribute.unit ? <small className="font-normal text-[var(--sp-ink-muted)]">({localizeSeedAttributeValue(attribute.unit, language)})</small> : null}
                  {active ? <span className="size-2 rounded-full bg-[var(--sp-brand)]" aria-hidden="true" /> : null}
                </span>
                {isExpanded ? <ChevronUp className="size-4" aria-hidden="true" /> : <ChevronDown className="size-4" aria-hidden="true" />}
              </button>

              {isExpanded ? (
                <div className="mt-2 space-y-1.5">
                  {isRange ? (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[10px] font-semibold text-[var(--sp-ink-secondary)]">{t('rangeMin')}
                        <input type="number" step="any" min={facet.minimum} max={facet.maximum} value={current?.kind === 'range' ? current.min ?? '' : ''} placeholder={String(facet.minimum)} onChange={(event) => {
                          const min = optionalNumber(event.target.value);
                          const max = current?.kind === 'range' ? current.max : undefined;
                          onFilterChange(attribute.key, min === undefined && max === undefined ? undefined : { kind: 'range', min, max });
                        }} className="admin-control mt-1 min-h-10 text-xs font-normal" />
                      </label>
                      <label className="text-[10px] font-semibold text-[var(--sp-ink-secondary)]">{t('rangeMax')}
                        <input type="number" step="any" min={facet.minimum} max={facet.maximum} value={current?.kind === 'range' ? current.max ?? '' : ''} placeholder={String(facet.maximum)} onChange={(event) => {
                          const max = optionalNumber(event.target.value);
                          const min = current?.kind === 'range' ? current.min : undefined;
                          onFilterChange(attribute.key, min === undefined && max === undefined ? undefined : { kind: 'range', min, max });
                        }} className="admin-control mt-1 min-h-10 text-xs font-normal" />
                      </label>
                    </div>
                  ) : isBoolean ? (
                    <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-[var(--sp-radius-control-inner)] px-1 text-xs">
                      <input type="checkbox" checked={current?.kind === 'boolean'} onChange={(event) => onFilterChange(attribute.key, event.target.checked ? { kind: 'boolean', value: true } : undefined)} className="size-4 accent-[var(--sp-brand)]" />
                      <span>{yesLabel}</span>
                    </label>
                  ) : (
                    <>
                      {displayedOptions.map((option) => {
                        const selected = selectedOptions.includes(option.value);
                        return (
                          <label key={option.value} className="group flex min-h-9 cursor-pointer items-center justify-between rounded-[var(--sp-radius-control-inner)] px-1 py-1 text-xs hover:bg-[var(--sp-surface-inset)]">
                            <span className="flex min-w-0 items-center gap-2">
                              <input type="checkbox" checked={selected} onChange={() => {
                                const values = selected ? selectedOptions.filter((value) => value !== option.value) : [...selectedOptions, option.value];
                                onFilterChange(attribute.key, values.length ? { kind: 'options', values } : undefined);
                              }} className="peer sr-only" />
                              <span className={`flex size-4 shrink-0 items-center justify-center rounded-[var(--sp-radius-control-inner)] border ${selected ? 'border-[var(--sp-brand)] bg-[var(--sp-brand)] text-[var(--sp-on-brand)]' : 'border-[var(--sp-line-strong)]'}`}>{selected ? <Check className="size-3 stroke-[3]" aria-hidden="true" /> : null}</span>
                              {attribute.type === 'color' && isCssColor(option.value) ? <span className="size-4 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: option.value }} aria-hidden="true" /> : null}
                              <span className={selected ? 'truncate font-semibold text-[var(--sp-brand)]' : 'truncate text-[var(--sp-ink-secondary)]'}>{getLocalizedText(option.labelRu, option.labelUz, option.labelEn, option.labelZh)}</span>
                            </span>
                            <span className="rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-surface-inset)] px-1.5 py-0.5 text-[10px] text-[var(--sp-ink-muted)]">{option.count}</span>
                          </label>
                        );
                      })}
                      {options.length > 5 ? <button type="button" onClick={() => setShowAllOptions((state) => ({ ...state, [attribute.key]: !showAll }))} className="min-h-9 px-1 text-[11px] font-medium text-[var(--sp-brand)] hover:underline">{showAll ? t('showLess') : `+ ${t('showMore')} ${options.length - 5}`}</button> : null}
                    </>
                  )}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
