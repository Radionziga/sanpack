'use client';

import type { Attribute } from '@/types';
import { CustomSelect } from '@/components/ui/CustomSelect';
import {
  attributeValueAsList,
  attributeValueAsText,
  parseAttributeList,
  parseAttributeNumber,
  type ProductAttributeValue,
} from '@/lib/catalog/attributeValues';

interface ProductAttributeFieldProps {
  attribute: Attribute;
  value?: ProductAttributeValue;
  onChange: (value: ProductAttributeValue | undefined) => void;
}

export function ProductAttributeField({
  attribute,
  value,
  onChange,
}: ProductAttributeFieldProps) {
  const textValue = attributeValueAsText(value);
  const options = attribute.options || [];
  const optionValues = new Set(options.map((option) => option.value));
  const selectedValues = attributeValueAsList(value);
  const customValues = selectedValues.filter((item) => !optionValues.has(item));

  if (attribute.type === 'select' && options.length > 0) {
    const isKnown = options.some((option) => option.value === textValue);
    return (
      <div className="space-y-1">
        <CustomSelect
          value={isKnown ? textValue : textValue ? '__custom__' : ''}
          onChange={(nextValue) => {
            if (nextValue !== '__custom__') onChange(nextValue || undefined);
          }}
          options={[
            { value: '', label: 'Не выбрано' },
            ...options.map((option) => ({ value: option.value, label: option.labelRu })),
            { value: '__custom__', label: 'Своё значение…' },
          ]}
          size="sm"
          ariaLabel={attribute.titleRu}
        />
        {!isKnown ? (
          <input
            type="text"
            value={textValue}
            onChange={(event) => onChange(event.target.value || undefined)}
            aria-label={`${attribute.titleRu}: своё значение`}
            className="admin-control min-h-10 text-xs font-semibold text-[var(--sp-brand)]"
          />
        ) : null}
      </div>
    );
  }

  if (attribute.type === 'multiselect') {
    return (
      <fieldset className="space-y-2">
        <legend className="sr-only">{attribute.titleRu}</legend>
        {options.length ? (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {options.map((option) => (
              <label key={option.value} className="flex min-h-9 cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option.value)}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...selectedValues, option.value]
                      : selectedValues.filter((item) => item !== option.value);
                    onChange(next.length ? [...new Set(next)] : undefined);
                  }}
                  className="size-4 accent-[var(--sp-brand)]"
                />
                <span>{option.labelRu}</span>
              </label>
            ))}
          </div>
        ) : null}
        <input
          key={customValues.join('\u0000')}
          type="text"
          defaultValue={customValues.join(', ')}
          onBlur={(event) => {
            const knownSelected = selectedValues.filter((item) => optionValues.has(item));
            const next = [...knownSelected, ...parseAttributeList(event.target.value)];
            onChange(next.length ? [...new Set(next)] : undefined);
          }}
          placeholder="Другие значения через запятую"
          aria-label={`${attribute.titleRu}: другие значения`}
          className="admin-control min-h-10 text-xs"
        />
      </fieldset>
    );
  }

  if (attribute.type === 'number' || attribute.type === 'range') {
    return (
      <input
        type="number"
        step="any"
        value={typeof value === 'number' ? value : textValue}
        onChange={(event) => onChange(parseAttributeNumber(event.target.value))}
        placeholder={`Введите ${attribute.titleRu.toLowerCase()}`}
        aria-label={attribute.titleRu}
        className="admin-control min-h-10 text-xs"
      />
    );
  }

  if (attribute.type === 'boolean') {
    const checked = value === true || value === 'true';
    return (
      <label className="flex min-h-10 cursor-pointer items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="size-4 accent-[var(--sp-brand)]"
        />
        <span>{checked ? 'Да' : 'Нет'}</span>
      </label>
    );
  }

  if (attribute.type === 'color') {
    const colorValue = /^#[0-9a-f]{6}$/i.test(textValue) ? textValue : '#000000';
    return (
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-2">
        <input
          type="color"
          value={colorValue}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${attribute.titleRu}: выбор цвета`}
          className="admin-control h-10 min-h-10 cursor-pointer p-1"
        />
        <input
          type="text"
          value={textValue}
          onChange={(event) => onChange(event.target.value || undefined)}
          placeholder="#000000"
          aria-label={`${attribute.titleRu}: значение цвета`}
          className="admin-control min-h-10 text-xs"
        />
      </div>
    );
  }

  return (
    <input
      type="text"
      value={textValue}
      onChange={(event) => onChange(event.target.value || undefined)}
      placeholder={`Введите ${attribute.titleRu.toLowerCase()}`}
      aria-label={attribute.titleRu}
      className="admin-control min-h-10 text-xs"
    />
  );
}
