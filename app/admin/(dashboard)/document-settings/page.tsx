'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { FileText, Save, Stamp } from 'lucide-react';
import type { InternalDocumentSettings } from '@/types';
import { parseJsonResponse } from '@/lib/http/parseJsonResponse';

const empty: InternalDocumentSettings = {
  documentTitle: 'Внутренняя накладная', companyName: 'SANPACK', legalName: '', taxId: '', address: '', phone: '', email: '', bankDetails: '', logoUrl: '', footerText: 'Внутренний документ. Не является счётом-фактурой или фискальным документом.', numberPrefix: 'НК', showSignatureFields: true, showStampPlaceholder: true,
};

export default function DocumentSettingsPage() {
  const [settings, setSettings] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/document-settings', { cache: 'no-store' }).then(async (response) => {
      return parseJsonResponse<InternalDocumentSettings>(response, 'Не удалось загрузить реквизиты.');
    }).then(setSettings).catch((reason) => setError(reason.message)).finally(() => setLoading(false));
  }, []);

  function field<K extends keyof InternalDocumentSettings>(key: K, value: InternalDocumentSettings[K]) { setSettings((current) => ({ ...current, [key]: value })); }

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(null); setMessage(null);
    try { const response = await fetch('/api/admin/document-settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(settings) }); const body = await parseJsonResponse<InternalDocumentSettings>(response, 'Настройки не сохранены.'); setSettings(body); setMessage('Настройки документов сохранены.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Настройки не сохранены.'); }
    finally { setSaving(false); }
  }

  if (loading) return <p className="py-12 text-center text-sm text-[var(--sp-ink-tertiary)]">Загрузка реквизитов…</p>;
  const textFields: Array<{ key: keyof InternalDocumentSettings; label: string; placeholder?: string; wide?: boolean }> = [
    { key: 'documentTitle', label: 'Название документа' }, { key: 'numberPrefix', label: 'Префикс номера' }, { key: 'companyName', label: 'Название магазина' }, { key: 'legalName', label: 'Юридическое наименование' }, { key: 'taxId', label: 'ИНН / СТИР' }, { key: 'phone', label: 'Телефон' }, { key: 'email', label: 'Email' }, { key: 'address', label: 'Адрес', wide: true },
  ];
  return <div className="mx-auto max-w-5xl space-y-6"><header className="border-b border-[var(--sp-line)] pb-5"><h1 className="font-extended text-2xl font-bold tracking-[-0.025em]">Внутренние документы</h1><p className="mt-1.5 max-w-3xl text-sm leading-6 text-[var(--sp-ink-secondary)]">Реквизиты для PDF-накладной по заказу. Документ предназначен только для внутреннего учёта.</p></header>{error || message ? <p role={error ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${error ? 'border-red-300/50 bg-red-500/8 text-[var(--sp-danger)]' : 'border-emerald-400/30 bg-emerald-500/8 text-[var(--sp-success)]'}`}>{error || message}</p> : null}<form onSubmit={save} className="space-y-5"><section className="rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-5 md:p-6"><div className="flex gap-3"><FileText className="mt-0.5 size-5 text-[var(--sp-brand)]" /><div><h2 className="font-extended text-lg font-bold">Организация</h2><p className="mt-1 text-xs text-[var(--sp-ink-tertiary)]">Эти данные печатаются в шапке каждой накладной.</p></div></div><div className="mt-5 grid gap-4 md:grid-cols-2">{textFields.map((item) => <label key={item.key} className={`text-xs font-bold ${item.wide ? 'md:col-span-2' : ''}`}>{item.label}<input value={String(settings[item.key] || '')} onChange={(event) => field(item.key, event.target.value as never)} className="mt-2 min-h-11 w-full rounded-lg border border-[var(--sp-line-strong)] bg-[var(--sp-control)] px-3 text-sm outline-none focus:border-[var(--sp-brand)]" /></label>)}</div><label className="mt-4 block text-xs font-bold">Банковские реквизиты<textarea value={settings.bankDetails || ''} onChange={(event) => field('bankDetails', event.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-[var(--sp-line-strong)] bg-[var(--sp-control)] p-3 text-sm outline-none" /></label></section><section className="rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-5 md:p-6"><div className="flex gap-3"><Stamp className="mt-0.5 size-5 text-[var(--sp-brand)]" /><div><h2 className="font-extended text-lg font-bold">Подпись и примечание</h2><p className="mt-1 text-xs text-[var(--sp-ink-tertiary)]">Настройте нижнюю часть документа.</p></div></div><label className="mt-5 block text-xs font-bold">Текст внизу<textarea value={settings.footerText || ''} onChange={(event) => field('footerText', event.target.value)} rows={2} className="mt-2 w-full rounded-lg border border-[var(--sp-line-strong)] bg-[var(--sp-control)] p-3 text-sm outline-none" /></label><div className="mt-4 flex flex-wrap gap-5"><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={settings.showSignatureFields} onChange={(event) => field('showSignatureFields', event.target.checked)} className="size-4 accent-[var(--sp-brand)]" /> Поля «Отпустил» и «Получил»</label><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={settings.showStampPlaceholder} onChange={(event) => field('showStampPlaceholder', event.target.checked)} className="size-4 accent-[var(--sp-brand)]" /> Место для печати</label></div></section><div className="flex justify-end"><button type="submit" disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--sp-brand)] px-6 text-xs font-bold text-[var(--sp-on-brand)] disabled:opacity-50"><Save className="size-4" />{saving ? 'Сохраняем…' : 'Сохранить'}</button></div></form></div>;
}
