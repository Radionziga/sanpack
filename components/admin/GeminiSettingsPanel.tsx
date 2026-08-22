'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, KeyRound, RefreshCw, Sparkles } from 'lucide-react';
import { parseJsonResponse } from '@/lib/http/parseJsonResponse';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface GeminiModelOption {
  id: string;
  name: string;
  description: string;
}

interface GeminiAdminSettings {
  enabled: boolean;
  model: string;
  imageModel: string;
  apiKeyConfigured: boolean;
  apiKeyLast4: string;
}

interface GeminiSettingsResponse {
  settings: GeminiAdminSettings;
  models: GeminiModelOption[];
  imageModels: GeminiModelOption[];
  modelsWarning?: string;
  message?: string;
}

const fallbackModels: GeminiModelOption[] = [
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', description: 'Быстрый и экономичный вариант для переводов.' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', description: 'Более сильная модель для сложных текстов.' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', description: 'Универсальная модель высокого качества.' },
];

const fallbackImageModels: GeminiModelOption[] = [
  { id: 'gemini-3.1-flash-image', name: 'Gemini 3.1 Flash Image', description: 'Рекомендуемая модель для товарных изображений.' },
  { id: 'gemini-3.1-flash-lite-image', name: 'Gemini 3.1 Flash-Lite Image', description: 'Быстрая генерация квадратных изображений в 1K.' },
  { id: 'gemini-3-pro-image', name: 'Gemini 3 Pro Image', description: 'Модель для более сложных визуальных задач.' },
  { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image', description: 'Предыдущее поколение генерации изображений.' },
];

const inputClass = 'admin-control mt-2 text-sm';

async function geminiApi<T>(body?: unknown) {
  const response = await fetch('/api/admin/gemini', body ? {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  } : { cache: 'no-store' });
  return parseJsonResponse<T>(response, 'Не удалось связаться с сервером. Попробуйте ещё раз.');
}

export function GeminiSettingsPanel() {
  const [settings, setSettings] = useState<GeminiAdminSettings>({
    enabled: false,
    model: 'gemini-3.5-flash-lite',
    imageModel: 'gemini-3.1-flash-image',
    apiKeyConfigured: false,
    apiKeyLast4: '',
  });
  const [models, setModels] = useState<GeminiModelOption[]>(fallbackModels);
  const [imageModels, setImageModels] = useState<GeminiModelOption[]>(fallbackImageModels);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    geminiApi<GeminiSettingsResponse>()
      .then((result) => {
        setSettings(result.settings);
        if (result.models.length) setModels(result.models);
        if (result.imageModels.length) setImageModels(result.imageModels);
        if (result.modelsWarning) setError(result.modelsWarning);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Не удалось загрузить настройки Gemini.'))
      .finally(() => setLoading(false));
  }, []);

  async function refreshModels() {
    setLoadingModels(true); setError(null); setNotice(null);
    try {
      const result = await geminiApi<{ models: GeminiModelOption[]; imageModels: GeminiModelOption[] }>({ action: 'models', apiKey });
      if (!result.models.length) throw new Error('Для этого ключа не найдено текстовых моделей Gemini.');
      if (!result.imageModels.length) throw new Error('Для этого ключа не найдено моделей Gemini, способных создавать изображения.');
      setModels(result.models);
      setImageModels(result.imageModels);
      if (!result.models.some((model) => model.id === settings.model)) {
        const recommended = result.models.find((model) => model.id === 'gemini-3.5-flash-lite') || result.models[0];
        setSettings((current) => ({ ...current, model: recommended.id }));
      }
      if (!result.imageModels.some((model) => model.id === settings.imageModel)) {
        const recommendedImage = result.imageModels.find((model) => model.id === 'gemini-3.1-flash-image') || result.imageModels[0];
        setSettings((current) => ({ ...current, imageModel: recommendedImage.id }));
      }
      setNotice('Ключ принят. Список доступных моделей обновлён.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось получить список моделей.');
    } finally { setLoadingModels(false); }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(null); setNotice(null);
    try {
      const result = await geminiApi<GeminiSettingsResponse>({
        action: 'save',
        settings: { enabled: settings.enabled, model: settings.model, imageModel: settings.imageModel, apiKey },
      });
      setSettings(result.settings);
      if (result.models.length) setModels(result.models);
      if (result.imageModels.length) setImageModels(result.imageModels);
      setApiKey('');
      setNotice(result.message || 'Настройки Gemini сохранены.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Настройки Gemini не сохранены.');
    } finally { setBusy(false); }
  }

  if (loading) return <p className="py-8 text-center text-sm text-[var(--sp-ink-tertiary)]">Загружаем настройки Gemini…</p>;

  return (
    <form onSubmit={save} className="rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-5 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-[var(--sp-brand)]" aria-hidden="true" />
          <div>
            <h2 className="font-extended text-lg font-bold">Gemini: тексты и изображения</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--sp-ink-tertiary)]">
              Заполняет переводы и создаёт нейтральные товарные изображения. Тексты остаются редактируемыми, а изображение сохраняется только после подтверждения.
            </p>
          </div>
        </div>
        <label className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] px-3 text-xs font-bold">
          <input type="checkbox" checked={settings.enabled} onChange={(event) => setSettings((current) => ({ ...current, enabled: event.target.checked }))} className="size-4 accent-[var(--sp-brand)]" />
          {settings.enabled ? 'Включено' : 'Выключено'}
        </label>
      </div>

      {error || notice ? <p role={error ? 'alert' : 'status'} className={`sp-alert mt-5 text-sm ${error ? 'sp-alert-danger' : 'sp-alert-success'}`}>{error || notice}</p> : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-xs font-bold">
          API-ключ Gemini
          <span className="relative block">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--sp-ink-muted)]" aria-hidden="true" />
            <input
              type={showKey ? 'text' : 'password'}
              autoComplete="new-password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={settings.apiKeyConfigured ? `Сохранён ••••${settings.apiKeyLast4}` : 'Вставьте API-ключ'}
              className={`${inputClass} pl-10 pr-11`}
            />
            <button type="button" onClick={() => setShowKey((visible) => !visible)} aria-label={showKey ? 'Скрыть API-ключ' : 'Показать API-ключ'} className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-[var(--sp-radius-control-inner)] text-[var(--sp-ink-tertiary)] hover:bg-[var(--sp-surface-inset)] hover:text-[var(--sp-ink)]">
              {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </span>
        </label>
        <CustomSelect
          label="Модель для переводов"
          value={settings.model}
          onChange={(value) => setSettings((current) => ({ ...current, model: value }))}
          options={models.map((model) => ({ value: model.id, label: model.name }))}
        />
      </div>
      <div className="mt-4 max-w-[calc(50%-0.5rem)] max-md:max-w-none">
        <CustomSelect
          label="Модель для изображений"
          value={settings.imageModel}
          onChange={(value) => setSettings((current) => ({ ...current, imageModel: value }))}
          options={imageModels.map((model) => ({ value: model.id, label: model.name }))}
        />
        <span className="mt-2 block font-normal leading-5 text-[var(--sp-ink-tertiary)]">Используется для товарных фотографий и фотореалистичных макетов в конструкторе пакетов. В списке показываются только совместимые модели.</span>
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--sp-ink-tertiary)]">
        Ключ хранится в зашифрованном виде на сервере и не попадает в браузер. Для обычных переводов рекомендуем Gemini 3.5 Flash-Lite: она быстрее и экономичнее.
      </p>
      {settings.apiKeyConfigured ? (
        <p className="mt-2 text-xs leading-5 text-[var(--sp-ink-tertiary)]">
          Оставьте поле ключа пустым, чтобы сохранить текущий ключ. Введите новый ключ только для его замены.
        </p>
      ) : null}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => void refreshModels()} disabled={loadingModels || (!apiKey && !settings.apiKeyConfigured)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] px-4 text-xs font-bold disabled:opacity-40">
          <RefreshCw className={`size-4 ${loadingModels ? 'animate-spin' : ''}`} />
          {loadingModels ? 'Проверяем…' : 'Проверить ключ и обновить модели'}
        </button>
        <button type="submit" disabled={busy || (!apiKey && !settings.apiKeyConfigured)} className="min-h-11 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-6 text-xs font-bold text-[var(--sp-on-brand)] disabled:opacity-40">
          {busy ? 'Сохраняем…' : 'Сохранить настройки'}
        </button>
      </div>
    </form>
  );
}
