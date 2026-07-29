'use client';

import React, { useState, useEffect } from 'react';
import { SanpackRepository } from '@/lib/repositories/sanpackRepository';
import { RequestOrder } from '@/types';
import { CustomSelect } from '@/components/ui/CustomSelect';
import {
  FileSpreadsheet,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Building,
  Phone,
  Send,
  X,
  FileText,
} from 'lucide-react';

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<RequestOrder[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RequestOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    const data = await SanpackRepository.getRequests();
    setRequests(data);
    setLoading(false);
  }

  const handleStatusUpdate = async (id: string, newStatus: RequestOrder['status']) => {
    await SanpackRepository.updateRequestStatus(id, newStatus);
    if (selectedRequest && selectedRequest.id === id) {
      setSelectedRequest({ ...selectedRequest, status: newStatus });
    }
    loadRequests();
  };

  const handleDeleteRequest = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить эту заявку?')) {
      await SanpackRepository.deleteRequest(id);
      if (selectedRequest?.id === id) setSelectedRequest(null);
      loadRequests();
    }
  };

  const filteredRequests =
    statusFilter === 'all'
      ? requests
      : requests.filter((r) => r.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#18231E]">
            Коммерческие заявки B2B
          </h1>
          <p className="text-xs text-[#68736D] mt-1">
            Управление заявками на поставку продукции SANPACK
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold shadow-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'all' ? 'bg-[#006F3C] text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Все ({requests.length})
          </button>
          <button
            onClick={() => setStatusFilter('new')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'new' ? 'bg-rose-600 text-white' : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            Новые ({requests.filter((r) => r.status === 'new').length})
          </button>
          <button
            onClick={() => setStatusFilter('processing')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'processing' ? 'bg-amber-600 text-white' : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            В работе ({requests.filter((r) => r.status === 'processing').length})
          </button>
          <button
            onClick={() => setStatusFilter('fulfilled')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'fulfilled' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            Выполненные ({requests.filter((r) => r.status === 'fulfilled').length})
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Загрузка заявок...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">Заявки не найдены</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">№ Заявки</th>
                  <th className="p-3.5">Компания / ИП</th>
                  <th className="p-3.5">Контактное лицо</th>
                  <th className="p-3.5">Телефон</th>
                  <th className="p-3.5">Позиций</th>
                  <th className="p-3.5">Статус</th>
                  <th className="p-3.5">Дата</th>
                  <th className="p-3.5 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono font-bold text-[#006F3C]">
                      {req.requestNumber}
                    </td>
                    <td className="p-3.5 font-bold text-[#18231E]">
                      {req.companyName || 'Частное лицо'}
                      {req.inn && <span className="block text-[10px] text-slate-400 font-normal">ИНН: {req.inn}</span>}
                    </td>
                    <td className="p-3.5">{req.contactName}</td>
                    <td className="p-3.5 font-bold">{req.phone}</td>
                    <td className="p-3.5 font-bold">{req.items.length} поз.</td>
                    <td className="p-3.5">
                      <CustomSelect
                        value={req.status}
                        onChange={(val) =>
                          handleStatusUpdate(req.id, val as RequestOrder['status'])
                        }
                        options={[
                          { value: 'new', label: 'НОВАЯ', badge: 'New' },
                          { value: 'processing', label: 'В РАБОТЕ' },
                          { value: 'fulfilled', label: 'ВЫПОЛНЕНА' },
                          { value: 'cancelled', label: 'ОТМЕНЕНА' },
                        ]}
                        size="sm"
                        variant="default"
                        className="w-36"
                      />
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {new Date(req.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="p-1.5 bg-[#EAF5EF] text-[#006F3C] hover:bg-[#006F3C] hover:text-white rounded-lg transition-colors"
                        title="Просмотр"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRequest(req.id)}
                        className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <span className="text-xs text-slate-400 block font-bold">Детали заявки</span>
                <h3 className="text-xl font-bold text-[#006F3C] font-mono">
                  {selectedRequest.requestNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-1 text-slate-400 hover:text-slate-800"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-400 block">Организация:</span>
                <strong className="text-[#18231E] block text-sm">
                  {selectedRequest.companyName || 'Индивидуальный заказ'}
                </strong>
                {selectedRequest.inn && <span className="text-slate-500 font-mono">ИНН: {selectedRequest.inn}</span>}
              </div>
              <div>
                <span className="text-slate-400 block">Контактное лицо:</span>
                <strong className="text-[#18231E] block">{selectedRequest.contactName}</strong>
                <a href={`tel:${selectedRequest.phone}`} className="text-[#006F3C] font-bold block mt-0.5">
                  📞 {selectedRequest.phone}
                </a>
              </div>
              <div>
                <span className="text-slate-400 block">Способ доставки:</span>
                <strong className="text-[#18231E] capitalize">{selectedRequest.deliveryType}</strong>
                {selectedRequest.deliveryAddress && (
                  <p className="text-slate-600 mt-0.5">{selectedRequest.deliveryAddress}</p>
                )}
              </div>
              <div>
                <span className="text-slate-400 block">Форма оплаты:</span>
                <strong className="text-[#18231E] uppercase">{selectedRequest.paymentMethod}</strong>
              </div>
            </div>

            {selectedRequest.notes && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                <strong>Комментарий:</strong> {selectedRequest.notes}
              </div>
            )}

            {/* Items Breakdown */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#18231E]">
                Запрошенные товары ({selectedRequest.items.length}):
              </h4>
              <div className="divide-y divide-slate-100 border rounded-2xl p-2 bg-white">
                {selectedRequest.items.map((it, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-[#18231E]">{it.product.titleRu}</p>
                      {it.variant && (
                        <p className="text-[11px] text-[#006F3C] font-semibold">{it.variant.titleRu}</p>
                      )}
                      <p className="text-[10px] text-slate-400 font-mono">
                        SKU: {it.variant?.sku || it.product.sku}
                      </p>
                    </div>
                    <div className="text-right font-bold text-sm text-[#006F3C]">
                      {it.quantity} {it.product.salesUnit}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t flex items-center justify-between">
              <a
                href={`https://t.me/sanpack_uz?text=${encodeURIComponent(`Заявка №${selectedRequest.requestNumber} (${selectedRequest.companyName || selectedRequest.contactName}): ${selectedRequest.phone}`)}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-sky-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Написать в Telegram
              </a>

              <button
                onClick={() => setSelectedRequest(null)}
                className="px-5 py-2 bg-slate-100 text-slate-800 font-bold rounded-xl text-xs"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
