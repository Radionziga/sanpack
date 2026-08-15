'use client';

import { useEffect, useRef } from 'react';
import { useFieldArray, useForm, useWatch, type Control, type UseFormRegister } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';

import type { ProductVariant, StockStatus } from '@/types';

interface VariantAttributeRow {
  key: string;
  value: string;
}

interface VariantFormRow {
  id: string;
  sku: string;
  titleRu: string;
  titleUz: string;
  titleEn: string;
  price?: number;
  stockStatus: StockStatus;
  minQuantity?: number;
  quantityStep?: number;
  attributes: VariantAttributeRow[];
}

interface VariantEditorForm {
  variants: VariantFormRow[];
}

interface ProductVariantsEditorProps {
  initialVariants: ProductVariant[];
  currency: string;
  onChange: (variants: ProductVariant[]) => void;
}

const stockOptions: Array<{ value: StockStatus; label: string }> = [
  { value: 'in_stock', label: 'В наличии' },
  { value: 'on_order', label: 'Под заказ' },
  { value: 'out_of_stock', label: 'Нет в наличии' },
  { value: 'temporarily_unavailable', label: 'Временно недоступен' },
  { value: 'discontinued', label: 'Снят с продажи' },
];

function createVariantId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `variant-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `variant-${Date.now().toString(36)}`;
}

function toFormVariant(variant: ProductVariant): VariantFormRow {
  return {
    id: variant.id,
    sku: variant.sku,
    titleRu: variant.titleRu,
    titleUz: variant.titleUz,
    titleEn: variant.titleEn || '',
    price: variant.price,
    stockStatus: variant.stockStatus,
    minQuantity: variant.minQuantity ?? variant.minOrder,
    quantityStep: variant.quantityStep,
    attributes: Object.entries(variant.attributes || {}).map(([key, value]) => ({ key, value })),
  };
}

function toProductVariant(variant: VariantFormRow, original?: ProductVariant): ProductVariant {
  const attributes = Object.fromEntries(
    (variant.attributes || [])
      .map(({ key, value }) => [key.trim(), value.trim()] as const)
      .filter(([key]) => Boolean(key)),
  );

  return {
    ...original,
    id: variant.id.trim(),
    sku: variant.sku.trim(),
    titleRu: variant.titleRu.trim(),
    titleUz: variant.titleUz.trim() || variant.titleRu.trim(),
    titleEn: variant.titleEn.trim() || undefined,
    price: Number.isFinite(variant.price) ? variant.price : undefined,
    stockStatus: variant.stockStatus,
    attributes,
    minQuantity: Number.isFinite(variant.minQuantity) ? variant.minQuantity : undefined,
    quantityStep: Number.isFinite(variant.quantityStep) ? variant.quantityStep : undefined,
  };
}

function optionalNumber(value: unknown) {
  return value === '' || value === null || value === undefined ? undefined : Number(value);
}

function VariantAttributesEditor({
  variantIndex,
  control,
  register,
}: {
  variantIndex: number;
  control: Control<VariantEditorForm>;
  register: UseFormRegister<VariantEditorForm>;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `variants.${variantIndex}.attributes`,
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[var(--sp-ink)]">Отличительные характеристики</p>
          <p className="mt-1 text-[10px] leading-4 text-[var(--sp-ink-secondary)]">
            Например: вес — 1 кг, размер — 90×60 см, цвет — зелёный.
          </p>
        </div>
        <button
          type="button"
          onClick={() => append({ key: '', value: '' })}
          className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] px-3 py-2 text-xs font-semibold text-[var(--sp-ink)] transition-colors hover:border-[var(--sp-brand)] hover:text-[var(--sp-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sp-brand)] focus-visible:ring-offset-2"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Добавить характеристику
        </button>
      </div>

      {fields.length ? (
        <div className="space-y-2">
          {fields.map((field, attributeIndex) => (
            <div key={field.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_44px] gap-2">
              <input
                type="text"
                maxLength={160}
                placeholder="weight или size"
                aria-label={`Ключ характеристики варианта ${attributeIndex + 1}`}
                className="admin-control font-normal"
                {...register(`variants.${variantIndex}.attributes.${attributeIndex}.key`)}
              />
              <input
                type="text"
                maxLength={500}
                placeholder="1 кг или 90×60 см"
                aria-label={`Значение характеристики варианта ${attributeIndex + 1}`}
                className="admin-control font-normal"
                {...register(`variants.${variantIndex}.attributes.${attributeIndex}.value`)}
              />
              <button
                type="button"
                onClick={() => remove(attributeIndex)}
                className="flex size-11 cursor-pointer items-center justify-center rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] text-[var(--sp-danger)] transition-colors hover:bg-red-500/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sp-brand)] focus-visible:ring-offset-2"
                aria-label={`Удалить характеристику ${attributeIndex + 1}`}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ProductVariantsEditor({ initialVariants, currency, onChange }: ProductVariantsEditorProps) {
  const onChangeRef = useRef(onChange);
  const initialVariantsRef = useRef(new Map(initialVariants.map((variant) => [variant.id, variant])));
  const lastValueRef = useRef(JSON.stringify(initialVariants));

  const { control, register } = useForm<VariantEditorForm>({
    defaultValues: { variants: initialVariants.map(toFormVariant) },
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'variants' });
  const variants = useWatch({ control, name: 'variants' });

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const nextVariants = (variants || []).map((variant) => (
      toProductVariant(variant, initialVariantsRef.current.get(variant.id))
    ));
    const serialized = JSON.stringify(nextVariants);
    if (serialized === lastValueRef.current) return;
    lastValueRef.current = serialized;
    onChangeRef.current(nextVariants);
  }, [variants]);

  return (
    <section className="admin-panel space-y-5 p-5 md:p-6">
      <div className="flex flex-col gap-4 border-b border-[var(--sp-line)] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="admin-section-heading">Варианты товара</h4>
          <p className="admin-section-description max-w-2xl">
            Объединяйте разные веса, размеры или исполнения в одной карточке товара. Покупатель должен выбрать вариант перед добавлением в корзину.
          </p>
        </div>
        <button
          type="button"
          onClick={() => append({
            id: createVariantId(),
            sku: '',
            titleRu: '',
            titleUz: '',
            titleEn: '',
            price: undefined,
            stockStatus: 'in_stock',
            minQuantity: 1,
            quantityStep: 1,
            attributes: [{ key: '', value: '' }],
          })}
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--sp-brand-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sp-brand)] focus-visible:ring-offset-2"
        >
          <Plus className="size-4" aria-hidden="true" />
          Добавить вариант
        </button>
      </div>

      {fields.length ? (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <article key={field.id} className="rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-4 md:p-5">
              <div className="flex items-center justify-between gap-4">
                <h5 className="text-sm font-bold text-[var(--sp-ink)]">Вариант {index + 1}</h5>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[var(--sp-radius-control)] px-3 text-xs font-semibold text-[var(--sp-danger)] transition-colors hover:bg-red-500/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sp-brand)] focus-visible:ring-offset-2"
                  aria-label={`Удалить вариант ${index + 1}`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Удалить
                </button>
              </div>

              <input type="hidden" {...register(`variants.${index}.id`)} />
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="font-bold text-[var(--sp-ink)]">
                  Название варианта (RU) *
                  <input
                    type="text"
                    required
                    maxLength={160}
                    placeholder="1 кг или 90×60 см"
                    className="admin-control mt-1.5 font-normal"
                    {...register(`variants.${index}.titleRu`, { required: true })}
                  />
                </label>
                <label className="font-bold text-[var(--sp-ink)]">
                  Название варианта (UZ)
                  <input
                    type="text"
                    maxLength={160}
                    placeholder="Если отличается от русского"
                    className="admin-control mt-1.5 font-normal"
                    {...register(`variants.${index}.titleUz`)}
                  />
                </label>
                <label className="font-bold text-[var(--sp-ink)]">
                  Название варианта (EN)
                  <input
                    type="text"
                    maxLength={160}
                    className="admin-control mt-1.5 font-normal"
                    {...register(`variants.${index}.titleEn`)}
                  />
                </label>
                <label className="font-bold text-[var(--sp-ink)]">
                  Артикул варианта *
                  <input
                    type="text"
                    required
                    maxLength={160}
                    placeholder="SP-PRODUCT-1KG"
                    className="admin-control mt-1.5 font-normal"
                    {...register(`variants.${index}.sku`, { required: true })}
                  />
                </label>
                <label className="font-bold text-[var(--sp-ink)]">
                  Цена, {currency || 'UZS'}
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="admin-control mt-1.5 font-normal"
                    {...register(`variants.${index}.price`, { setValueAs: optionalNumber })}
                  />
                </label>
                <label className="font-bold text-[var(--sp-ink)]">
                  Доступность
                  <select className="admin-control mt-1.5 cursor-pointer font-normal" {...register(`variants.${index}.stockStatus`)}>
                    {stockOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="font-bold text-[var(--sp-ink)]">
                  Минимальное количество
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    className="admin-control mt-1.5 font-normal"
                    {...register(`variants.${index}.minQuantity`, { setValueAs: optionalNumber })}
                  />
                </label>
                <label className="font-bold text-[var(--sp-ink)]">
                  Шаг количества
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    className="admin-control mt-1.5 font-normal"
                    {...register(`variants.${index}.quantityStep`, { setValueAs: optionalNumber })}
                  />
                </label>
              </div>

              <div className="mt-5 border-t border-[var(--sp-line)] pt-4">
                <VariantAttributesEditor variantIndex={index} control={control} register={register} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-panel-muted p-4">
          <p className="text-xs font-semibold text-[var(--sp-ink)]">У товара пока один вариант исполнения.</p>
          <p className="mt-1 text-[10px] leading-4 text-[var(--sp-ink-secondary)]">
            Добавляйте варианты только когда покупателю действительно нужно выбрать вес, размер, цвет или другое исполнение.
          </p>
        </div>
      )}
    </section>
  );
}
