'use client';

import React, { useState, useEffect } from 'react';
import { AdminRepository } from '@/lib/repositories/adminRepository';
import { Attribute, Category, AttributeOption, AttributeType } from '@/types';
import { Button, CustomInput, Badge, CustomSelect } from '@/components/ui';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AiTranslateButton } from '@/components/admin/AiTranslateButton';
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  Filter,
  Tag,
  Layers,
  Sparkles,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react';

const attributeTypeOptions: Array<{ value: AttributeType; label: string }> = [
  { value: 'text', label: 'Текстовое поле свободного ввода' },
  { value: 'number', label: 'Числовое значение' },
  { value: 'select', label: 'Один вариант из списка' },
  { value: 'multiselect', label: 'Несколько вариантов из списка' },
  { value: 'range', label: 'Числовой диапазон' },
  { value: 'boolean', label: 'Да / нет' },
  { value: 'color', label: 'Цвет' },
];

const attributeTypeLabels = Object.fromEntries(
  attributeTypeOptions.map(({ value, label }) => [value, label]),
) as Record<AttributeType, string>;

function isAttributeType(value: string): value is AttributeType {
  return attributeTypeOptions.some((option) => option.value === value);
}

export default function AdminAttributesPage() {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAttr, setEditingAttr] = useState<Attribute | null>(null);

  // Form State
  const [key, setKey] = useState('');
  const [titleRu, setTitleRu] = useState('');
  const [titleUz, setTitleUz] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [type, setType] = useState<AttributeType>('select');
  const [unit, setUnit] = useState('');
  const [required, setRequired] = useState(false);
  const [filterable, setFilterable] = useState(true);
  const [cardVisible, setCardVisible] = useState(true);
  const [productVisible, setProductVisible] = useState(true);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [options, setOptions] = useState<AttributeOption[]>([]);

  // Option input temp state
  const [newOptValue, setNewOptValue] = useState('');
  const [newOptRu, setNewOptRu] = useState('');
  const [newOptUz, setNewOptUz] = useState('');
  const [newOptEn, setNewOptEn] = useState('');

  const [notification, setNotification] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsModalOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isModalOpen]);

  async function loadData() {
    setLoading(true);
    setLoadError('');
    try {
      const [attrs, cats] = await Promise.all([
        AdminRepository.getAttributes(),
        AdminRepository.getCategories(),
      ]);
      setAttributes(attrs.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
      setCategories(cats);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Не удалось загрузить характеристики.');
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg: string) {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }

  const handleOpenCreateModal = () => {
    setSaveError('');
    setEditingAttr(null);
    setKey('');
    setTitleRu('');
    setTitleUz('');
    setTitleEn('');
    setType('select');
    setUnit('');
    setRequired(false);
    setFilterable(true);
    setCardVisible(true);
    setProductVisible(true);
    setSelectedCategoryIds([]);
    setOptions([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (attr: Attribute) => {
    setSaveError('');
    setEditingAttr(attr);
    setKey(attr.key);
    setTitleRu(attr.titleRu);
    setTitleUz(attr.titleUz);
    setTitleEn(attr.titleEn || '');
    setType(attr.type);
    setUnit(attr.unit || '');
    setRequired(attr.required ?? false);
    setFilterable(attr.filterable);
    setCardVisible(attr.cardVisible ?? true);
    setProductVisible(attr.productVisible ?? true);
    setSelectedCategoryIds(attr.categoryIds || []);
    setOptions(attr.options || []);
    setIsModalOpen(true);
  };

  const handleAddOption = () => {
    if (!newOptValue.trim() || !newOptRu.trim()) return;
    const newOpt: AttributeOption = {
      value: newOptValue.trim(),
      labelRu: newOptRu.trim(),
      labelUz: newOptUz.trim() || newOptRu.trim(),
      labelEn: newOptEn.trim() || undefined,
    };
    setOptions([...options, newOpt]);
    setNewOptValue('');
    setNewOptRu('');
    setNewOptUz('');
    setNewOptEn('');
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSaveAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    if (!key.trim() || !titleRu.trim()) {
      setSaveError('Укажите внутреннее имя и название характеристики.');
      return;
    }

    const formattedKey = key
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!formattedKey) {
      setSaveError('Внутреннее имя должно содержать латинские буквы или цифры.');
      return;
    }

    const attrData: Partial<Attribute> = {
      id: editingAttr ? editingAttr.id : 'attr-' + Date.now(),
      key: formattedKey,
      titleRu: titleRu.trim(),
      titleUz: titleUz.trim() || titleRu.trim(),
      titleEn: titleEn.trim() || undefined,
      type,
      unit: unit.trim() || undefined,
      required,
      filterable,
      cardVisible,
      productVisible,
      categoryIds: selectedCategoryIds,
      options,
      sortOrder: editingAttr ? editingAttr.sortOrder : attributes.length + 1,
    };

    try {
      await AdminRepository.saveAttribute(attrData);
      await loadData();
      setIsModalOpen(false);
      showToast(
        editingAttr ? 'Характеристика успешно обновлена' : 'Новая характеристика успешно создана'
      );
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Характеристика не сохранена.');
    }
  };

  const handleDeleteAttribute = async (id: string, title: string) => {
    if (confirm(`Вы уверены, что хотите удалить характеристику "${title}"?`)) {
      setLoadError('');
      try {
        await AdminRepository.deleteAttribute(id);
        await loadData();
        showToast('Характеристика удалена');
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Характеристика не удалена.');
      }
    }
  };

  return (
    <div className="admin-page">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed right-5 top-5 z-50 flex items-center gap-2 rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--sp-success)_30%,transparent)] bg-[var(--sp-ink)] px-4 py-3 text-xs font-semibold text-[var(--sp-surface)] shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <AdminPageHeader
        title="Управление атрибутами и фильтрами"
        description="Создавайте характеристики товаров — объём, толщину, вес, бренд или вид упаковки. Нужные параметры автоматически появятся в каталоге и фильтрах."
        action={(
          <Button
            onClick={handleOpenCreateModal}
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Создать атрибут
          </Button>
        )}
      />

      {loadError ? (
        <div role="alert" className="sp-alert sp-alert-danger flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{loadError}</p>
          <button type="button" onClick={() => void loadData()} className="admin-button-secondary min-h-10 px-4 text-[var(--sp-danger)]"><RefreshCw className="size-4" aria-hidden="true" />Повторить</button>
        </div>
      ) : null}

      {/* Attributes List */}
      <div className="admin-table-wrap">
        {loading ? (
          <div className="p-12 text-center text-xs text-[var(--sp-ink-tertiary)]">
            Загрузка списка характеристик...
          </div>
        ) : attributes.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Tag className="mx-auto h-10 w-10 text-[var(--sp-ink-tertiary)]" />
            <p className="text-sm font-semibold text-[var(--sp-ink)]">Характеристик пока нет</p>
            <p className="text-xs text-[var(--sp-ink-tertiary)]">Создайте первый параметр, который можно показывать в карточке и использовать в фильтрах.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[var(--sp-ink)]">
              <thead className="admin-table-head">
                <tr>
                  <th className="py-3.5 px-5">Характеристика</th>
                  <th className="py-3.5 px-5">Ключ (ID)</th>
                  <th className="py-3.5 px-5">Тип / Ед. изм.</th>
                  <th className="py-3.5 px-5">Опции фильтра</th>
                  <th className="py-3.5 px-5">Применение</th>
                  <th className="py-3.5 px-5">Фильтр</th>
                  <th className="py-3.5 px-5 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--sp-line)]">
                {attributes.map((attr) => {
                  const linkedCategoryNames = (attr.categoryIds || [])
                    .map((id) => categories.find((c) => c.id === id)?.titleRu)
                    .filter(Boolean);

                  return (
                    <tr key={attr.id} className="transition-colors hover:bg-[var(--sp-surface-muted)]">
                      <td className="py-4 px-5">
                        <div className="text-sm font-bold text-[var(--sp-ink)]">{attr.titleRu}</div>
                        <div className="text-[11px] text-[var(--sp-ink-tertiary)]">{attr.titleUz}</div>
                      </td>

                      <td className="px-5 py-4 font-semibold text-[var(--sp-ink-secondary)]">
                        <span className="rounded-[var(--radius-sm)] border border-[var(--sp-line)] bg-[var(--sp-surface-muted)] px-2 py-1 text-[11px]">
                          {attr.key}
                        </span>
                      </td>

                      <td className="py-4 px-5">
                        <Badge variant="neutral" size="sm">
                          {attributeTypeLabels[attr.type]}
                          {attr.unit ? ` (${attr.unit})` : ''}
                        </Badge>
                      </td>

                      <td className="py-4 px-5 max-w-xs">
                        {attr.options && attr.options.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {attr.options.slice(0, 4).map((opt) => (
                              <span
                                key={opt.value}
                                className="rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--sp-brand)_24%,var(--sp-line))] bg-[color-mix(in_srgb,var(--sp-brand)_9%,var(--sp-surface))] px-2 py-0.5 text-[10px] font-semibold text-[var(--sp-brand)]"
                              >
                                {opt.labelRu}
                              </span>
                            ))}
                            {attr.options.length > 4 && (
                              <span className="text-[10px] text-slate-400 font-medium self-center">
                                +{attr.options.length - 4} ещё
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="italic text-[var(--sp-ink-tertiary)]">Свободный ввод</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-[var(--sp-ink-secondary)]">
                        {linkedCategoryNames.length > 0 ? (
                          <span className="line-clamp-1 font-medium text-[var(--sp-ink)]">
                            {linkedCategoryNames.join(', ')}
                          </span>
                        ) : (
                          <span className="rounded-[var(--radius-sm)] border border-[var(--sp-line)] bg-[var(--sp-surface-muted)] px-2 py-0.5 font-semibold text-[var(--sp-ink-secondary)]">
                            Все категории
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5">
                        {attr.filterable ? (
                          <Badge variant="brand" size="sm" icon={<Filter className="w-3 h-3" />}>
                            Активен
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            Скрыт
                          </Badge>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(attr)}
                           className="admin-icon-button"
                          title="Редактировать"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAttribute(attr.id, attr.titleRu)}
                           className="admin-icon-button text-[var(--sp-danger)]"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-card mx-auto md:my-4 md:max-w-3xl">
            <div className="admin-modal-header flex items-center justify-between gap-4 px-5 py-4 md:px-7">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-[var(--sp-brand)]" />
                <h3 className="text-lg font-bold text-[var(--sp-ink)]">
                  {editingAttr ? 'Редактирование характеристики' : 'Новая характеристика'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="admin-icon-button"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAttribute} className="admin-modal-body space-y-6 px-5 py-6 md:px-7">
              {saveError ? (
                <p role="alert" className="sp-alert sp-alert-danger text-sm">{saveError}</p>
              ) : null}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <CustomInput
                  label="Название RU"
                  value={titleRu}
                  onChange={(e) => setTitleRu(e.target.value)}
                  placeholder="например: Толщина"
                  required
                />
                <CustomInput
                  label="Название UZ"
                  value={titleUz}
                  onChange={(e) => setTitleUz(e.target.value)}
                  placeholder="например: Qalinligi"
                />
                <CustomInput
                  label="Название EN"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder="for example: Thickness"
                />
              </div>

              <AiTranslateButton fields={[{
                key: 'title', label: 'Название характеристики',
                values: { ru: titleRu, uz: titleUz, en: titleEn },
                onChange: (language, value) => language === 'ru' ? setTitleRu(value) : language === 'uz' ? setTitleUz(value) : setTitleEn(value),
              }]} compact />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CustomInput
                  label="Короткое внутреннее имя"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="например: thickness, weight"
                  helperText="Например, weight или packaging_type. Покупатели это значение не увидят."
                  required
                />
                <CustomInput
                  label="Единица измерения (опционально)"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="например: мкм, л, гр, кг"
                />
              </div>

              <div className="space-y-2">
                <label className="admin-field-label block">
                  Тип ввода информации
                </label>
                <CustomSelect
                  value={type}
                  onChange={(value) => {
                    if (isAttributeType(value)) setType(value);
                  }}
                  options={attributeTypeOptions}
                />
              </div>

              {/* Options Builder for Select type */}
              {(type === 'select' || type === 'multiselect') && (
                <div className="admin-panel-muted space-y-3 p-4">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold text-[var(--sp-ink)]">
                    <Tag className="h-4 w-4 text-[var(--sp-brand)]" />
                    <span>Предопределённые варианты для фильтра</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <input
                      type="text"
                      placeholder="Значение (250 гр)"
                      value={newOptValue}
                      onChange={(e) => setNewOptValue(e.target.value)}
                      className="admin-control text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Подпись RU (250 гр)"
                      value={newOptRu}
                      onChange={(e) => setNewOptRu(e.target.value)}
                      className="admin-control text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Подпись UZ (250 gr)"
                      value={newOptUz}
                      onChange={(e) => setNewOptUz(e.target.value)}
                      className="admin-control text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Подпись EN (250 g)"
                      value={newOptEn}
                      onChange={(e) => setNewOptEn(e.target.value)}
                      className="admin-control text-xs"
                    />
                  </div>

                  <AiTranslateButton fields={[{
                    key: 'option', label: 'Подпись варианта',
                    values: { ru: newOptRu, uz: newOptUz, en: newOptEn },
                    onChange: (language, value) => language === 'ru' ? setNewOptRu(value) : language === 'uz' ? setNewOptUz(value) : setNewOptEn(value),
                  }]} compact />

                  <Button
                    type="button"
                    onClick={handleAddOption}
                    variant="outline"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    fullWidth
                  >
                    Добавить вариант в список
                  </Button>

                  {/* Options List */}
                  {options.length > 0 && (
                    <div className="space-y-1.5 pt-2 max-h-40 overflow-y-auto pr-1">
                      {options.map((opt, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--sp-line)] bg-[var(--sp-surface)] px-3 py-2 text-xs"
                        >
                          <div className="font-semibold text-[var(--sp-ink)]">
                            {opt.labelRu} <span className="text-[10px] text-[var(--sp-ink-tertiary)]">({opt.value})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(idx)}
                            className="admin-icon-button text-[var(--sp-danger)]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <label className="admin-panel-muted flex cursor-pointer items-center justify-between p-3">
                  <div>
                    <span className="block text-xs font-bold text-[var(--sp-ink)]">
                      Отображать в фильтрах левого сайдбара
                    </span>
                    <span className="text-[11px] text-[var(--sp-ink-tertiary)]">
                      Пользователи смогут фильтровать каталог по этому параметру
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={filterable}
                    onChange={(e) => setFilterable(e.target.checked)}
                    className="h-4 w-4 accent-[var(--sp-brand)]"
                  />
                </label>
                <label className="admin-panel-muted flex cursor-pointer items-center justify-between p-3">
                  <div>
                    <span className="block text-xs font-bold text-[var(--sp-ink)]">
                      Показывать в карточке каталога
                    </span>
                    <span className="text-[11px] text-[var(--sp-ink-tertiary)]">
                      Краткое значение появится в списке товаров
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={cardVisible}
                    onChange={(event) => setCardVisible(event.target.checked)}
                    className="h-4 w-4 accent-[var(--sp-brand)]"
                  />
                </label>
                <label className="admin-panel-muted flex cursor-pointer items-center justify-between p-3">
                  <div>
                    <span className="block text-xs font-bold text-[var(--sp-ink)]">
                      Показывать на странице товара
                    </span>
                    <span className="text-[11px] text-[var(--sp-ink-tertiary)]">
                      Значение войдёт в подробные характеристики
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={productVisible}
                    onChange={(event) => setProductVisible(event.target.checked)}
                    className="h-4 w-4 accent-[var(--sp-brand)]"
                  />
                </label>
              </div>

              {/* Submit / Cancel */}
              <div className="admin-modal-footer -mx-5 -mb-6 mt-6 flex justify-end gap-2 px-5 py-4 md:-mx-7 md:px-7">
                <Button type="button" onClick={() => setIsModalOpen(false)} variant="ghost" size="md">
                  Отмена
                </Button>
                <Button type="submit" variant="primary" size="md">
                  Сохранить характеристику
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
