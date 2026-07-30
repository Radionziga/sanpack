'use client';

import React, { useState, useEffect } from 'react';
import { SanpackRepository } from '@/lib/repositories/sanpackRepository';
import { Attribute, Category, AttributeOption } from '@/types';
import { Button, CustomInput, Badge, CustomSelect } from '@/components/ui';
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
} from 'lucide-react';

export default function AdminAttributesPage() {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAttr, setEditingAttr] = useState<Attribute | null>(null);

  // Form State
  const [key, setKey] = useState('');
  const [titleRu, setTitleRu] = useState('');
  const [titleUz, setTitleUz] = useState('');
  const [type, setType] = useState<'select' | 'text' | 'number'>('select');
  const [unit, setUnit] = useState('');
  const [filterable, setFilterable] = useState(true);
  const [cardVisible, setCardVisible] = useState(true);
  const [productVisible, setProductVisible] = useState(true);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [options, setOptions] = useState<AttributeOption[]>([]);

  // Option input temp state
  const [newOptValue, setNewOptValue] = useState('');
  const [newOptRu, setNewOptRu] = useState('');
  const [newOptUz, setNewOptUz] = useState('');

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [attrs, cats] = await Promise.all([
      SanpackRepository.getAttributes(),
      SanpackRepository.getCategories(),
    ]);
    setAttributes(attrs.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
    setCategories(cats);
    setLoading(false);
  }

  function showToast(msg: string) {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }

  const handleOpenCreateModal = () => {
    setEditingAttr(null);
    setKey('');
    setTitleRu('');
    setTitleUz('');
    setType('select');
    setUnit('');
    setFilterable(true);
    setCardVisible(true);
    setProductVisible(true);
    setSelectedCategoryIds([]);
    setOptions([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (attr: Attribute) => {
    setEditingAttr(attr);
    setKey(attr.key);
    setTitleRu(attr.titleRu);
    setTitleUz(attr.titleUz);
    setType((attr.type as any) || 'select');
    setUnit(attr.unit || '');
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
    };
    setOptions([...options, newOpt]);
    setNewOptValue('');
    setNewOptRu('');
    setNewOptUz('');
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSaveAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || !titleRu.trim()) return;

    const formattedKey = key
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, '_');

    const attrData: Partial<Attribute> = {
      id: editingAttr ? editingAttr.id : 'attr-' + Date.now(),
      key: formattedKey,
      titleRu: titleRu.trim(),
      titleUz: titleUz.trim() || titleRu.trim(),
      type,
      unit: unit.trim() || undefined,
      filterable,
      cardVisible,
      productVisible,
      categoryIds: selectedCategoryIds,
      options,
      sortOrder: editingAttr ? editingAttr.sortOrder : attributes.length + 1,
    };

    await SanpackRepository.saveAttribute(attrData);
    await loadData();
    setIsModalOpen(false);
    showToast(
      editingAttr ? 'Характеристика успешно обновлена' : 'Новая характеристика успешно создана'
    );
  };

  const handleDeleteAttribute = async (id: string, title: string) => {
    if (confirm(`Вы уверены, что хотите удалить характеристику "${title}"?`)) {
      await SanpackRepository.deleteAttribute(id);
      await loadData();
      showToast('Характеристика удалена');
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-[#18231E] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-emerald-500/30 text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF5EF] text-[#006F3C] text-xs font-bold mb-2">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Конструктор атрибутов</span>
          </div>
          <h1 className="text-2xl font-bold text-[#18231E] tracking-tight">
            Управление атрибутами и фильтрами
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Создавайте динамические характеристики (объём, толщина, вес, бренд, вид упаковки), которые автоматически появляются в фильтрах каталога
          </p>
        </div>

        <Button
          onClick={handleOpenCreateModal}
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          className="shadow-sm shrink-0"
        >
          Создать атрибут
        </Button>
      </div>

      {/* Attributes List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Загрузка списка характеристик...
          </div>
        ) : attributes.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Tag className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-600">Нет созданных атрибутов</p>
            <p className="text-xs text-slate-400">Нажмите «Создать атрибут», чтобы добавить первый параметр фильтрации</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#18231E]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
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
              <tbody className="divide-y divide-slate-100">
                {attributes.map((attr) => {
                  const linkedCategoryNames = (attr.categoryIds || [])
                    .map((id) => categories.find((c) => c.id === id)?.titleRu)
                    .filter(Boolean);

                  return (
                    <tr key={attr.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-[#18231E] text-sm">{attr.titleRu}</div>
                        <div className="text-[11px] text-slate-400">{attr.titleUz}</div>
                      </td>

                      <td className="py-4 px-5 font-mono text-slate-500 font-semibold">
                        <span className="bg-slate-100 px-2 py-1 rounded-md text-[11px] border border-slate-200">
                          {attr.key}
                        </span>
                      </td>

                      <td className="py-4 px-5">
                        <Badge variant="neutral" size="sm">
                          {attr.type === 'select' ? 'Список' : attr.type === 'number' ? 'Число' : 'Текст'}
                          {attr.unit ? ` (${attr.unit})` : ''}
                        </Badge>
                      </td>

                      <td className="py-4 px-5 max-w-xs">
                        {attr.options && attr.options.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {attr.options.slice(0, 4).map((opt) => (
                              <span
                                key={opt.value}
                                className="bg-[#EAF5EF] text-[#0F6E43] text-[10px] font-semibold px-2 py-0.5 rounded-md border border-[#0F6E43]/20"
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
                          <span className="text-slate-400 italic">Свободный ввод</span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-slate-500">
                        {linkedCategoryNames.length > 0 ? (
                          <span className="text-slate-700 font-medium line-clamp-1">
                            {linkedCategoryNames.join(', ')}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Все категории (Глобальный)
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
                          className="p-2 text-slate-400 hover:text-[#006F3C] hover:bg-[#EAF5EF] rounded-xl transition-colors"
                          title="Редактировать"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAttribute(attr.id, attr.titleRu)}
                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-[#006F3C]" />
                <h3 className="text-lg font-bold text-[#18231E]">
                  {editingAttr ? 'Редактирование характеристики' : 'Новая характеристика'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAttribute} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CustomInput
                  label="Системный ключ (slug / ID)"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="например: thickness, weight"
                  helperText="Латинскими буквами без пробелов"
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
                <label className="block text-xs font-bold text-[#222B35]">
                  Тип ввода информации
                </label>
                <CustomSelect
                  value={type}
                  onChange={(val) => setType(val as any)}
                  options={[
                    { value: 'select', label: 'Выпадающий список фиксированных вариантов' },
                    { value: 'text', label: 'Текстовое поле свободного ввода' },
                    { value: 'number', label: 'Числовое значение' },
                  ]}
                />
              </div>

              {/* Options Builder for Select type */}
              {type === 'select' && (
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <h4 className="text-xs font-bold text-[#18231E] flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-[#006F3C]" />
                    <span>Предопределённые варианты для фильтра</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Значение (250 гр)"
                      value={newOptValue}
                      onChange={(e) => setNewOptValue(e.target.value)}
                      className="bg-white border rounded-xl px-3 py-2 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Подпись RU (250 гр)"
                      value={newOptRu}
                      onChange={(e) => setNewOptRu(e.target.value)}
                      className="bg-white border rounded-xl px-3 py-2 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Подпись UZ (250 gr)"
                      value={newOptUz}
                      onChange={(e) => setNewOptUz(e.target.value)}
                      className="bg-white border rounded-xl px-3 py-2 text-xs"
                    />
                  </div>

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
                          className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs"
                        >
                          <div className="font-semibold text-slate-800">
                            {opt.labelRu} <span className="text-slate-400 font-mono text-[10px]">({opt.value})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1"
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
                <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-white cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-[#18231E] block">
                      Отображать в фильтрах левого сайдбара
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Пользователи смогут фильтровать каталог по этому параметру
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={filterable}
                    onChange={(e) => setFilterable(e.target.checked)}
                    className="w-4 h-4 accent-[#006F3C] rounded-md"
                  />
                </label>
              </div>

              {/* Submit / Cancel */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" onClick={() => setIsModalOpen(false)} variant="ghost" size="md">
                  Отмена
                </Button>
                <Button type="submit" variant="primary" size="md">
                  Сохранить атрибут
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
