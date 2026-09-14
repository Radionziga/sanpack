'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Save, ShieldCheck } from 'lucide-react';
import type { ExternalAnalyticsSettings } from '@/types';
import { AdminRepository } from '@/lib/repositories/adminRepository';

const fallback: ExternalAnalyticsSettings = {
  googleAnalytics: { enabled: false, measurementId: '' },
  yandexMetrica: { enabled: false, counterId: '' },
};

export function ExternalAnalyticsSettingsPanel() {
  const [settings, setSettings] = useState<ExternalAnalyticsSettings>(fallback);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    AdminRepository.getSettings()
      .then((value) => setSettings(value.externalAnalytics ?? fallback))
      .catch((error) => setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Не удалось загрузить настройки аналитики.' }))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const saved = await AdminRepository.saveSettings({ externalAnalytics: settings });
      setSettings(saved.externalAnalytics ?? settings);
      setMessage({ kind: 'success', text: 'Настройки внешней аналитики сохранены.' });
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Настройки не сохранены.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="admin-panel p-5 text-sm text-[var(--sp-ink-tertiary)]">Загружаем внешнюю аналитику…</div>;

  return (
    <section className="admin-panel p-5 md:p-6" aria-labelledby="external-analytics-title">
      <div className="flex items-start gap-3">
        <BarChart3 className="mt-0.5 size-5 shrink-0 text-[var(--sp-brand)]" aria-hidden="true" />
        <div>
          <h2 id="external-analytics-title" className="font-extended text-lg font-bold">Внешняя аналитика</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--sp-ink-tertiary)]">GA4 и Яндекс Метрика дополняют внутреннюю SANPACK Analytics. Идентификаторы публичные; персональные данные покупателей в собственные события не передаются.</p>
        </div>
      </div>

      {message ? <p role={message.kind === 'error' ? 'alert' : 'status'} className={`mt-4 sp-alert text-sm ${message.kind === 'error' ? 'sp-alert-danger' : 'sp-alert-success'}`}>{message.text}</p> : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <fieldset className="rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-4">
          <label className="flex min-h-10 items-center gap-3 text-sm font-bold">
            <input type="checkbox" checked={settings.googleAnalytics.enabled} onChange={(event) => setSettings((current) => ({ ...current, googleAnalytics: { ...current.googleAnalytics, enabled: event.target.checked } }))} className="size-4 accent-[var(--sp-brand)]" />
            Google Analytics 4
          </label>
          <label className="mt-3 block text-xs font-bold">Measurement ID
            <input value={settings.googleAnalytics.measurementId} onChange={(event) => setSettings((current) => ({ ...current, googleAnalytics: { ...current.googleAnalytics, measurementId: event.target.value.trim().toUpperCase() } }))} placeholder="G-XXXXXXXXXX" inputMode="text" className="admin-control mt-2 font-mono text-sm" />
          </label>
          <p className="mt-3 text-xs leading-5 text-[var(--sp-ink-tertiary)]">Явные SPA page views; заявка измеряется как <span className="font-mono">generate_lead</span>, не purchase.</p>
        </fieldset>

        <fieldset className="rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-4">
          <label className="flex min-h-10 items-center gap-3 text-sm font-bold">
            <input type="checkbox" checked={settings.yandexMetrica.enabled} onChange={(event) => setSettings((current) => ({ ...current, yandexMetrica: { ...current.yandexMetrica, enabled: event.target.checked } }))} className="size-4 accent-[var(--sp-brand)]" />
            Яндекс Метрика
          </label>
          <label className="mt-3 block text-xs font-bold">Номер счётчика
            <input value={settings.yandexMetrica.counterId} onChange={(event) => setSettings((current) => ({ ...current, yandexMetrica: { ...current.yandexMetrica, counterId: event.target.value.replace(/\D/g, '').slice(0, 20) } }))} placeholder="12345678" inputMode="numeric" className="admin-control mt-2 font-mono text-sm" />
          </label>
          <p className="mt-3 text-xs leading-5 text-[var(--sp-ink-tertiary)]">Только просмотры и цели. Вебвизор, запись сессий, clickmap и запись форм выключены.</p>
        </fieldset>
      </div>

      <div className="mt-5 flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <p className="flex items-center gap-2 text-xs text-[var(--sp-ink-tertiary)]"><ShieldCheck className="size-4" aria-hidden="true" />Провайдеры включаются только на production-домене и отключаются общим privacy opt-out.</p>
        <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--sp-brand)] px-5 text-xs font-bold text-[var(--sp-on-brand)] disabled:opacity-50"><Save className="size-4" aria-hidden="true" />{saving ? 'Сохраняем…' : 'Сохранить аналитику'}</button>
      </div>
    </section>
  );
}
