'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ContactRound,
  Heart,
  LoaderCircle,
  LogOut,
  MapPin,
  Phone,
  Save,
  Send,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { readCustomerProfileDraft, writeCustomerProfileDraft } from '@/lib/customer/profileDraft';

interface CustomerProfile {
  name: string;
  phone: string;
  company: string;
  address: string;
  inn: string;
  username?: string;
}

interface CustomerStatus {
  authenticated: boolean;
  customer: CustomerProfile | null;
}

const emptyProfile: CustomerProfile = { name: '', phone: '+998 ', company: '', address: '', inn: '' };

const copyByLanguage = {
  ru: {
    back: 'Назад', title: 'Профиль и настройки', intro: 'Контактные данные, история заявок и настройки магазина — в одном месте.',
    guest: 'Гостевой профиль', signedIn: 'Профиль Telegram', guestHint: 'Данные сохранятся только на этом устройстве.', signedHint: 'Данные синхронизируются с вашим Telegram-профилем.',
    login: 'Войти через Telegram', logout: 'Выйти', contactTitle: 'Контактные данные', contactHint: 'Имя и телефон будут подставляться при оформлении заявки.',
    name: 'Контактное лицо', phone: 'Телефон', company: 'Компания', address: 'Адрес доставки', inn: 'ИНН', optional: 'необязательно',
    namePlaceholder: 'Как к вам обращаться', companyPlaceholder: 'Название организации', addressPlaceholder: 'Город, улица, дом', innPlaceholder: 'ИНН организации',
    save: 'Сохранить данные', saving: 'Сохраняем…', saved: 'Данные профиля сохранены', error: 'Не удалось сохранить данные. Попробуйте ещё раз.', validation: 'Укажите имя и корректный номер телефона.',
    sections: 'Разделы профиля', orders: 'Мои заявки', favorites: 'Избранное', language: 'Язык интерфейса',
  },
  uz: {
    back: 'Orqaga', title: 'Profil va sozlamalar', intro: 'Aloqa ma’lumotlari, arizalar tarixi va do‘kon sozlamalari bir joyda.',
    guest: 'Mehmon profili', signedIn: 'Telegram profili', guestHint: 'Ma’lumotlar faqat ushbu qurilmada saqlanadi.', signedHint: 'Ma’lumotlar Telegram profilingiz bilan sinxronlanadi.',
    login: 'Telegram orqali kirish', logout: 'Chiqish', contactTitle: 'Aloqa ma’lumotlari', contactHint: 'Ism va telefon ariza rasmiylashtirishda avtomatik to‘ldiriladi.',
    name: 'Aloqa uchun shaxs', phone: 'Telefon', company: 'Kompaniya', address: 'Yetkazib berish manzili', inn: 'STIR', optional: 'ixtiyoriy',
    namePlaceholder: 'Sizga qanday murojaat qilaylik', companyPlaceholder: 'Tashkilot nomi', addressPlaceholder: 'Shahar, ko‘cha, uy', innPlaceholder: 'Tashkilot STIRi',
    save: 'Ma’lumotlarni saqlash', saving: 'Saqlanmoqda…', saved: 'Profil ma’lumotlari saqlandi', error: 'Ma’lumotlarni saqlab bo‘lmadi. Qayta urinib ko‘ring.', validation: 'Ism va to‘g‘ri telefon raqamini kiriting.',
    sections: 'Profil bo‘limlari', orders: 'Mening arizalarim', favorites: 'Tanlanganlar', language: 'Interfeys tili',
  },
  en: {
    back: 'Back', title: 'Profile and settings', intro: 'Contact details, request history, and store preferences in one place.',
    guest: 'Guest profile', signedIn: 'Telegram profile', guestHint: 'Your details are stored only on this device.', signedHint: 'Your details are synced with your Telegram profile.',
    login: 'Sign in with Telegram', logout: 'Sign out', contactTitle: 'Contact details', contactHint: 'Your name and phone will be prefilled at checkout.',
    name: 'Contact person', phone: 'Phone', company: 'Company', address: 'Delivery address', inn: 'Tax ID', optional: 'optional',
    namePlaceholder: 'How should we address you?', companyPlaceholder: 'Organization name', addressPlaceholder: 'City, street, building', innPlaceholder: 'Organization tax ID',
    save: 'Save details', saving: 'Saving…', saved: 'Profile details saved', error: 'Could not save your details. Please try again.', validation: 'Enter your name and a valid phone number.',
    sections: 'Profile sections', orders: 'My requests', favorites: 'Favorites', language: 'Interface language',
  },
} as const;

export function CustomerProfilePage() {
  const { language } = useLanguage();
  const copy = copyByLanguage[language];
  const [profile, setProfile] = useState<CustomerProfile>(emptyProfile);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/customer', { cache: 'no-store' })
      .then((response) => response.json() as Promise<CustomerStatus>)
      .then((status) => {
        if (cancelled) return;
        setAuthenticated(status.authenticated);
        const local = readCustomerProfileDraft();
        setProfile({ ...emptyProfile, ...(local || {}), ...(status.customer || {}) });
      })
      .catch(() => {
        if (!cancelled) setProfile({ ...emptyProfile, ...(readCustomerProfileDraft() || {}) });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function updateField(field: keyof CustomerProfile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
    setMessage(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const phoneDigits = profile.phone.replace(/\D/g, '');
    if (profile.name.trim().length < 2 || phoneDigits.length < 9) {
      setMessage({ kind: 'error', text: copy.validation });
      return;
    }

    setSaving(true);
    setMessage(null);
    const normalized = {
      name: profile.name.trim(), phone: profile.phone.trim(), company: profile.company.trim(),
      address: profile.address.trim(), inn: profile.inn.trim(),
    };
    try {
      writeCustomerProfileDraft(normalized);
      if (authenticated) {
        const response = await fetch('/api/auth/customer', {
          method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(normalized),
        });
        if (!response.ok) throw new Error('profile-save-failed');
      }
      setProfile((current) => ({ ...current, ...normalized }));
      setMessage({ kind: 'success', text: copy.saved });
    } catch {
      setMessage({ kind: 'error', text: copy.error });
    } finally {
      setSaving(false);
    }
  }

  function login() {
    window.location.replace(new URL(`/api/auth/telegram/start?returnTo=${encodeURIComponent(window.location.pathname)}`, window.location.origin).toString());
  }

  async function logout() {
    await fetch('/api/auth/customer', { method: 'DELETE' });
    setAuthenticated(false);
  }

  const initials = profile.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SP';
  const quickLinks = [
    { href: '/orders' as const, label: copy.orders, icon: Clock3 },
    { href: '/favorites' as const, label: copy.favorites, icon: Heart },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-[calc(var(--sp-mobile-nav-height)+env(safe-area-inset-bottom)+2rem)] pt-5 sm:px-6 md:pb-12 md:pt-9">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--sp-brand)]"><ArrowLeft className="size-4" aria-hidden="true" />{copy.back}</Link>
      <div className="mt-2"><h1 className="font-extended text-2xl font-bold tracking-[-0.025em] text-[var(--sp-ink)] sm:text-3xl">{copy.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--sp-ink-secondary)]">{copy.intro}</p></div>

      <div className="mt-7 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
        <form onSubmit={save} className="rounded-[var(--sp-radius-card)] bg-[var(--sp-surface)] p-4 ring-1 ring-inset ring-[var(--sp-line)] sm:p-6">
          <div className="flex items-center gap-4 border-b border-[var(--sp-line-soft)] pb-5">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--sp-brand)] text-lg font-bold text-[var(--sp-on-brand)]">{initials}</span>
            <div className="min-w-0 flex-1"><h2 className="font-extended text-lg font-bold text-[var(--sp-ink)]">{authenticated ? copy.signedIn : copy.guest}</h2><p className="mt-1 text-xs leading-5 text-[var(--sp-ink-secondary)]">{authenticated ? copy.signedHint : copy.guestHint}</p></div>
          </div>

          <div className="mt-5"><h2 className="font-extended text-lg font-bold text-[var(--sp-ink)]">{copy.contactTitle}</h2><p className="mt-1 text-xs leading-5 text-[var(--sp-ink-secondary)]">{copy.contactHint}</p></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <ProfileField icon={ContactRound} label={copy.name} value={profile.name} onChange={(value) => updateField('name', value)} placeholder={copy.namePlaceholder} autoComplete="name" required />
            <ProfileField icon={Phone} label={copy.phone} value={profile.phone} onChange={(value) => updateField('phone', value)} placeholder="+998 90 123 45 67" autoComplete="tel" type="tel" required />
            <ProfileField icon={Building2} label={`${copy.company} · ${copy.optional}`} value={profile.company} onChange={(value) => updateField('company', value)} placeholder={copy.companyPlaceholder} autoComplete="organization" />
            <ProfileField icon={MapPin} label={`${copy.address} · ${copy.optional}`} value={profile.address} onChange={(value) => updateField('address', value)} placeholder={copy.addressPlaceholder} autoComplete="street-address" />
            <div className="sm:col-span-2"><ProfileField icon={Building2} label={`${copy.inn} · ${copy.optional}`} value={profile.inn} onChange={(value) => updateField('inn', value)} placeholder={copy.innPlaceholder} /></div>
          </div>

          {message ? <p className={`mt-4 flex items-center gap-2 rounded-[var(--sp-radius-control-inner)] px-3 py-2.5 text-xs ${message.kind === 'success' ? 'bg-[color-mix(in_srgb,var(--sp-success)_10%,var(--sp-surface))] text-[var(--sp-success)]' : 'bg-[color-mix(in_srgb,var(--sp-danger)_8%,var(--sp-surface))] text-[var(--sp-danger)]'}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.kind === 'success' ? <CheckCircle2 className="size-4" aria-hidden="true" /> : null}{message.text}</p> : null}

          <button type="submit" disabled={saving || loading} className="mt-5 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-5 text-sm font-semibold text-[var(--sp-on-brand)] hover:bg-[var(--sp-brand-deep)] disabled:cursor-wait disabled:opacity-60 sm:w-auto">
            {saving ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}{saving ? copy.saving : copy.save}
          </button>
        </form>

        <aside className="space-y-4">
          {!authenticated ? <button type="button" onClick={login} className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-4 text-sm font-semibold text-[var(--sp-on-brand)]"><Send className="size-4" aria-hidden="true" />{copy.login}</button> : null}
          <section className="rounded-[var(--sp-radius-card)] bg-[var(--sp-surface)] p-4 ring-1 ring-inset ring-[var(--sp-line)]"><h2 className="font-extended text-base font-bold text-[var(--sp-ink)]">{copy.sections}</h2><nav className="mt-3 divide-y divide-[var(--sp-line-soft)]">{quickLinks.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex min-h-12 items-center gap-3 text-sm font-semibold text-[var(--sp-ink)]"><Icon className="size-5 text-[var(--sp-brand)]" aria-hidden="true" /><span className="min-w-0 flex-1">{label}</span><ChevronRight className="size-4 text-[var(--sp-ink-muted)]" aria-hidden="true" /></Link>)}</nav></section>
          <section className="flex min-h-14 items-center justify-between gap-4 rounded-[var(--sp-radius-card)] bg-[var(--sp-surface)] px-4 ring-1 ring-inset ring-[var(--sp-line)]"><span className="text-sm font-semibold text-[var(--sp-ink)]">{copy.language}</span><LanguageSwitcher /></section>
          {authenticated ? <button type="button" onClick={() => void logout()} className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface)] px-4 text-sm font-semibold text-[var(--sp-danger)]"><LogOut className="size-4" aria-hidden="true" />{copy.logout}</button> : null}
        </aside>
      </div>
    </main>
  );
}

function ProfileField({ icon: Icon, label, value, onChange, placeholder, type = 'text', autoComplete, required = false }: { icon: typeof ContactRound; label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; autoComplete?: string; required?: boolean }) {
  return <label className="block text-xs font-semibold text-[var(--sp-ink)]"><span>{label}</span><span className="mt-2 flex min-h-12 items-center gap-2.5 rounded-[var(--sp-radius-control)] border border-[var(--sp-line-strong)] bg-[var(--sp-control)] px-3 focus-within:border-[var(--sp-brand)] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--sp-brand)_16%,transparent)]"><Icon className="size-4 shrink-0 text-[var(--sp-ink-muted)]" aria-hidden="true" /><input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} className="min-w-0 flex-1 bg-transparent py-3 text-base font-normal text-[var(--sp-ink)] outline-none placeholder:text-[var(--sp-ink-muted)]" /></span></label>;
}
