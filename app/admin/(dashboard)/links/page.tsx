'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Link2, Plus, Save, Trash2 } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminRepository } from '@/lib/repositories/adminRepository';
import { initialSiteSettings } from '@/lib/seedData';
import { isSafeLinkHubHref } from '@/lib/settings/linkHub';
import type { Language, LinkHubIcon, LinkHubLink, LinkHubSettings, SiteSettings } from '@/types';

const locales: Array<{ value: Language; label: string }> = [
  { value: 'ru', label: 'RU' }, { value: 'uz', label: 'UZ' },
  { value: 'en', label: 'EN' }, { value: 'zh', label: 'ZH' },
];
const iconOptions: Array<{ value: LinkHubIcon; label: string }> = [
  { value: 'catalog', label: 'Каталог' }, { value: 'telegram', label: 'Telegram' },
  { value: 'instagram', label: 'Instagram' }, { value: 'phone', label: 'Телефон' },
  { value: 'location', label: 'Адрес' }, { value: 'delivery', label: 'Доставка' },
  { value: 'bag', label: 'Конструктор пакета' }, { value: 'website', label: 'Сайт' },
];
type TextField = 'title' | 'description' | 'highlightTitle' | 'highlightDescription';
const suffix: Record<Language, 'Ru' | 'Uz' | 'En' | 'Zh'> = { ru: 'Ru', uz: 'Uz', en: 'En', zh: 'Zh' };
const textKey = (field: TextField, locale: Language) => `${field}${suffix[locale]}` as keyof LinkHubSettings;
const labelKey = (locale: Language) => `label${suffix[locale]}` as keyof LinkHubLink;
const fallbackSettings = () => structuredClone(initialSiteSettings.linkHub!);

export default function AdminLinkHubPage() {
  const [value, setValue] = useState<LinkHubSettings>(fallbackSettings);
  const [locale, setLocale] = useState<Language>('ru');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState('');
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    let active = true;
    AdminRepository.getSettings()
      .then((settings) => { if (active) setValue(settings.linkHub || fallbackSettings()); })
      .catch((error: unknown) => { if (active) setPageError(error instanceof Error ? error.message : 'Не удалось загрузить страницу ссылок.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const preventLoss = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', preventLoss);
    return () => window.removeEventListener('beforeunload', preventLoss);
  }, [dirty]);

  const unsafeLinks = useMemo(() => value.links.filter((link) => !isSafeLinkHubHref(link.href)), [value.links]);
  const update = (patch: Partial<LinkHubSettings>) => {
    setValue((current) => ({ ...current, ...patch })); setDirty(true); setNotice('');
  };
  const updateText = (field: TextField, next: string) => update({ [textKey(field, locale)]: next });
  const updateLink = (id: string, patch: Partial<LinkHubLink>) => update({ links: value.links.map((link) => link.id === id ? { ...link, ...patch } : link) });
  const textValue = (field: TextField) => String(value[textKey(field, locale)] || '');

  function addLink() {
    update({ links: [...value.links, { id: `link-${crypto.randomUUID()}`, labelRu: 'Новая ссылка', labelUz: '', labelEn: '', labelZh: '', href: '/', icon: 'website', enabled: true }] });
  }
  function moveLink(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.links.length) return;
    const links = [...value.links];
    [links[index], links[target]] = [links[target], links[index]];
    update({ links });
  }
  async function save() {
    setPageError(''); setNotice('');
    if (!value.titleRu.trim()) { setPageError('Добавьте основной заголовок на русском языке.'); return; }
    if (unsafeLinks.length > 0) { setPageError('Исправьте небезопасные ссылки. Разрешены внутренние пути, HTTPS, tel: и mailto:.'); return; }
    setSaving(true);
    try {
      const saved = await AdminRepository.saveSettings({ linkHub: value } as Partial<SiteSettings>);
      setValue(saved.linkHub || value); setDirty(false);
      setNotice('Страница ссылок сохранена. Публичная версия использует эти настройки после обновления кэша.');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Страница ссылок не сохранена.');
    } finally { setSaving(false); }
  }

  return (
    <div className="admin-page mx-auto max-w-6xl space-y-6">
      <AdminPageHeader title="Страница ссылок" description="Фирменная мобильная страница для соцсетей, QR-кодов и профилей — без стороннего Linktree. Адрес страницы фиксирован: /links." action={<Link href="/ru/links" target="_blank" className="admin-button-secondary"><Eye className="size-4" aria-hidden="true" /> Открыть страницу</Link>} />
      {(pageError || notice) ? <p className={`sp-alert text-sm ${pageError ? 'sp-alert-danger' : 'sp-alert-success'}`} role={pageError ? 'alert' : 'status'} aria-live="polite">{pageError || notice}</p> : null}
      {loading ? <p className="py-12 text-center text-sm text-[var(--sp-ink-tertiary)]">Загрузка страницы ссылок…</p> : (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-5">
            <section className="admin-panel space-y-5 p-5 md:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div><h2 className="admin-section-heading">Публикация и тексты</h2><p className="admin-section-description">Русский текст используется как fallback, если перевод для выбранного языка пуст.</p></div>
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] px-3 text-xs font-bold">
                  <input type="checkbox" checked={value.enabled} onChange={(event) => update({ enabled: event.target.checked })} className="size-4 accent-[var(--sp-brand)]" />
                  {value.enabled ? <Eye className="size-4 text-[var(--sp-brand)]" aria-hidden="true" /> : <EyeOff className="size-4 text-[var(--sp-ink-muted)]" aria-hidden="true" />}{value.enabled ? 'Страница опубликована' : 'Страница скрыта'}
                </label>
              </div>
              <div className="flex gap-1 rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)] p-1" role="tablist" aria-label="Язык редактирования">
                {locales.map((item) => <button key={item.value} type="button" role="tab" aria-selected={locale === item.value} onClick={() => setLocale(item.value)} className={`min-h-10 flex-1 rounded-[var(--sp-radius-control-inner)] px-3 text-xs font-bold transition-colors ${locale === item.value ? 'bg-[var(--sp-surface)] text-[var(--sp-brand)] shadow-sm' : 'text-[var(--sp-ink-tertiary)] hover:text-[var(--sp-ink)]'}`}>{item.label}</button>)}
              </div>
              <label className="admin-field-label">Заголовок · {locale.toUpperCase()}<input value={textValue('title')} onChange={(event) => updateText('title', event.target.value)} className="admin-control mt-1.5 font-normal" maxLength={160} /></label>
              <label className="admin-field-label">Описание · {locale.toUpperCase()}<textarea value={textValue('description')} onChange={(event) => updateText('description', event.target.value)} className="admin-control mt-1.5 min-h-24 resize-y py-3 font-normal" maxLength={500} /></label>
              <div className="admin-panel-muted space-y-4 p-4">
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-xs font-bold"><input type="checkbox" checked={value.highlightEnabled} onChange={(event) => update({ highlightEnabled: event.target.checked })} className="size-4 accent-[var(--sp-brand)]" />Показывать информационный акцент</label>
                <label className="admin-field-label">Заголовок акцента · {locale.toUpperCase()}<input value={textValue('highlightTitle')} onChange={(event) => updateText('highlightTitle', event.target.value)} className="admin-control mt-1.5 font-normal" maxLength={160} /></label>
                <label className="admin-field-label">Описание акцента · {locale.toUpperCase()}<textarea value={textValue('highlightDescription')} onChange={(event) => updateText('highlightDescription', event.target.value)} className="admin-control mt-1.5 min-h-20 resize-y py-3 font-normal" maxLength={500} /></label>
              </div>
            </section>
            <section className="admin-panel overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-[var(--sp-line)] p-5 sm:flex-row sm:items-center sm:justify-between md:px-6">
                <div><h2 className="admin-section-heading">Кнопки и ссылки</h2><p className="admin-section-description">До 20 ссылок. Порядок сверху вниз соответствует публичной странице.</p></div>
                <button type="button" onClick={addLink} disabled={value.links.length >= 20} className="admin-button-secondary shrink-0 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="size-4" aria-hidden="true" /> Добавить ссылку</button>
              </div>
              <div className="divide-y divide-[var(--sp-line)]">
                {value.links.map((link, index) => {
                  const unsafe = !isSafeLinkHubHref(link.href);
                  return <article key={link.id} className="space-y-4 p-5 md:px-6">
                    <div className="flex items-center gap-2">
                      <GripVertical className="size-4 shrink-0 text-[var(--sp-ink-muted)]" aria-hidden="true" />
                      <strong className="min-w-0 flex-1 truncate text-sm">{String(link[labelKey(locale)] || link.labelRu || `Ссылка ${index + 1}`)}</strong>
                      <button type="button" onClick={() => updateLink(link.id, { enabled: !link.enabled })} className="admin-icon-button" aria-label={link.enabled ? 'Скрыть ссылку' : 'Показать ссылку'} title={link.enabled ? 'Скрыть ссылку' : 'Показать ссылку'}>{link.enabled ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</button>
                      <button type="button" onClick={() => moveLink(index, -1)} disabled={index === 0} className="admin-icon-button disabled:opacity-30" aria-label="Поднять ссылку" title="Поднять ссылку"><ArrowUp className="size-4" /></button>
                      <button type="button" onClick={() => moveLink(index, 1)} disabled={index === value.links.length - 1} className="admin-icon-button disabled:opacity-30" aria-label="Опустить ссылку" title="Опустить ссылку"><ArrowDown className="size-4" /></button>
                      <button type="button" onClick={() => update({ links: value.links.filter((item) => item.id !== link.id) })} className="admin-icon-button text-[var(--sp-danger)]" aria-label="Удалить ссылку" title="Удалить ссылку"><Trash2 className="size-4" /></button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem]">
                      <label className="admin-field-label">Название · {locale.toUpperCase()}<input value={String(link[labelKey(locale)] || '')} onChange={(event) => updateLink(link.id, { [labelKey(locale)]: event.target.value })} className="admin-control mt-1.5 font-normal" maxLength={100} /></label>
                      <label className="admin-field-label">Иконка<select value={link.icon} onChange={(event) => updateLink(link.id, { icon: event.target.value as LinkHubIcon })} className="admin-control mt-1.5 font-normal">{iconOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                    </div>
                    <label className="admin-field-label">Адрес<span className="mt-1 block text-[11px] font-normal leading-4 text-[var(--sp-ink-tertiary)]">Внутренний путь (/catalog), HTTPS-ссылка, tel: или mailto:.</span><input value={link.href} onChange={(event) => updateLink(link.id, { href: event.target.value })} className="admin-control mt-1.5 font-mono text-xs font-normal" aria-invalid={unsafe || undefined} maxLength={2000} inputMode="url" />{unsafe ? <span className="mt-1.5 block text-xs font-normal text-[var(--sp-danger)]">Ссылка имеет недопустимый или небезопасный формат.</span> : null}</label>
                  </article>;
                })}
                {value.links.length === 0 ? <div className="p-8 text-center text-sm text-[var(--sp-ink-tertiary)]"><Link2 className="mx-auto mb-3 size-6" aria-hidden="true" />Добавьте первую ссылку — пустая страница не поможет посетителю.</div> : null}
              </div>
            </section>
          </div>
          <aside className="admin-panel space-y-4 p-5 xl:sticky xl:top-5">
            <div><span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--sp-ink-muted)]">Публичный адрес</span><p className="mt-1 break-all font-mono text-xs text-[var(--sp-ink-secondary)]">/ru/links</p></div>
            <div className="rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-canvas)] p-4 text-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--sp-brand)] text-xs font-bold text-white">{value.links.filter((link) => link.enabled).length}</div><p className="mt-3 line-clamp-2 font-extended text-sm font-bold">{textValue('title') || value.titleRu}</p><p className="mt-1 text-xs leading-5 text-[var(--sp-ink-tertiary)]">активных кнопок: {value.links.filter((link) => link.enabled).length}</p></div>
            <Link href="/ru/links" target="_blank" className="admin-button-secondary w-full"><Eye className="size-4" aria-hidden="true" /> Предпросмотр</Link>
            <button type="button" onClick={() => void save()} disabled={saving || !dirty} className="admin-button-primary w-full disabled:cursor-not-allowed disabled:opacity-50"><Save className="size-4" aria-hidden="true" />{saving ? 'Сохранение…' : dirty ? 'Сохранить изменения' : 'Изменения сохранены'}</button>
            <p className="text-xs leading-5 text-[var(--sp-ink-tertiary)]">Изменения применяются без миграции. Каталог, контакты и интеграции не затрагиваются.</p>
          </aside>
        </div>
      )}
    </div>
  );
}
