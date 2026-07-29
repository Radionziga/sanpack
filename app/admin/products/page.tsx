'use client';

import React, { useState, useEffect } from 'react';
import { SanpackRepository } from '@/lib/repositories/sanpackRepository';
import { Product, Category, Attribute } from '@/types';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Plus, Edit, Trash2, Search, Factory, ShieldCheck, X, Check } from 'lucide-react';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit/Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [p, c, a] = await Promise.all([
      SanpackRepository.getProducts(),
      SanpackRepository.getCategories(),
      SanpackRepository.getAttributes(),
    ]);
    setProducts(p);
    setCategories(c);
    setAttributes(a);
    setLoading(false);
  }

  const handleOpenCreate = () => {
    setEditingProduct({
      titleRu: '',
      titleUz: '',
      slug: '',
      sku: 'SP-' + Math.floor(1000 + Math.random() * 9000),
      categoryId: categories[0]?.id || '',
      shortDescriptionRu: '',
      shortDescriptionUz: '',
      descriptionRu: '',
      descriptionUz: '',
      mainImage: 'https://picsum.photos/seed/sanpack-new-prod/800/800',
      images: ['https://picsum.photos/seed/sanpack-new-prod/800/800'],
      salesUnit: 'рулон',
      minimumOrder: 1,
      showPrice: true,
      price: 15000,
      stockStatus: 'in_stock',
      attributes: { material: 'ПНД', size: 'стандарт' },
      variants: [],
      featured: false,
      ownProduction: true,
      newProduct: true,
      sortOrder: 10,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Вы действительно хотите удалить этот товар из каталога?')) {
      await SanpackRepository.deleteProduct(id);
      loadData();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    if (!editingProduct.slug) {
      editingProduct.slug = (editingProduct.titleRu || 'product')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }

    if (editingProduct.id) {
      await SanpackRepository.updateProduct(editingProduct.id, editingProduct);
    } else {
      await SanpackRepository.createProduct(editingProduct as Omit<Product, 'id' | 'createdAt' | 'updatedAt'>);
    }

    setIsModalOpen(false);
    setEditingProduct(null);
    loadData();
  };

  const filteredProducts = products.filter(
    (p) =>
      p.titleRu.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#18231E]">
            Каталог товаров SANPACK
          </h1>
          <p className="text-xs text-[#68736D] mt-1">
            Добавление, редактирование артикулов, цен и параметров
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 bg-[#008348] hover:bg-[#006F3C] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить товар</span>
        </button>
      </div>

      {/* Search & Stats */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Поиск по названию или артикулу (SKU)..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#006F3C]"
          />
        </div>

        <span className="text-xs font-bold text-[#006F3C]">
          Всего товаров: {filteredProducts.length}
        </span>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Загрузка товаров...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Фото</th>
                  <th className="p-3.5">Артикул / Название</th>
                  <th className="p-3.5">Категория</th>
                  <th className="p-3.5">Цена / Ед.</th>
                  <th className="p-3.5">Завод</th>
                  <th className="p-3.5">Статус</th>
                  <th className="p-3.5 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const cat = categories.find((c) => c.id === p.categoryId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-3.5">
                        <img
                          src={p.mainImage}
                          alt={p.titleRu}
                          className="w-10 h-10 object-contain rounded-lg border bg-white p-1"
                        />
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-[#18231E] block">{p.titleRu}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Арт: {p.sku}</span>
                      </td>
                      <td className="p-3.5 font-semibold text-slate-600">
                        {cat ? cat.titleRu : '—'}
                      </td>
                      <td className="p-3.5 font-bold text-[#006F3C]">
                        {p.showPrice && p.price ? `${p.price.toLocaleString()} сум` : 'По запросу'}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          за {p.salesUnit} (мин. {p.minimumOrder})
                        </span>
                      </td>
                      <td className="p-3.5">
                        {p.ownProduction ? (
                          <span className="px-2 py-0.5 rounded bg-[#EAF5EF] text-[#006F3C] font-bold text-[10px] flex items-center gap-1 w-fit">
                            <Factory className="w-3 h-3" /> SANPACK
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Импорт</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold ${
                            p.stockStatus === 'in_stock'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.stockStatus === 'in_stock' ? 'В наличии' : 'Под заказ'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 bg-slate-100 hover:bg-[#006F3C] hover:text-white rounded-lg transition-colors text-slate-600"
                          title="Редактировать"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-lg transition-colors text-rose-600"
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

      {/* Product Edit / Create Modal */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-base text-[#18231E]">
                {editingProduct.id ? 'Редактирование товара' : 'Новый товар каталога'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold block mb-1">Название (RU) *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.titleRu || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, titleRu: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Название (UZ) *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.titleUz || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, titleUz: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Артикул (SKU) *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.sku || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono outline-none"
                />
              </div>

              <div>
                <CustomSelect
                  label="Категория *"
                  value={editingProduct.categoryId || ''}
                  onChange={(val) => setEditingProduct({ ...editingProduct, categoryId: val })}
                  options={categories.map((c) => ({ value: c.id, label: c.titleRu }))}
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Цена (сум)</label>
                <input
                  type="number"
                  value={editingProduct.price || 0}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price: parseInt(e.target.value) || 0 })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold outline-none"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Единица измерения</label>
                <input
                  type="text"
                  value={editingProduct.salesUnit || 'рулон'}
                  onChange={(e) => setEditingProduct({ ...editingProduct, salesUnit: e.target.value })}
                  placeholder="рулон, шт, пачка"
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">URL главного изображения</label>
                <input
                  type="text"
                  value={editingProduct.mainImage || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      mainImage: e.target.value,
                      images: [e.target.value],
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none"
                />
              </div>

              <div>
                <CustomSelect
                  label="Статус склада"
                  value={editingProduct.stockStatus || 'in_stock'}
                  onChange={(val) =>
                    setEditingProduct({
                      ...editingProduct,
                      stockStatus: val as Product['stockStatus'],
                    })
                  }
                  options={[
                    { value: 'in_stock', label: 'В наличии' },
                    { value: 'out_of_stock', label: 'Нет в наличии' },
                    { value: 'on_order', label: 'Под заказ' },
                  ]}
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={editingProduct.ownProduction || false}
                  onChange={(e) => setEditingProduct({ ...editingProduct, ownProduction: e.target.checked })}
                  className="accent-[#006F3C] w-4 h-4"
                />
                <span>Завод SANPACK (Собственное)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={editingProduct.featured || false}
                  onChange={(e) => setEditingProduct({ ...editingProduct, featured: e.target.checked })}
                  className="accent-[#006F3C] w-4 h-4"
                />
                <span>Популярное на главной</span>
              </label>
            </div>

            <div>
              <label className="font-bold block mb-1">Краткое описание (RU)</label>
              <textarea
                rows={2}
                value={editingProduct.shortDescriptionRu || ''}
                onChange={(e) => setEditingProduct({ ...editingProduct, shortDescriptionRu: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 outline-none"
              />
            </div>

            {/* Dynamic Attributes Section */}
            <div className="space-y-4 pt-3 border-t border-slate-200 bg-slate-50 p-4 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-bold text-xs text-[#18231E] block">
                    Характеристики и Атрибуты товара (для фильтров)
                  </label>
                  <span className="text-[10px] text-slate-500">
                    Выберите из созданных атрибутов или введите своё произвольное значение
                  </span>
                </div>
                <a
                  href="/admin/attributes"
                  target="_blank"
                  className="text-[10px] text-[#006F3C] hover:underline font-semibold bg-[#EAF5EF] px-2.5 py-1 rounded-full border border-[#006F3C]/20"
                >
                  + Управление базой атрибутов
                </a>
              </div>

              {/* Grid of System Attributes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attributes.map((attr) => {
                  const rawVal = editingProduct.attributes?.[attr.key];
                  const currentValue = rawVal !== undefined && rawVal !== null ? String(rawVal) : '';
                  return (
                    <div key={attr.id} className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-700 block">
                          {attr.titleRu} {attr.unit ? `(${attr.unit})` : ''}
                        </label>
                        <span className="text-[9px] font-mono text-slate-400">{attr.key}</span>
                      </div>

                      {attr.type === 'select' && attr.options && attr.options.length > 0 ? (
                        <div className="space-y-1">
                          <select
                            value={attr.options.some((o) => o.value === currentValue) ? currentValue : currentValue ? '__custom__' : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val !== '__custom__') {
                                setEditingProduct({
                                  ...editingProduct,
                                  attributes: {
                                    ...(editingProduct.attributes || {}),
                                    [attr.key]: val,
                                  },
                                });
                              }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs outline-none"
                          >
                            <option value="">-- Не выбрано --</option>
                            {attr.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.labelRu}
                              </option>
                            ))}
                            <option value="__custom__">Своё значение...</option>
                          </select>

                          {(!attr.options.some((o) => o.value === currentValue) || currentValue === '__custom__') && (
                            <input
                              type="text"
                              value={currentValue === '__custom__' ? '' : currentValue}
                              onChange={(e) =>
                                setEditingProduct({
                                  ...editingProduct,
                                  attributes: {
                                    ...(editingProduct.attributes || {}),
                                    [attr.key]: e.target.value,
                                  },
                                })
                              }
                              placeholder="Введите своё значение (например: 15 мкм)"
                              className="w-full bg-white border border-[#006F3C]/40 rounded-lg p-1.5 text-xs outline-none font-semibold text-[#006F3C]"
                            />
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={currentValue}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              attributes: {
                                ...(editingProduct.attributes || {}),
                                [attr.key]: e.target.value,
                              },
                            })
                          }
                          placeholder={`Введите ${attr.titleRu.toLowerCase()}`}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs outline-none"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Extra Custom Key-Value Attributes Adder */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Дополнительные индивидуальные атрибуты этого товара:
                </label>
                
                {/* List existing non-system attributes */}
                {Object.entries(editingProduct.attributes || {})
                  .filter(([k]) => !attributes.some((a) => a.key === k))
                  .map(([customKey, customVal]) => (
                    <div key={customKey} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                      <span className="font-mono text-xs font-bold text-slate-600 px-2 py-1 bg-slate-100 rounded">
                        {customKey}:
                      </span>
                      <input
                        type="text"
                        value={String(customVal || '')}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            attributes: {
                              ...(editingProduct.attributes || {}),
                              [customKey]: e.target.value,
                            },
                          })
                        }
                        className="flex-1 text-xs border rounded p-1"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...(editingProduct.attributes || {}) };
                          delete updated[customKey];
                          setEditingProduct({ ...editingProduct, attributes: updated });
                        }}
                        className="text-rose-500 hover:text-rose-700 p-1 font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                {/* New Custom Attribute Inline Input */}
                <div className="flex gap-2">
                  <input
                    id="new-custom-attr-key"
                    type="text"
                    placeholder="Название атрибута (например: density)"
                    className="w-1/2 bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none"
                  />
                  <input
                    id="new-custom-attr-val"
                    type="text"
                    placeholder="Значение (например: 100 г/м²)"
                    className="w-1/2 bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const keyEl = document.getElementById('new-custom-attr-key') as HTMLInputElement;
                      const valEl = document.getElementById('new-custom-attr-val') as HTMLInputElement;
                      if (keyEl && valEl && keyEl.value.trim() && valEl.value.trim()) {
                        const cleanKey = keyEl.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
                        setEditingProduct({
                          ...editingProduct,
                          attributes: {
                            ...(editingProduct.attributes || {}),
                            [cleanKey]: valEl.value.trim(),
                          },
                        });
                        keyEl.value = '';
                        valEl.value = '';
                      }
                    }}
                    className="bg-[#006F3C] text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-[#005830] transition-colors shrink-0"
                  >
                    + Добавить
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-slate-700"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-[#006F3C] text-white font-bold rounded-xl shadow-md"
              >
                Сохранить товар
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
