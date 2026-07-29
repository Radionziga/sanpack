'use client';

import React, { useState } from 'react';
import { Attribute, Product } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { Filter, RotateCcw, Check, ChevronDown, ChevronUp } from 'lucide-react';

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
}: FilterSidebarProps) {
  const { t, getLocalizedText } = useLanguage();

  // State to track collapsed attribute groups (key -> boolean)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // State to track expanded "show more" options per group
  const [showAllOptions, setShowAllOptions] = useState<Record<string, boolean>>({});

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
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
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-5">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 text-sm font-bold text-[#18231E]">
          <Filter className="w-4 h-4 text-[#006F3C]" />
          <span>{t('filterTitle')}</span>
          {activeAttributeCount > 0 && (
            <span className="bg-[#EAF5EF] text-[#006F3C] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#006F3C]/20">
              {activeAttributeCount}
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{t('resetFilters')}</span>
          </button>
        )}
      </div>

      {/* Quick Toggles */}
      <div className="space-y-2">
        <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/80 cursor-pointer hover:bg-slate-100/80 transition-colors">
          <span className="text-xs font-semibold text-[#18231E]">
            {t('inStockOnly')}
          </span>
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => onInStockChange(e.target.checked)}
            className="w-4 h-4 accent-[#006F3C] rounded-md cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/80 cursor-pointer hover:bg-slate-100/80 transition-colors">
          <span className="text-xs font-semibold text-[#18231E]">
            {t('ownProductionOnly')}
          </span>
          <input
            type="checkbox"
            checked={ownProductionOnly}
            onChange={(e) => onOwnProductionChange(e.target.checked)}
            className="w-4 h-4 accent-[#006F3C] rounded-md cursor-pointer"
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
              const valStr = String(val);
              optionCounts[valStr] = (optionCounts[valStr] || 0) + 1;
            }
          });

          // 2. Build complete list of available options
          const predefined = attr.options || [];
          const predefinedValues = new Set(predefined.map((o) => o.value));
          const combinedOptions: { value: string; labelRu: string; labelUz: string; count: number }[] = [];

          predefined.forEach((opt) => {
            const count = optionCounts[opt.value] || 0;
            combinedOptions.push({
              value: opt.value,
              labelRu: opt.labelRu,
              labelUz: opt.labelUz,
              count,
            });
          });

          Object.keys(optionCounts).forEach((valStr) => {
            if (!predefinedValues.has(valStr)) {
              combinedOptions.push({
                value: valStr,
                labelRu: valStr,
                labelUz: valStr,
                count: optionCounts[valStr],
              });
            }
          });

          const currentVals = selectedFilters[attr.key] || [];
          const visibleOptions = combinedOptions.filter(
            (opt) => opt.count > 0 || currentVals.includes(opt.value) || products.length === 0
          );

          if (visibleOptions.length === 0) return null;

          const isCollapsed = collapsedGroups[attr.key] === true && currentVals.length === 0;
          const isShowMore = showAllOptions[attr.key] === true;
          const INITIAL_LIMIT = 5;
          const displayedOptions = isShowMore ? visibleOptions : visibleOptions.slice(0, INITIAL_LIMIT);
          const hasMore = visibleOptions.length > INITIAL_LIMIT;

          return (
            <div key={attr.id} className="border-t border-slate-100 pt-3">
              {/* Accordion Group Header */}
              <button
                type="button"
                onClick={() => toggleGroupCollapse(attr.key)}
                className="w-full flex items-center justify-between text-left py-1 text-xs font-bold text-[#18231E] hover:text-[#006F3C] transition-colors select-none group"
              >
                <div className="flex items-center gap-2">
                  <span className="uppercase tracking-wider">
                    {getLocalizedText(attr.titleRu, attr.titleUz)}
                  </span>
                  {attr.unit && (
                    <span className="text-[10px] text-slate-400 font-normal lowercase">
                      ({attr.unit})
                    </span>
                  )}
                  {currentVals.length > 0 && (
                    <span className="bg-[#006F3C] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                      {currentVals.length}
                    </span>
                  )}
                </div>

                <div className="text-slate-400 group-hover:text-[#006F3C] transition-transform duration-200">
                  {isCollapsed ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </div>
              </button>

              {/* Collapsible Content */}
              {!isCollapsed && (
                <div className="mt-2 space-y-1.5 transition-all">
                  {displayedOptions.map((opt) => {
                    const isSelected = currentVals.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        onClick={() => handleToggleValue(attr.key, opt.value)}
                        className="flex items-center justify-between text-xs text-[#18231E] hover:text-[#006F3C] cursor-pointer select-none py-1 px-1 rounded-lg hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                              isSelected
                                ? 'bg-[#006F3C] border-[#006F3C] text-white shadow-2xs'
                                : 'border-slate-300 bg-white group-hover:border-[#006F3C]'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span
                            className={`truncate ${
                              isSelected ? 'font-semibold text-[#006F3C]' : 'text-slate-700'
                            }`}
                          >
                            {getLocalizedText(opt.labelRu, opt.labelUz)}
                          </span>
                        </div>

                        {opt.count > 0 && (
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0">
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
                      className="text-[11px] font-semibold text-[#006F3C] hover:underline pt-1 block"
                    >
                      {isShowMore
                        ? 'Скрыть'
                        : `+ Показать ещё ${visibleOptions.length - INITIAL_LIMIT}`}
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
