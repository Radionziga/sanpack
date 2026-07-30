'use client';

import React, { useState, useEffect } from 'react';
import { SanpackRepository } from '@/lib/repositories/sanpackRepository';
import { Category } from '@/types';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Plus, Edit, Trash2, Folder, X } from 'lucide-react';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    const data = await SanpackRepository.getCategories();
    setCategories(data);
    setLoading(false);
  }

  const handleCreate = () => {
    setEditingCategory({
      titleRu: '',
      titleUz: '',
      slug: '',
      descriptionRu: '',
      descriptionUz: '',
      icon: 'Package',
      sortOrder: 1,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (cat: Category) => {
    setEditingCategory(cat);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить эту категорию?')) {
      await SanpackRepository.deleteCategory(id);
      loadCategories();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    if (!editingCategory.slug) {
      editingCategory.slug = (editingCategory.titleRu || 'cat')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
    }

    if (editingCategory.id) {
      await SanpackRepository.updateCategory(editingCategory.id, editingCategory);
    } else {
      await SanpackRepository.createCategory(editingCategory as Omit<Category, 'id' | 'createdAt' | 'updatedAt'>);
    }

    setIsModalOpen(false);
    setEditingCategory(null);
    loadCategories();
  };

  const parentCategories = categories.filter((c) => !c.parentId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#18231E]">
            Категории каталога
          </h1>
          <p className="text-xs text-[#68736D] mt-1">
            Управление иерархией товаров SANPACK
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="px-5 py-2.5 bg-[#008348] hover:bg-[#006F3C] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить категорию</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {parentCategories.map((parent) => {
          const subCats = categories.filter((c) => c.parentId === parent.id);
          return (
            <div key={parent.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#EAF5EF] text-[#006F3C] flex items-center justify-center font-bold">
                    <Folder className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#18231E]">{parent.titleRu}</h3>
                    <span className="text-[10px] text-slate-400 font-mono">/{parent.slug}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(parent)}
                    className="p-1.5 text-slate-400 hover:text-[#006F3C]"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(parent.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Subcategories */}
              <div className="space-y-2 pl-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Подкатегории ({subCats.length}):
                </span>
                {subCats.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-[#18231E]">{sub.titleRu}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(sub)}
                        className="p-1 text-slate-400 hover:text-[#006F3C]"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-base text-[#18231E]">
                {editingCategory.id ? 'Редактировать категорию' : 'Новая категория'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="font-bold block mb-1">Название (RU) *</label>
              <input
                type="text"
                required
                value={editingCategory.titleRu || ''}
                onChange={(e) => setEditingCategory({ ...editingCategory, titleRu: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 outline-none"
              />
            </div>

            <div>
              <label className="font-bold block mb-1">Название (UZ) *</label>
              <input
                type="text"
                required
                value={editingCategory.titleUz || ''}
                onChange={(e) => setEditingCategory({ ...editingCategory, titleUz: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 outline-none"
              />
            </div>

            <div>
              <CustomSelect
                label="Родительская категория"
                value={editingCategory.parentId || ''}
                onChange={(val) =>
                  setEditingCategory({
                    ...editingCategory,
                    parentId: val || undefined,
                  })
                }
                options={[
                  { value: '', label: '— Корневая категория —' },
                  ...parentCategories.map((c) => ({ value: c.id, label: c.titleRu })),
                ]}
              />
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
                Сохранить
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
