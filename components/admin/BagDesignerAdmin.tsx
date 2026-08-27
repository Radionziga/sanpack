'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, LoaderCircle, Plus, Save, Trash2 } from 'lucide-react';
import { BAG_TYPE_LABELS } from '@/lib/bag-designer/defaults';
import type { BagDesignerSettings, BagDesignRequestRecord, BagType } from '@/lib/bag-designer/types';
import { parseJsonResponse } from '@/lib/http/parseJsonResponse';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface ResponseData { settings: BagDesignerSettings; requests: BagDesignRequestRecord[]; message?: string }

async function adminApi<T>(body?: unknown) {
  const response = await fetch('/api/admin/bag-designer', body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
  return parseJsonResponse<T>(response, 'Не удалось связаться с сервером.');
}

export function BagDesignerAdmin() {
  const [settings, setSettings] = useState<BagDesignerSettings | null>(null);
  const [requests, setRequests] = useState<BagDesignRequestRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { adminApi<ResponseData>().then((data) => { setSettings({ ...data.settings, colors: data.settings.colors.filter((color) => color.id !== 'neutral-gray') }); setRequests(data.requests); }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Не удалось загрузить модуль.')); }, []);
  if (!settings) return <div className="admin-panel flex min-h-48 items-center justify-center"><LoaderCircle className="size-5 animate-spin text-[var(--sp-brand)]" /></div>;

  function addSize(bagType: BagType) {
    setSettings((current) => current && ({ ...current, sizePresets: [...current.sizePresets, { id: `${bagType}-${Date.now()}`, bagType, label: 'Новый размер', width: 30, height: 40, gusset: 0 }] }));
  }
  function updateSize(id: string, patch: Partial<BagDesignerSettings['sizePresets'][number]>) {
    setSettings((current) => current && ({ ...current, sizePresets: current.sizePresets.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  }
  async function save() {
    if (!settings) return;
    const currentSettings = settings;
    setBusy(true); setError(''); setNotice('');
    try { const data = await adminApi<ResponseData>({ action: 'save', settings: { enabled: currentSettings.enabled, minimumQuantity: currentSettings.minimumQuantity, sizePresets: currentSettings.sizePresets, colors: currentSettings.colors.filter((color) => color.id !== 'neutral-gray') } }); setSettings({ ...data.settings, colors: data.settings.colors.filter((color) => color.id !== 'neutral-gray') }); setNotice(data.message || 'Настройки сохранены.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Настройки не сохранены.'); }
    finally { setBusy(false); }
  }
  async function setStatus(id: string, status: BagDesignRequestRecord['status']) {
    try { await adminApi({ action: 'status', id, status }); setRequests((current) => current.map((item) => item.id === id ? { ...item, status } : item)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Статус не обновлён.'); }
  }

  return <div className="grid gap-6">
    {error || notice ? <p role={error ? 'alert' : 'status'} className={`sp-alert text-sm ${error ? 'sp-alert-danger' : 'sp-alert-success'}`}>{error || notice}</p> : null}
    <section className="admin-panel p-5 md:p-6">
      <div className="flex flex-col gap-4 border-b border-[var(--sp-line)] pb-5 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-extended text-xl font-bold">Настройки конструктора</h2><p className="mt-1 max-w-2xl text-sm text-[var(--sp-ink-tertiary)]">Формы пакетов фиксированы. Здесь меняются только доступные размеры, цвета и минимальный тираж.</p></div><label className="flex min-h-11 items-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] px-4 text-xs font-bold"><input type="checkbox" checked={settings.enabled} onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })} className="size-4 accent-[var(--sp-brand)]" /> Показывать на сайте</label></div>
      <label className="mt-5 block max-w-sm text-xs font-bold">Минимальный тираж, шт.<input type="number" min="1" step="100" value={settings.minimumQuantity} onChange={(event) => setSettings({ ...settings, minimumQuantity: Number(event.target.value) })} className="admin-control mt-2" /></label>
      <div className="mt-7 grid gap-5">{(Object.keys(BAG_TYPE_LABELS) as BagType[]).map((bagType) => <div key={bagType} className="rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-4"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold">{BAG_TYPE_LABELS[bagType]}</h3><button type="button" onClick={() => addSize(bagType)} className="inline-flex min-h-9 items-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] px-3 text-xs font-bold"><Plus className="size-4" /> Размер</button></div><div className="mt-4 grid gap-3">{settings.sizePresets.filter((item) => item.bagType === bagType).map((item) => <div key={item.id} className="grid gap-2 rounded-[var(--sp-radius-control-inner)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-3 sm:grid-cols-[minmax(160px,1fr)_100px_100px_100px_40px]"><input aria-label="Название размера" value={item.label} onChange={(event) => updateSize(item.id, { label: event.target.value })} className="admin-control" /><input aria-label="Ширина" type="number" value={item.width} onChange={(event) => updateSize(item.id, { width: Number(event.target.value) })} className="admin-control" /><input aria-label="Высота" type="number" value={item.height} onChange={(event) => updateSize(item.id, { height: Number(event.target.value) })} className="admin-control" /><input aria-label="Боковая складка" type="number" value={item.gusset} onChange={(event) => updateSize(item.id, { gusset: Number(event.target.value) })} className="admin-control" /><button type="button" aria-label="Удалить размер" onClick={() => setSettings({ ...settings, sizePresets: settings.sizePresets.filter((preset) => preset.id !== item.id) })} className="flex size-10 items-center justify-center rounded-[var(--sp-radius-control)] text-[var(--sp-danger)] hover:bg-red-50"><Trash2 className="size-4" /></button></div>)}</div></div>)}</div>
      <div className="mt-7"><div className="flex items-center justify-between"><h3 className="text-sm font-bold">Цвета материала</h3><button type="button" onClick={() => setSettings({ ...settings, colors: [...settings.colors, { id: `color-${Date.now()}`, label: 'Новый цвет', value: '#FFFFFF' }] })} className="inline-flex min-h-9 items-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] px-3 text-xs font-bold"><Plus className="size-4" /> Цвет</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{settings.colors.map((item) => <div key={item.id} className="grid grid-cols-[44px_1fr_40px] gap-2"><input aria-label={`Цвет ${item.label}`} type="color" value={item.value} onChange={(event) => setSettings({ ...settings, colors: settings.colors.map((color) => color.id === item.id ? { ...color, value: event.target.value.toUpperCase() } : color) })} className="admin-control p-1" /><input value={item.label} onChange={(event) => setSettings({ ...settings, colors: settings.colors.map((color) => color.id === item.id ? { ...color, label: event.target.value } : color) })} className="admin-control" /><button type="button" aria-label="Удалить цвет" onClick={() => setSettings({ ...settings, colors: settings.colors.filter((color) => color.id !== item.id) })} className="flex size-10 items-center justify-center rounded-[var(--sp-radius-control)] text-[var(--sp-danger)] hover:bg-red-50"><Trash2 className="size-4" /></button></div>)}</div></div>
      <div className="mt-6 flex justify-end border-t border-[var(--sp-line)] pt-5"><button type="button" disabled={busy} onClick={() => void save()} className="inline-flex min-h-11 items-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-5 text-xs font-bold text-[var(--sp-on-brand)] disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} Сохранить настройки</button></div>
    </section>
    <section className="admin-panel overflow-hidden">
      <div className="border-b border-[var(--sp-line)] p-5 md:p-6">
        <h2 className="font-extended text-xl font-bold">Заявки и лиды на макеты</h2>
        <p className="mt-1 text-sm text-[var(--sp-ink-tertiary)]">
          Контакт сохраняется при запуске визуализации. Черновики видны даже при ошибке AI-сервиса.
        </p>
      </div>
      {requests.length ? (
        <div className="divide-y divide-[var(--sp-line)]">
          {requests.map((request) => (
            <article key={request.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--sp-ink-muted)]">
                  <span>{request.number} · {new Date(request.createdAt).toLocaleString('ru-RU')}</span>
                  {request.status === 'draft' ? (
                    <span className="rounded-[var(--sp-radius-control)] bg-[var(--sp-brand-soft)] px-2 py-1 font-bold text-[var(--sp-brand)]">
                      Лид · {request.generationState === 'failed' ? 'ошибка визуализации' : request.generationState === 'processing' ? 'генерация' : 'черновик'}
                    </span>
                  ) : null}
                  {request.locale ? <span className="font-bold uppercase">{request.locale}</span> : null}
                </div>
                <h3 className="mt-1 text-sm font-bold">{request.contact.name} · {request.contact.phone}</h3>
                <p className="mt-1 text-xs text-[var(--sp-ink-tertiary)]">
                  {BAG_TYPE_LABELS[request.spec.bagType]} · {request.spec.width} × {request.spec.height} см · {request.spec.quantity.toLocaleString('ru-RU')} шт.
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-[var(--sp-brand)]">
                  {request.logoUrl ? <a href={request.logoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">Логотип <ExternalLink className="size-3" /></a> : null}
                  {request.technicalPreviewUrl ? <a href={request.technicalPreviewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">Технический макет <ExternalLink className="size-3" /></a> : null}
                  {request.aiMockupUrl ? <a href={request.aiMockupUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">Визуализация <ExternalLink className="size-3" /></a> : null}
                </div>
              </div>
              {request.status === 'draft' ? (
                <span className="text-xs font-semibold text-[var(--sp-ink-tertiary)]">Ожидает готового макета</span>
              ) : (
                <CustomSelect
                  value={request.status}
                  onChange={(value) => void setStatus(request.id, value as BagDesignRequestRecord['status'])}
                  options={[{ value: 'new', label: 'Новая' }, { value: 'in_progress', label: 'В работе' }, { value: 'completed', label: 'Завершена' }, { value: 'cancelled', label: 'Отменена' }]}
                  className="min-w-44"
                  ariaLabel="Статус заявки"
                />
              )}
            </article>
          ))}
        </div>
      ) : <p className="p-8 text-center text-sm text-[var(--sp-ink-tertiary)]">Заявок и лидов на макеты пока нет.</p>}
    </section>
  </div>;
}
