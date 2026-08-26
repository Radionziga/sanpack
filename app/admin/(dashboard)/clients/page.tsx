'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { AdminRepository } from '@/lib/repositories/adminRepository';
import { ClientPartner } from '@/types';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AiTranslateButton } from '@/components/admin/AiTranslateButton';
import { Plus, Edit, Trash2, X, RefreshCw, TriangleAlert } from 'lucide-react';

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Partial<ClientPartner> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isModalOpen]);

  async function loadClients() {
    setLoading(true);
    setLoadError('');
    try {
      setClients(await AdminRepository.getClients());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Не удалось загрузить партнёров.');
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = () => {
    setSaveError('');
    setEditingClient({
      name: '',
      logo: '',
      category: 'restaurant',
      descriptionRu: 'Партнёр магазина',
      descriptionUz: 'Do‘kon hamkori',
      descriptionEn: 'Store partner',
      descriptionZh: '商店合作伙伴',
      sortOrder: 1,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    setSaving(true);
    setSaveError('');

    try {
      if (editingClient.id) {
        await AdminRepository.updateClient(editingClient.id, editingClient);
      } else {
        await AdminRepository.createClient(editingClient as Omit<ClientPartner, 'id'>);
      }

      await loadClients();
      setIsModalOpen(false);
      setEditingClient(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Партнёр не сохранён.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Удалить партнёра?')) {
      try {
        await AdminRepository.deleteClient(id);
        await loadClients();
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Партнёр не удалён.');
      }
    }
  };

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Клиенты и партнёры"
        description="Управляйте логотипами и брендами, которые показываются на главной странице."
        action={(
          <button
            onClick={handleCreate}
            className="admin-button-primary"
          >
            <Plus className="size-4" aria-hidden="true" />
            <span>Добавить партнёра</span>
          </button>
        )}
      />

      {loadError ? (
        <div role="alert" className="sp-alert sp-alert-danger flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{loadError}</p>
          <button type="button" onClick={() => void loadClients()} className="admin-button-secondary min-h-10 px-4 text-[var(--sp-danger)]"><RefreshCw className="size-4" aria-hidden="true" />Повторить</button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {clients.map((client) => (
          <div
            key={client.id}
            className="admin-panel flex flex-col justify-between space-y-3 p-4"
          >
            <Image
              src={client.logo}
              alt={client.name}
              width={200}
              height={48}
              sizes="200px"
              className="h-12 w-auto max-w-full object-contain mx-auto"
            />
            <div>
              <p className="text-center text-xs font-bold text-[var(--sp-ink)]">{client.name}</p>
              <span className="mt-1 block text-center text-[10px] font-semibold uppercase text-[var(--sp-brand)]">
                {client.category}
              </span>
            </div>

            <div className="flex items-center justify-center gap-2 border-t border-[var(--sp-line)] pt-2">
              <button
                onClick={() => {
                  setSaveError('');
                  setEditingClient(client);
                  setIsModalOpen(true);
                }}
                aria-label={`Редактировать ${client.name}`}
                className="admin-icon-button"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(client.id)}
                aria-label={`Удалить ${client.name}`}
                className="admin-icon-button text-[var(--sp-danger)]"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

          </div>
        ))}
      </div>

      {isModalOpen && editingClient && (
        <div className="admin-modal-backdrop">
          <form
            onSubmit={handleSave}
            className="admin-modal-card mx-auto space-y-4 p-5 text-xs md:my-4 md:max-w-lg md:p-6"
          >
            <div className="flex items-center justify-between border-b border-[var(--sp-line)] pb-3">
              <h2 className="text-base font-bold text-[var(--sp-ink)]">Партнёр</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Закрыть"
                className="admin-icon-button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {saveError ? (
              <p role="alert" className="sp-alert sp-alert-danger text-sm">{saveError}</p>
            ) : null}

            <div>
              <label className="font-bold block mb-1">Название бренда *</label>
              <input
                type="text"
                required
                value={editingClient.name ?? ''}
                onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                className="admin-control mt-1.5 text-sm font-normal"
              />
            </div>

            <div>
              <label className="font-bold block mb-1">URL логотипа *</label>
              <input
                type="text"
                required
                value={editingClient.logo ?? ''}
                onChange={(e) => setEditingClient({ ...editingClient, logo: e.target.value })}
                className="admin-control mt-1.5 text-sm font-normal"
              />
            </div>

            <div>
              <CustomSelect
                label="Сфера деятельности"
                value={editingClient.category || 'restaurant'}
                onChange={(val) => setEditingClient({ ...editingClient, category: val as ClientPartner['category'] })}
                options={[
                  { value: 'restaurant', label: 'Рестораны и кафе' },
                  { value: 'hotel', label: 'Отели' },
                  { value: 'bakery', label: 'Пекарни' },
                  { value: 'production', label: 'Производства' },
                ]}
              />
            </div>

            <div className="grid gap-3">
              {([['descriptionRu', 'Описание RU'], ['descriptionUz', 'Описание UZ'], ['descriptionEn', 'Описание EN'], ['descriptionZh', 'Описание ZH']] as const).map(([field, label]) => (
                <label key={field} className="font-bold">
                  {label}
                  <textarea rows={2} value={editingClient[field] || ''} onChange={(event) => setEditingClient({ ...editingClient, [field]: event.target.value })} className="admin-control mt-1.5 p-3 text-sm font-normal" />
                </label>
              ))}
            </div>

            <AiTranslateButton fields={[{
              key: 'description', label: 'Описание партнёра',
              values: { ru: editingClient.descriptionRu || '', uz: editingClient.descriptionUz || '', en: editingClient.descriptionEn || '', zh: editingClient.descriptionZh || '' },
              onChange: (language, value) => setEditingClient((current) => current ? { ...current, [`description${language === 'ru' ? 'Ru' : language === 'uz' ? 'Uz' : language === 'en' ? 'En' : 'Zh'}`]: value } : current),
            }]} compact />

            <div className="flex justify-end gap-2 border-t border-[var(--sp-line)] pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="admin-button-secondary"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={saving}
                className="admin-button-primary disabled:opacity-50"
              >
                {saving ? 'Сохраняем…' : 'Сохранить'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
