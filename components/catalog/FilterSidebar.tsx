'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Attribute, Product } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { Filter, RotateCcw, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { localizeSeedAttributeValue } from '@/lib/catalog/seedProductLocalization';

interface FilterSidebarProps {
  attributes: Attribute[];
  products?: Product[];
  selectedFilters: Record<string, string[]>;
  onFilterChange: (key: string, values: string[]) => void;
  inStockOnly: boolean;
  onInStockChange: (val: boolean) => void;
  ownProductionOnly: boolean;
  onOwnProductionChange: (val: boolean) => void;
  onReset: () => void;
  embedded?: boolean;
  hideHeader?: boolean;
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

  // Keep the long attribute list compact until a user needs a group.
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // State to track expanded "show more" options per group
  const [showAllOptions, setShowAllOptions] = useState<Record<string, boolean>>({});

  const toggleGroup = (key: string, isExpanded: boolean) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !isExpanded,
    }));
  };

  const toggleShowMore = (key: string) => {
    setShowAllOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleToggleValue = (key: string, val: string) => {
    const current = selectedFilters[key] || [];
    if (current.includes(val)) {
      onFilterChange(
        key,
        current.filter((v) => v !== val)
      );
    } else {
      onFilterChange(key, [...current, val]);
    }
  };

  const activeAttributeCount = Object.values(selectedFilters).filter((arr) => arr.length > 0).length;
  const hasActiveFilters =
    inStockOnly || ownProductionOnly || activeAttributeCount > 0;

  return (
    <div className={embedded ? 'space-y-5' : 'space-y-5 rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-5 shadow-[var(--sp-shadow-soft)]'}>
      {/* Sidebar Header */}
      {!hideHeader ? <div className="flex items-center justify-between border-b border-[var(--sp-line-soft)] pb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--sp-ink)]">
          <Filter className="size-4 text-[var(--sp-brand)]" aria-hidden="true" />
          <span>{t('title')}</span>
          {activeAttributeCount > 0 && (
            <span className="rounded-[var(--sp-radius-control-inner)] border border-[color-mix(in_srgb,var(--sp-brand)_22%,var(--sp-line))] bg-[var(--sp-brand-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--sp-brand)]">
              {activeAttributeCount}
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="flex min-h-9 cursor-pointer items-center gap-1 rounded-[var(--sp-radius-control-inner)] px-2 text-[11px] font-semibold text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-800"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            <span>{t('reset')}</span>
          </button>
        )}
      </div> : null}

      {/* Quick Toggles */}
      <div className="space-y-2">
        <label className="flex min-h-11 cursor-pointer items-center justify-between rounded-[var(--sp-radius-control)] border border-[var(--sp-line-soft)] bg-[var(--sp-surface-inset)] p-2.5 transition-colors hover:border-[var(--sp-line)]">
          <span className="text-xs font-medium text-[var(--sp-ink)]">
            {t('inStockOnly')}
          </span>
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => onInStockChange(e.target.checked)}
            className="size-4 cursor-pointer accent-[var(--sp-brand)]"
          />
        </label>

        <label className="flex min-h-11 cursor-pointer items-center justify-between rounded-[var(--sp-radius-control)] border border-[var(--sp-line-soft)] bg-[var(--sp-surface-inset)] p-2.5 transition-colors hover:border-[var(--sp-line)]">
          <span className="text-xs font-medium text-[var(--sp-ink)]">
            {t('ownProductionOnly')}
          </span>
          <input
            type="checkbox"
            checked={ownProductionOnly}
            onChange={(e) => onOwnProductionChange(e.target.checked)}
            className="size-4 cursor-pointer accent-[var(--sp-brand)]"
          />
        </label>
      </div>

      {/* Dynamic Collapsible Attributes Filters */}
      <div className="space-y-3">
        {attributes.map((attr) => {
          if (!attr.filterable) return null;

          // 1. Gather all unique options and their counts from products
          const optionCounts: Record<string, number> = {};
          products.forEach((p) => {
            const val = p.attributes?.[attr.key];
            if (val !== undefined && val !== null) {
              const values = Array.isArray(val) ? val : [val];
              for (const item of values) {
                const valStr = String(item);
                optionCounts[valStr] = (optionCounts[valStr] || 0) + 1;
              }
            }
          });

          // 2. Build complete list of available options
          const predefined = attr.options || [];
          const predefinedValues = new Set(predefined.map((o) => o.value));
          const combinedOptions: {
            value: string;
            labelRu: string;
            labelUz: string;
            labelEn?: string;
            labelZh?: string;
            count: number;
          }[] = [];

          predefined.forEach((opt) => {
            const count = optionCounts[opt.value] || 0;
            combinedOptions.push({
              value: opt.value,
              labelRu: opt.labelRu,
              labelUz: opt.labelUz,
              labelEn: opt.labelEn,
              labelZh: opt.labelZh,
              count,
            });
          });

          Object.keys(optionCounts).forEach((valStr) => {
            if (!predefinedValues.has(valStr)) {
              combinedOptions.push({
                value: valStr,
                labelRu: valStr,
                labelUz: localizeSeedAttributeValue(valStr, 'uz'),
                labelEn: localizeSeedAttributeValue(valStr, 'en'),
                labelZh: localizeSeedAttributeValue(valStr, 'zh'),
                count: optionCounts[valStr],
              });
            }
          });

          const currentVals = selectedFilters[attr.key] || [];
          const visibleOptions = combinedOptions.filter(
            (opt) => opt.count > 0 || currentVals.includes(opt.value)
          );

          if (visibleOptions.length === 0) return null;

          const isExpanded = expandedGroups[attr.key] === true || currentVals.length > 0;
          const isShowMore = showAllOptions[attr.key] === true;
          const INITIAL_LIMIT = 5;
          const displayedOptions = isShowMore ? visibleOptions : visibleOptions.slice(0, INITIAL_LIMIT);
          const hasMore = visibleOptions.length > INITIAL_LIMIT;

          return (
            <div key={attr.id} className="border-t border-[var(--sp-line-soft)] pt-3">
              {/* Accordion Group Header */}
              <button
                type="button"
                onClick={() => toggleGroup(attr.key, isExpanded)}
                aria-expanded={isExpanded}
                className="group flex min-h-11 w-full select-none items-center justify-between py-2 text-left text-xs font-semibold text-[var(--sp-ink)] transition-colors hover:text-[var(--sp-brand)]"
              >
                <div className="flex items-center gap-2">
                  <span>
                    {getLocalizedText(attr.titleRu, attr.titleUz, attr.titleEn, attr.titleZh)}
                  </span>
                  {attr.unit && (
                    <span className="text-[10px] font-normal lowercase text-[var(--sp-ink-muted)]">
                      ({localizeSeedAttributeValue(attr.unit, language)})
                    </span>
                  )}
                  {currentVals.length > 0 && (
                    <span className="flex min-h-4 min-w-4 shrink-0 items-center justify-center rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-brand)] px-1 text-[9px] font-semibold tabular-nums text-[var(--sp-on-brand)]">
                      {currentVals.length}
                    </span>
                  )}
                </div>

                <div className="text-[var(--sp-ink-muted)] transition-transform duration-200 group-hover:text-[var(--sp-brand)]">
                  {isExpanded ? (
                    <ChevronUp className="size-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="size-4" aria-hidden="true" />
                  )}
                </div>
              </button>

              {/* Collapsible Content */}
              {isExpanded && (
                <div className="mt-2 space-y-1.5">
                  {displayedOptions.map((opt) => {
                    const isSelected = currentVals.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className="group flex min-h-9 cursor-pointer select-none items-center justify-between rounded-[var(--sp-radius-control-inner)] px-1 py-1 text-xs text-[var(--sp-ink)] transition-colors hover:bg-[var(--sp-surface-inset)] hover:text-[var(--sp-brand)]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleValue(attr.key, opt.value)}
                            className="peer sr-only"
                          />
                          <div
                            aria-hidden="true"
                            className={`flex size-4 shrink-0 items-center justify-center rounded-[var(--sp-radius-control-inner)] border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--sp-focus)] ${
                              isSelected
                                ? 'border-[var(--sp-brand)] bg-[var(--sp-brand)] text-[var(--sp-on-brand)] shadow-[var(--sp-shadow-soft)]'
                                : 'border-[var(--sp-line-strong)] bg-[var(--sp-surface)] group-hover:border-[var(--sp-brand)]'
                            }`}
                          >
                            {isSelected && <Check className="size-3 stroke-[3]" />}
                          </div>
                          <span
                            className={`truncate ${
                              isSelected ? 'font-semibold text-[var(--sp-brand)]' : 'text-[var(--sp-ink-secondary)]'
                            }`}
                          >
                            {getLocalizedText(opt.labelRu, opt.labelUz, opt.labelEn, opt.labelZh)}
                          </span>
                        </div>

                        {opt.count > 0 && (
                          <span className="shrink-0 rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-surface-inset)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--sp-ink-muted)]">
                            {opt.count}
                          </span>
                        )}
                      </label>
                    );
                  })}

                  {/* Show More / Less button */}
                  {hasMore && (
                    <button
                      type="button"
                      onClick={() => toggleShowMore(attr.key)}
                      className="block min-h-9 cursor-pointer rounded-[var(--sp-radius-control-inner)] px-1 pt-1 text-[11px] font-medium text-[var(--sp-brand)] hover:underline"
                    >
                      {isShowMore
                        ? t('showLess')
                        : `+ ${t('showMore')} ${visibleOptions.length - INITIAL_LIMIT}`}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
