'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bot, CheckCircle2, ExternalLink, LogIn, Send, ShieldCheck } from 'lucide-react';
import { parseJsonResponse } from '@/lib/http/parseJsonResponse';
import { GeminiSettingsPanel } from '@/components/admin/GeminiSettingsPanel';

interface TelegramAdminSettings {
  login: {
    enabled: boolean;
    clientId: string;
    redirectUri: string;
    requestPhone: boolean;
    allowBotMessages: boolean;
    clientSecretConfigured: boolean;
    clientSecretUsable: boolean;
    clientSecretLast4: string;
  };
  storefront: {
    enabled: boolean;
    botUsername: string;
    webAppUrl: string;
    tokenConfigured: boolean;
    tokenUsable: boolean;
    tokenLast4: string;
  };
  notifications: {
    enabled: boolean;
    chatId: string;
    tokenConfigured: boolean;
    tokenUsable: boolean;
    tokenLast4: string;
  };
}

const emptySettings: TelegramAdminSettings = {
  login: {
    enabled: false,
    clientId: '',
    redirectUri: '',
    requestPhone: false,
    allowBotMessages: false,
    clientSecretConfigured: false,
    clientSecretUsable: false,
    clientSecretLast4: '',
  },
  storefront: { enabled: false, botUsername: '', webAppUrl: '', tokenConfigured: false, tokenUsable: false, tokenLast4: '' },
  notifications: { enabled: false, chatId: '', tokenConfigured: false, tokenUsable: false, tokenLast4: '' },
};

const inputClass = 'admin-control mt-2 text-sm';

function secretPlaceholder(configured: boolean, usable: boolean, last4: string, emptyLabel: string) {
  if (configured && usable) return `Сохранён ••••${last4}`;
  if (configured) return 'Введите заново — сохранённое значение недоступно';
  return emptyLabel;
}

function IntegrationToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-[var(--sp-line)] px-3 text-xs font-bold">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-[var(--sp-brand)]"
      />
      <span>{checked ? 'Включено' : 'Выключено'}</span>
      <span className="sr-only">{label}</span>
    </label>
  );
}

async function api<T>(body?: unknown) {
  const response = await fetch('/api/admin/telegram', body ? {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  } : { cache: 'no-store' });
  return parseJsonResponse<T>(response, 'Не удалось связаться с сервером. Попробуйте ещё раз.');
}

export default function IntegrationsPage() {
  const [settings, setSettings] = useState<TelegramAdminSettings>(emptySettings);
  const [loginSecret, setLoginSecret] = useState('');
  const [storefrontToken, setStorefrontToken] = useState('');
  const [notificationToken, setNotificationToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeAction, setActiveAction] = useState<'save' | 'test_notifications' | 'configure_storefront' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trustedOrigin = useMemo(() => {
    try { return new URL(settings.login.redirectUri).origin; } catch { return 'Не задан'; }
  }, [settings.login.redirectUri]);

  useEffect(() => {
    api<TelegramAdminSettings>()
      .then(setSettings)
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Не удалось загрузить настройки.'))
      .finally(() => setLoading(false));
  }, []);

  function settingsPayload() {
    return {
      login: {
        enabled: settings.login.enabled,
        clientId: settings.login.clientId,
        clientSecret: loginSecret,
        redirectUri: settings.login.redirectUri,
        requestPhone: settings.login.requestPhone,
        allowBotMessages: settings.login.allowBotMessages,
      },
      storefront: {
        enabled: settings.storefront.enabled,
        botUsername: settings.storefront.botUsername,
        botToken: storefrontToken,
        webAppUrl: settings.storefront.webAppUrl,
      },
      notifications: {
        enabled: settings.notifications.enabled,
        botToken: notificationToken,
        chatId: settings.notifications.chatId,
      },
    };
  }

  async function persistSettings() {
    const result = await api<{ settings: TelegramAdminSettings; message: string }>({
        action: 'save',
        settings: settingsPayload(),
      });
    setSettings(result.settings);
    setLoginSecret('');
    setStorefrontToken('');
    setNotificationToken('');
    return result;
  }

  async function save() {
    setBusy(true); setActiveAction('save'); setError(null); setNotice(null);
    try {
      const result = await persistSettings();
      setNotice(result.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить настройки.');
    } finally { setBusy(false); setActiveAction(null); }
  }

  async function saveAndRun(action: 'test_notifications' | 'configure_storefront') {
    setBusy(true); setActiveAction(action); setError(null); setNotice(null);
    try {
      await persistSettings();
      const result = await api<{ message: string }>({ action });
      setNotice(result.message);
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Операция не выполнена.'); }
    finally { setBusy(false); setActiveAction(null); }
  }

  const canConfigureStorefront = settings.storefront.enabled
    && Boolean(storefrontToken || settings.storefront.tokenUsable)
    && Boolean(settings.storefront.webAppUrl.trim());
  const canTestNotifications = settings.notifications.enabled
    && Boolean(notificationToken || settings.notifications.tokenUsable)
    && Boolean(settings.notifications.chatId.trim());

  if (loading) return <p className="py-12 text-center text-sm text-[var(--sp-ink-tertiary)]">Загружаем настройки…</p>;

  return (
    <div className="admin-page mx-auto max-w-5xl space-y-6">
      <header className="border-b border-[var(--sp-line)] pb-5">
        <h1 className="font-extended text-2xl font-bold tracking-[-0.025em]">Интеграции</h1>
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-[var(--sp-ink-secondary)]">Подключайте внешние сервисы магазина. Секретные ключи доступны только серверу.</p>
      </header>
      <GeminiSettingsPanel />
      <header className="border-b border-[var(--sp-line)] pb-5 pt-2">
        <h2 className="font-extended text-xl font-bold tracking-[-0.02em]">Telegram</h2>
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-[var(--sp-ink-secondary)]">Вход покупателей, магазин внутри Telegram и уведомления о новых заявках настраиваются независимо.</p>
      </header>
      {error || notice ? <p role={error ? 'alert' : 'status'} className={`sp-alert text-sm ${error ? 'sp-alert-danger' : 'sp-alert-success'}`}>{error || notice}</p> : null}
      <div className="space-y-5">
        <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3"><LogIn className="mt-0.5 size-5 text-[var(--sp-brand)]" /><div><h2 className="font-extended text-lg font-bold">Вход покупателей через Telegram</h2><p className="mt-1 text-xs leading-5 text-[var(--sp-ink-tertiary)]">Покупатель собирает корзину без входа и подтверждает Telegram-аккаунт только перед оформлением.</p></div></div>
            <IntegrationToggle
              checked={settings.login.enabled}
              onChange={(enabled) => setSettings((current) => ({ ...current, login: { ...current.login, enabled } }))}
              label="Вход покупателей через Telegram"
            />
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-xs font-bold">Client ID<input name="telegram-login-username" autoComplete="username" inputMode="numeric" value={settings.login.clientId} onChange={(event) => setSettings((current) => ({ ...current, login: { ...current.login, clientId: event.target.value.replace(/\D/g, '') } }))} placeholder="123456789" className={inputClass} /></label>
            <label className="text-xs font-bold">Client Secret<input name="telegram-login-client-secret" type="password" autoComplete="new-password" value={loginSecret} onChange={(event) => setLoginSecret(event.target.value)} placeholder={secretPlaceholder(settings.login.clientSecretConfigured, settings.login.clientSecretUsable, settings.login.clientSecretLast4, 'Вставьте секрет из BotFather')} aria-describedby={!settings.login.clientSecretUsable && settings.login.clientSecretConfigured ? 'telegram-login-secret-warning' : undefined} className={inputClass} /></label>
            <label className="text-xs font-bold md:col-span-2">Redirect URI<input type="url" value={settings.login.redirectUri} onChange={(event) => setSettings((current) => ({ ...current, login: { ...current.login, redirectUri: event.target.value } }))} placeholder="https://example.com/api/auth/telegram/callback" className={inputClass} /></label>
          </div>
          {!settings.login.clientSecretUsable && settings.login.clientSecretConfigured ? <p id="telegram-login-secret-warning" className="mt-3 text-xs leading-5 text-[var(--sp-danger)]">Сохранённый Client Secret невозможно использовать. Введите его заново перед следующей проверкой входа.</p> : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex min-h-11 items-center gap-3 rounded-lg border border-[var(--sp-line)] px-3 text-xs font-bold"><input type="checkbox" checked={settings.login.requestPhone} onChange={(event) => setSettings((current) => ({ ...current, login: { ...current.login, requestPhone: event.target.checked } }))} className="size-4 accent-[var(--sp-brand)]" />Запрашивать подтверждённый телефон</label>
            <label className="flex min-h-11 items-center gap-3 rounded-lg border border-[var(--sp-line)] px-3 text-xs font-bold"><input type="checkbox" checked={settings.login.allowBotMessages} onChange={(event) => setSettings((current) => ({ ...current, login: { ...current.login, allowBotMessages: event.target.checked } }))} className="size-4 accent-[var(--sp-brand)]" />Разрешить боту писать покупателю</label>
          </div>
          <div className="mt-5 rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-4 text-xs leading-5 text-[var(--sp-ink-secondary)]">
            <p className="font-bold text-[var(--sp-ink)]">Что добавить в BotFather → Bot Settings → Web Login</p>
            <dl className="mt-2 grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)]"><dt>Trusted origin</dt><dd className="break-all font-mono text-[var(--sp-ink)]">{trustedOrigin}</dd><dt>Redirect URI</dt><dd className="break-all font-mono text-[var(--sp-ink)]">{settings.login.redirectUri || 'Не задан'}</dd><dt>Advanced</dt><dd>Оставьте алгоритм RS256.</dd><dt>Native Login</dt><dd>Не включайте: он нужен только отдельным приложениям iOS и Android.</dd></dl>
            <div className="mt-3 flex flex-wrap gap-3"><a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-bold text-[var(--sp-brand)]">Открыть BotFather <ExternalLink className="size-3.5" /></a><a href="https://core.telegram.org/bots/telegram-login" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-bold text-[var(--sp-brand)]">Инструкция Telegram <ExternalLink className="size-3.5" /></a></div>
          </div>
        </form>

        <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <Bot className="mt-0.5 size-5 text-[var(--sp-brand)]" />
              <div>
                <h2 className="font-extended text-lg font-bold">Магазин внутри Telegram</h2>
                <p className="mt-1 text-xs leading-5 text-[var(--sp-ink-tertiary)]">Добавляет в выбранного бота кнопку «Открыть магазин» и открывает по ней витрину сайта.</p>
              </div>
            </div>
            <IntegrationToggle
              checked={settings.storefront.enabled}
              onChange={(enabled) => setSettings((current) => ({ ...current, storefront: { ...current.storefront, enabled } }))}
              label="Магазин внутри Telegram"
            />
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-xs font-bold">Токен бота<input name="telegram-storefront-token" type="password" autoComplete="new-password" value={storefrontToken} onChange={(event) => setStorefrontToken(event.target.value)} placeholder={secretPlaceholder(settings.storefront.tokenConfigured, settings.storefront.tokenUsable, settings.storefront.tokenLast4, '123456:ABC…')} aria-describedby={!settings.storefront.tokenUsable && settings.storefront.tokenConfigured ? 'telegram-storefront-token-warning' : undefined} className={inputClass} /></label><label className="text-xs font-bold">Username бота<input name="telegram-storefront-username" autoComplete="username" value={settings.storefront.botUsername} onChange={(event) => setSettings((current) => ({ ...current, storefront: { ...current.storefront, botUsername: event.target.value.replace(/^@/, '') } }))} placeholder="store_shop_bot" className={inputClass} /></label><label className="text-xs font-bold md:col-span-2">HTTPS-адрес магазина<input type="url" value={settings.storefront.webAppUrl} onChange={(event) => setSettings((current) => ({ ...current, storefront: { ...current.storefront, webAppUrl: event.target.value } }))} placeholder="https://example.com/ru" className={inputClass} /></label></div>
          {!settings.storefront.tokenUsable && settings.storefront.tokenConfigured ? <p id="telegram-storefront-token-warning" className="mt-3 text-xs leading-5 text-[var(--sp-danger)]">Сохранённый токен Mini App невозможно использовать. Вставьте токен бота заново.</p> : null}
          <div className="mt-4 rounded-lg bg-[var(--sp-surface-inset)] p-4 text-xs leading-5 text-[var(--sp-ink-secondary)]">
            Эта кнопка не открывает магазин в админ-панели. Она сохраняет настройки и добавляет кнопку в самом Telegram-боте — рядом со строкой сообщения или в его меню.
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" disabled={busy || !canConfigureStorefront} onClick={() => void saveAndRun('configure_storefront')} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--sp-line)] px-4 text-xs font-bold disabled:opacity-40"><ExternalLink className="size-4" />{activeAction === 'configure_storefront' ? 'Добавляем кнопку…' : 'Сохранить и добавить кнопку в Telegram'}</button>
            {settings.storefront.botUsername ? <a href={`https://t.me/${settings.storefront.botUsername}`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 px-2 text-xs font-bold text-[var(--sp-brand)]">Открыть @{settings.storefront.botUsername}<ExternalLink className="size-3.5" /></a> : null}
          </div>
        </form>

        <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <Send className="mt-0.5 size-5 text-[var(--sp-brand)]" />
              <div>
                <h2 className="font-extended text-lg font-bold">Уведомления о новых заказах</h2>
                <p className="mt-1 text-xs leading-5 text-[var(--sp-ink-tertiary)]">После оформления заказа бот отправит сообщение вам или в рабочую группу.</p>
              </div>
            </div>
            <IntegrationToggle
              checked={settings.notifications.enabled}
              onChange={(enabled) => setSettings((current) => ({ ...current, notifications: { ...current.notifications, enabled } }))}
              label="Уведомления о новых заказах"
            />
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-xs font-bold">Токен бота<input name="telegram-notification-token" type="password" autoComplete="new-password" value={notificationToken} onChange={(event) => setNotificationToken(event.target.value)} placeholder={secretPlaceholder(settings.notifications.tokenConfigured, settings.notifications.tokenUsable, settings.notifications.tokenLast4, '123456:ABC…')} aria-describedby={!settings.notifications.tokenUsable && settings.notifications.tokenConfigured ? 'telegram-notification-token-warning' : undefined} className={inputClass} /></label><label className="text-xs font-bold">Chat ID<input name="telegram-notification-chat" autoComplete="username" value={settings.notifications.chatId} onChange={(event) => setSettings((current) => ({ ...current, notifications: { ...current.notifications, chatId: event.target.value } }))} placeholder="123456789 или -100…" className={inputClass} /></label></div>
          {!settings.notifications.tokenUsable && settings.notifications.tokenConfigured ? <p id="telegram-notification-token-warning" className="mt-3 text-xs leading-5 text-[var(--sp-danger)]">Сохранённый токен уведомлений невозможно использовать. Вставьте токен из BotFather заново — после этого кнопка проверки станет доступна.</p> : null}
          <div className="mt-4 rounded-lg bg-[var(--sp-surface-inset)] p-4 text-xs leading-5 text-[var(--sp-ink-secondary)]">
            Бот уведомлений может быть отдельным. Перед проверкой откройте его в Telegram и нажмите «Start» — Telegram не разрешает боту первым начать личный диалог.
          </div>
          <button type="button" disabled={busy || !canTestNotifications} onClick={() => void saveAndRun('test_notifications')} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--sp-line)] px-4 text-xs font-bold disabled:opacity-40"><CheckCircle2 className="size-4" />{activeAction === 'test_notifications' ? 'Отправляем тест…' : 'Сохранить и отправить тест'}</button>
        </form>

        <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center"><p className="flex items-center gap-2 text-xs text-[var(--sp-ink-tertiary)]"><ShieldCheck className="size-4" />Секреты шифруются на сервере и не возвращаются в браузер.</p><button type="button" onClick={() => void save()} disabled={busy} className="min-h-11 rounded-lg bg-[var(--sp-brand)] px-6 text-xs font-bold text-[var(--sp-on-brand)] disabled:opacity-50">{activeAction === 'save' ? 'Сохраняем…' : 'Сохранить настройки'}</button></div>
      </div>
    </div>
  );
}
