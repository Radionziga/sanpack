'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SanpackRepository } from '@/lib/repositories/sanpackRepository';
import { RequestOrder, Product } from '@/types';
import { FileSpreadsheet, Package, Clock, CheckCircle2, Factory, TrendingUp } from 'lucide-react';

export default function AdminOverviewPage() {
  const [requests, setRequests] = useState<RequestOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      const [r, p] = await Promise.all([
        SanpackRepository.getRequests(),
        SanpackRepository.getProducts(),
      ]);
      setRequests(r);
      setProducts(p);
      setLoading(false);
    }
    loadStats();
  }, []);

  const handleSeedFirestore = async () => {
    setSeeding(true);
    setSeedMessage(null);
    const result = await SanpackRepository.seedFirestoreForced();
    setSeeding(false);
    setSeedMessage(result.message);
    if (result.success) {
      const [r, p] = await Promise.all([
        SanpackRepository.getRequests(),
        SanpackRepository.getProducts(),
      ]);
      setRequests(r);
      setProducts(p);
    }
  };

  const totalRequests = requests.length;
  const newRequests = requests.filter((r) => r.status === 'new').length;
  const inProgressRequests = requests.filter((r) => r.status === 'processing').length;
  const completedRequests = requests.filter((r) => r.status === 'fulfilled').length;
  const totalProducts = products.length;
  const ownProductionCount = products.filter((p) => p.ownProduction).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-[#18231E]">
            Панель управления SANPACK
          </h1>
          <p className="text-xs text-[#68736D] mt-1">
            Оперативный обзор коммерческих заявок, остатков и базы Cloud Firestore
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedFirestore}
            disabled={seeding}
            className="px-4 py-2 bg-[#006F3C] text-white text-xs font-bold rounded-xl hover:bg-[#005a30] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {seeding ? 'Синхронизация Firestore...' : '🔥 Перенести демо-данные в Firestore'}
          </button>
        </div>
      </div>

      {seedMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-[#006F3C]">
          {seedMessage}
        </div>
      )}


      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold block">Новые B2B заявки</span>
            <span className="text-3xl font-bold text-rose-600 block mt-1">{newRequests}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold block">Всего заявок</span>
            <span className="text-3xl font-bold text-[#006F3C] block mt-1">{totalRequests}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#EAF5EF] text-[#006F3C] flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold block">Товаров в каталоге</span>
            <span className="text-3xl font-bold text-[#18231E] block mt-1">{totalProducts}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold block">Завод SANPACK</span>
            <span className="text-3xl font-bold text-[#006F3C] block mt-1">{ownProductionCount}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#EAF5EF] text-[#006F3C] flex items-center justify-center">
            <Factory className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Recent Requests Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b">
          <h2 className="text-base font-bold text-[#18231E]">
            Последние входящие заявки
          </h2>
          <Link
            href="/admin/requests"
            className="text-xs font-bold text-[#006F3C] hover:underline"
          >
            Смотреть все заявки →
          </Link>
        </div>

        {loading ? (
          <div className="h-40 bg-slate-100 animate-pulse rounded-2xl" />
        ) : requests.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">Заявок пока нет</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">№ Заявки</th>
                  <th className="p-3">Компания / ФИО</th>
                  <th className="p-3">Телефон</th>
                  <th className="p-3">Позиций</th>
                  <th className="p-3">Статус</th>
                  <th className="p-3">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.slice(0, 5).map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-[#006F3C]">
                      {req.requestNumber}
                    </td>
                    <td className="p-3 font-bold text-[#18231E]">
                      {req.companyName || req.contactName}
                    </td>
                    <td className="p-3">{req.phone}</td>
                    <td className="p-3 font-bold">{req.items.length} поз.</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                          req.status === 'new'
                            ? 'bg-rose-100 text-rose-800'
                            : req.status === 'processing'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {req.status === 'new'
                          ? 'НОВАЯ'
                          : req.status === 'processing'
                          ? 'В РАБОТЕ'
                          : 'ВЫПОЛНЕНА'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
