'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { SanpackRepository } from '@/lib/repositories/sanpackRepository';
import { ClientPartner } from '@/types';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Plus, Edit, Trash2, Users, X } from 'lucide-react';

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientPartner[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Partial<ClientPartner> | null>(null);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    setLoading(true);
    const data = await SanpackRepository.getClients();
    setClients(data);
    setLoading(false);
  }

  const handleCreate = () => {
    setEditingClient({
      name: '',
      logo: 'https://picsum.photos/seed/sanpack-partner/300/150',
      category: 'restaurant',
      descriptionRu: 'Поставщик упаковочных материалов SANPACK',
      descriptionUz: 'SANPACK qadoqlash mahsulotlari yetkazib beruvchi',
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#18231E]">
            Партнёры и Клиенты HoReCa
          </h1>
          <p className="text-xs text-[#68736D] mt-1">
            Управление логотипами и брендами на главной странице
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="px-5 py-2.5 bg-[#008348] hover:bg-[#006F3C] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить партнера</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {clients.map((client) => (
          <div
            key={client.id}
            className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3"
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
              <p className="font-bold text-xs text-[#18231E] text-center">{client.name}</p>
              <span className="text-[10px] text-[#006F3C] font-semibold block text-center uppercase mt-1">
                {client.category}
              </span>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2 border-t">
              <button
                onClick={() => {
                  setEditingClient(client);
                  setIsModalOpen(true);
                }}
                className="p-1 text-slate-400 hover:text-[#006F3C]"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(client.id)}
                className="p-1 text-slate-400 hover:text-rose-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && editingClient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-base text-[#18231E]">Партнёр HoReCa</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400"
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
                className="w-full p-2.5 rounded-xl border border-slate-200 outline-none"
              />
            </div>

            <div>
              <label className="font-bold block mb-1">URL логотипа</label>
              <input
                type="text"
                value={editingClient.logo || ''}
                onChange={(e) => setEditingClient({ ...editingClient, logo: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 outline-none"
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
