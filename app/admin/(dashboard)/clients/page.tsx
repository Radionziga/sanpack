'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { SanpackRepository } from '@/lib/repositories/sanpackRepository';
import { ClientPartner } from '@/types';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Plus, Edit, Trash2, X, RefreshCw, TriangleAlert } from 'lucide-react';

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Partial<ClientPartner> | null>(null);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    setLoading(true);
    setLoadError('');
    try {
      setClients(await SanpackRepository.getClients());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Не удалось загрузить партнёров.');
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = () => {
    setEditingClient({
      name: '',
      logo: 'https://picsum.photos/seed/sanpack-partner/300/150',
      category: 'restaurant',
      descriptionRu: 'Партнёр магазина',
      descriptionUz: 'Do‘kon hamkori',
      sortOrder: 1,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    if (editingClient.id) {
      await SanpackRepository.updateClient(editingClient.id, editingClient);
    } else {
      await SanpackRepository.createClient(editingClient as Omit<ClientPartner, 'id' | 'createdAt'>);
    }

    setIsModalOpen(false);
    setEditingClient(null);
    loadClients();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Удалить партнёра?')) {
      await SanpackRepository.deleteClient(id);
      loadClients();
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <AdminPageHeader
        title="Клиенты и партнёры"
        description="Управляйте логотипами и брендами, которые показываются на главной странице."
        action={(
          <button
            onClick={handleCreate}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--sp-brand)] px-4 font-compact text-xs font-bold text-[var(--sp-on-brand)] transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" aria-hidden="true" />
            <span>Добавить партнёра</span>
          </button>
        )}
      />

      {loadError ? (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-300/50 bg-red-50 p-4 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{loadError}</p>
          <button type="button" onClick={() => void loadClients()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 text-xs font-bold"><RefreshCw className="size-4" aria-hidden="true" />Повторить</button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {clients.map((client) => (
          <div
            key={client.id}
            className="flex flex-col justify-between space-y-3 rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-4"
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
                  setEditingClient(client);
                  setIsModalOpen(true);
                }}
                aria-label={`Редактировать ${client.name}`}
                className="flex size-9 items-center justify-center rounded-md text-[var(--sp-ink-tertiary)] hover:bg-[var(--sp-surface-inset)] hover:text-[var(--sp-brand)]"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(client.id)}
                aria-label={`Удалить ${client.name}`}
                className="flex size-9 items-center justify-center rounded-md text-[var(--sp-ink-tertiary)] hover:bg-red-500/8 hover:text-[var(--sp-danger)]"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleSave}
            className="w-full max-w-md space-y-4 rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-6 text-xs shadow-[var(--sp-shadow-raised)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--sp-line)] pb-3">
              <h2 className="text-base font-bold text-[var(--sp-ink)]">Партнёр</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Закрыть"
                className="flex size-9 items-center justify-center rounded-md text-[var(--sp-ink-tertiary)] hover:bg-[var(--sp-surface-inset)] hover:text-[var(--sp-ink)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="font-bold block mb-1">Название бренда *</label>
              <input
                type="text"
                required
                value={editingClient.name || ''}
                onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--sp-control-border)] bg-[var(--sp-control)] px-3 text-sm font-normal text-[var(--sp-ink)] outline-none focus:border-[var(--sp-brand)]"
              />
            </div>

            <div>
              <label className="font-bold block mb-1">URL логотипа</label>
              <input
                type="text"
                value={editingClient.logo || ''}
                onChange={(e) => setEditingClient({ ...editingClient, logo: e.target.value })}
                className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--sp-control-border)] bg-[var(--sp-control)] px-3 text-sm font-normal text-[var(--sp-ink)] outline-none focus:border-[var(--sp-brand)]"
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

            <div className="flex justify-end gap-2 border-t border-[var(--sp-line)] pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="inline-flex min-h-10 items-center rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface)] px-4 font-bold text-[var(--sp-ink-secondary)] hover:bg-[var(--sp-surface-inset)]"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="inline-flex min-h-10 items-center rounded-lg bg-[var(--sp-brand)] px-5 font-bold text-[var(--sp-on-brand)] transition-opacity hover:opacity-90"
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
