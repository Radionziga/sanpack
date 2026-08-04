'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileDown, History, PackagePlus, Pencil, Phone, Save, X } from 'lucide-react';
import { SanpackRepository } from '@/lib/repositories/sanpackRepository';
import type { Product, RequestItem, RequestOrder } from '@/types';

const statuses: Array<{ value: RequestOrder['status']; label: string }> = [
  { value: 'new', label: 'Новый' },
  { value: 'processing', label: 'В работе' },
  { value: 'fulfilled', label: 'Завершён' },
  { value: 'cancelled', label: 'Отменён' },
];

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('ru-RU').format(value)} сум`;
}

function statusLabel(value: RequestOrder['status']) {
  return statuses.find((status) => status.value === value)?.label || value;
}

export default function AdminRequestsPage() {
  const [orders, setOrders] = useState<RequestOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<RequestOrder | null>(null);
  const [filter, setFilter] = useState<'all' | RequestOrder['status']>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      SanpackRepository.getRequests(),
      SanpackRepository.getProducts(),
    ]).then(([nextOrders, nextProducts]) => {
      if (!active) return;
      setOrders(nextOrders);
      setProducts(nextProducts.filter((product) => product.status !== 'archived'));
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Не удалось загрузить заказы.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const filtered = filter === 'all' ? orders : orders.filter((order) => order.status === filter);
  const calculatedSubtotal = useMemo(() => selected?.items.reduce(
    (sum, item) => sum + (item.price === undefined ? 0 : item.price * item.quantity), 0
  ) || 0, [selected]);

  function patchSelected(patch: Partial<RequestOrder>) {
    setSelected((current) => current ? { ...current, ...patch } : current);
  }

  function patchLine(index: number, patch: Partial<RequestItem>) {
    if (!selected) return;
    const items = selected.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item);
    patchSelected({ items });
  }

  function removeLine(index: number) {
    if (!selected || selected.items.length === 1) return;
    patchSelected({ items: selected.items.filter((_, itemIndex) => itemIndex !== index) });
  }

  function addProduct(productId: string) {
    if (!selected || !productId) return;
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) return;
    const variant = product.variants?.[0];
    const item: RequestItem = {
      productId: product.id,
      productTitleRu: product.titleRu,
      productTitleUz: product.titleUz || product.titleRu,
      productSlug: product.slug,
      variantId: variant?.id,
      variantTitleRu: variant?.titleRu,
      variantTitleUz: variant?.titleUz,
      sku: variant?.sku || product.sku,
      quantity: product.minimumOrder || 1,
      unit: product.salesUnit || 'шт',
      price: variant?.price ?? product.price,
      priceMode: product.showPrice ? 'fixed' : 'request',
      image: variant?.image || product.mainImage,
    };
    patchSelected({ items: [...selected.items, item] });
  }

  async function quickStatus(order: RequestOrder, status: RequestOrder['status']) {
    setError(null);
    try {
      const updated = await SanpackRepository.updateRequestStatus(order.id, status);
      setOrders((current) => current.map((item) => item.id === updated.id ? updated : item));
      if (selected?.id === updated.id) setSelected(updated);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Статус не обновлён.'); }
  }

  async function saveOrder() {
    if (!selected) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      const updated = await SanpackRepository.updateRequest(selected.id, {
        contactName: selected.contactName,
        phone: selected.phone,
        status: selected.status,
        notes: selected.notes || '',
        adjustment: selected.adjustment || 0,
        items: selected.items.map((item) => ({
          lineId: item.lineId,
          productId: item.productId,
          variantId: item.variantId,
          quantity: Number(item.quantity),
          unitPrice: item.price,
          comment: item.comment,
        })),
      });
      setSelected(updated);
      setOrders((current) => current.map((order) => order.id === updated.id ? updated : order));
      setNotice(`Заказ ${updated.requestNumber} сохранён. Редакция ${updated.revision}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Заказ не сохранён.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-col justify-between gap-4 border-b border-[var(--sp-line)] pb-5 lg:flex-row lg:items-end">
        <div><h1 className="font-extended text-2xl font-bold tracking-[-0.025em]">Заказы</h1><p className="mt-1.5 text-sm text-[var(--sp-ink-secondary)]">Заявки покупателей, ручная корректировка и внутренние документы.</p></div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'new', 'processing', 'fulfilled', 'cancelled'] as const).map((value) => (
            <button key={value} type="button" onClick={() => setFilter(value)} className={`min-h-9 rounded-lg border px-3 text-[10px] font-bold ${filter === value ? 'border-[var(--sp-brand)] bg-[var(--sp-brand)] text-[var(--sp-on-brand)]' : 'border-[var(--sp-line)] bg-[var(--sp-surface)] text-[var(--sp-ink-secondary)]'}`}>{value === 'all' ? `Все · ${orders.length}` : `${statusLabel(value)} · ${orders.filter((order) => order.status === value).length}`}</button>
          ))}
        </div>
      </header>
      {error || notice ? <p role={error ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${error ? 'border-red-300/50 bg-red-500/8 text-[var(--sp-danger)]' : 'border-emerald-400/30 bg-emerald-500/8 text-[var(--sp-success)]'}`}>{error || notice}</p> : null}

      <section className="overflow-hidden rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)]">
        {loading ? <p className="p-10 text-center text-sm text-[var(--sp-ink-tertiary)]">Загрузка заказов…</p> : filtered.length === 0 ? <p className="p-10 text-center text-sm text-[var(--sp-ink-tertiary)]">Заказов в этом разделе нет.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[880px] text-left text-xs"><thead className="border-b border-[var(--sp-line)] bg-[var(--sp-surface-inset)] text-[var(--sp-ink-tertiary)]"><tr><th className="p-3.5">Номер</th><th className="p-3.5">Клиент</th><th className="p-3.5">Телефон</th><th className="p-3.5">Состав</th><th className="p-3.5">Сумма</th><th className="p-3.5">Статус</th><th className="p-3.5">Дата</th><th className="p-3.5 text-right">Действие</th></tr></thead>
            <tbody className="divide-y divide-[var(--sp-line)]">{filtered.map((order) => <tr key={order.id} className="hover:bg-[var(--sp-surface-inset)]"><td className="p-3.5 font-mono font-bold text-[var(--sp-brand)]">{order.requestNumber}</td><td className="p-3.5 font-bold">{order.contactName}</td><td className="p-3.5"><a href={`tel:${order.phoneNormalized || order.phone}`} className="inline-flex items-center gap-1.5"><Phone className="size-3.5" />{order.phone}</a></td><td className="p-3.5">{order.items.length} поз.</td><td className="p-3.5 font-bold">{order.total ? formatMoney(order.total) : 'По запросу'}</td><td className="p-3.5"><select value={order.status} onChange={(event) => void quickStatus(order, event.target.value as RequestOrder['status'])} className="min-h-9 rounded-md border border-[var(--sp-line)] bg-[var(--sp-control)] px-2 font-bold outline-none">{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></td><td className="p-3.5 text-[var(--sp-ink-tertiary)]">{new Date(order.createdAt).toLocaleString('ru-RU')}</td><td className="p-3.5 text-right"><button type="button" onClick={() => { setSelected(order); setNotice(null); }} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[var(--sp-line)] px-3 font-bold hover:border-[var(--sp-brand)]"><Pencil className="size-3.5" /> Открыть</button></td></tr>)}</tbody>
          </table></div>
        )}
      </section>

      {selected ? <div className="fixed inset-0 z-50 bg-black/55 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label={`Заказ ${selected.requestNumber}`}><div className="mx-auto flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[var(--sp-line)] bg-[var(--sp-canvas)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--sp-line)] bg-[var(--sp-surface)] px-5 py-4"><div><span className="text-[10px] uppercase tracking-[0.08em] text-[var(--sp-ink-tertiary)]">Редактирование заказа</span><h2 className="mt-1 font-mono text-lg font-bold text-[var(--sp-brand)]">{selected.requestNumber} · ред. {selected.revision || 1}</h2></div><button type="button" onClick={() => setSelected(null)} className="flex size-10 items-center justify-center rounded-lg border border-[var(--sp-line)]" aria-label="Закрыть"><X className="size-4" /></button></div>
        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5 p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold">Имя<input value={selected.contactName} onChange={(event) => patchSelected({ contactName: event.target.value })} className="mt-2 min-h-11 w-full rounded-lg border border-[var(--sp-line-strong)] bg-[var(--sp-control)] px-3 text-sm outline-none" /></label><label className="text-xs font-bold">Телефон<input value={selected.phone} onChange={(event) => patchSelected({ phone: event.target.value })} className="mt-2 min-h-11 w-full rounded-lg border border-[var(--sp-line-strong)] bg-[var(--sp-control)] px-3 text-sm outline-none" /></label></div>
            <section><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-extended text-base font-bold">Состав заказа</h3><label className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface)] px-3 text-xs font-bold"><PackagePlus className="size-4 text-[var(--sp-brand)]" /><select defaultValue="" onChange={(event) => { addProduct(event.target.value); event.target.value = ''; }} className="max-w-56 bg-transparent outline-none"><option value="">Добавить товар…</option>{products.map((product) => <option key={product.id} value={product.id}>{product.titleRu}</option>)}</select></label></div>
              <div className="mt-3 space-y-2">{selected.items.map((item, index) => <div key={item.lineId || `${item.productId}-${index}`} className="grid gap-3 rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface)] p-3 sm:grid-cols-[minmax(0,1fr)_110px_150px_40px] sm:items-end"><div><p className="text-xs font-bold">{item.productTitleRu}</p><p className="mt-1 font-mono text-[10px] text-[var(--sp-ink-tertiary)]">{item.sku} · {item.unit}</p></div><label className="text-[10px] font-bold text-[var(--sp-ink-tertiary)]">Количество<input type="number" min="0.001" step="any" value={item.quantity} onChange={(event) => patchLine(index, { quantity: Number(event.target.value) })} className="mt-1 min-h-10 w-full rounded-md border border-[var(--sp-line)] bg-[var(--sp-control)] px-2 text-xs text-[var(--sp-ink)] outline-none" /></label><label className="text-[10px] font-bold text-[var(--sp-ink-tertiary)]">Цена за единицу<input type="number" min="0" step="1" value={item.price ?? ''} onChange={(event) => patchLine(index, { price: event.target.value === '' ? undefined : Number(event.target.value) })} placeholder="По запросу" className="mt-1 min-h-10 w-full rounded-md border border-[var(--sp-line)] bg-[var(--sp-control)] px-2 text-xs text-[var(--sp-ink)] outline-none" /></label><button type="button" disabled={selected.items.length === 1} onClick={() => removeLine(index)} className="flex size-10 items-center justify-center rounded-md text-[var(--sp-danger)] disabled:opacity-30"><X className="size-4" /></button></div>)}</div>
            </section>
            <label className="block text-xs font-bold">Внутренний комментарий<textarea value={selected.notes || ''} onChange={(event) => patchSelected({ notes: event.target.value })} rows={3} className="mt-2 w-full rounded-lg border border-[var(--sp-line-strong)] bg-[var(--sp-control)] p-3 text-sm outline-none" /></label>
            <section className="rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface)] p-4"><h3 className="flex items-center gap-2 text-xs font-bold"><History className="size-4 text-[var(--sp-brand)]" /> История изменений</h3><div className="mt-3 space-y-2">{(selected.auditTrail || []).slice().reverse().map((entry) => <div key={entry.id} className="border-l-2 border-[var(--sp-line-strong)] pl-3 text-[10px]"><p className="font-bold text-[var(--sp-ink)]">{entry.summary}</p><p className="mt-0.5 text-[var(--sp-ink-tertiary)]">{entry.actorLabel} · {new Date(entry.createdAt).toLocaleString('ru-RU')}</p></div>)}</div></section>
          </div>
          <aside className="border-t border-[var(--sp-line)] bg-[var(--sp-surface)] p-5 lg:border-l lg:border-t-0"><label className="text-xs font-bold">Статус<select value={selected.status} onChange={(event) => patchSelected({ status: event.target.value as RequestOrder['status'] })} className="mt-2 min-h-11 w-full rounded-lg border border-[var(--sp-line-strong)] bg-[var(--sp-control)] px-3 text-sm outline-none">{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label><label className="mt-4 block text-xs font-bold">Корректировка суммы<input type="number" step="1" value={selected.adjustment || 0} onChange={(event) => patchSelected({ adjustment: Number(event.target.value) })} className="mt-2 min-h-11 w-full rounded-lg border border-[var(--sp-line-strong)] bg-[var(--sp-control)] px-3 text-sm outline-none" /><span className="mt-1 block text-[10px] font-normal text-[var(--sp-ink-tertiary)]">Скидка вводится отрицательным числом.</span></label><div className="mt-5 space-y-2 border-t border-[var(--sp-line)] pt-4 text-xs"><div className="flex justify-between text-[var(--sp-ink-secondary)]"><span>Товары</span><span>{formatMoney(calculatedSubtotal)}</span></div><div className="flex justify-between text-[var(--sp-ink-secondary)]"><span>Корректировка</span><span>{formatMoney(selected.adjustment || 0)}</span></div><div className="flex justify-between border-t border-[var(--sp-line)] pt-3 text-base font-bold"><span>Итого</span><span>{formatMoney(Math.max(0, calculatedSubtotal + (selected.adjustment || 0)))}</span></div></div><a href={`/api/admin/orders/${encodeURIComponent(selected.id)}/document`} target="_blank" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--sp-line)] text-xs font-bold"><FileDown className="size-4" /> Внутренняя накладная</a><button type="button" disabled={saving} onClick={() => void saveOrder()} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--sp-brand)] px-4 text-xs font-bold text-[var(--sp-on-brand)] disabled:opacity-50"><Save className="size-4" /> {saving ? 'Сохраняем…' : 'Сохранить изменения'}</button><p className="mt-4 text-[10px] leading-4 text-[var(--sp-ink-tertiary)]">Первоначальный состав заявки сохранён отдельно и не изменяется.</p></aside>
        </div>
      </div></div> : null}
    </div>
  );
}
