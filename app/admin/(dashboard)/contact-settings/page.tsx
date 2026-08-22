'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { Clock3, Mail, MapPin, MessageCircle, Phone, Save } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AiTranslateButton, type TranslationLanguage } from '@/components/admin/AiTranslateButton';
import { AdminRepository } from '@/lib/repositories/adminRepository';
import { contactSettingsSchema } from '@/lib/validation/adminContent';
import type { SiteSettings } from '@/types';

type ContactForm = SiteSettings['contacts'];

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="font-compact text-xs font-bold text-[var(--sp-ink)]">{label}</span>
      {hint ? <span className="ml-2 text-[11px] text-[var(--sp-ink-tertiary)]">{hint}</span> : null}
      <span className="mt-2 block">{children}</span>
      {error ? <span className="mt-1.5 block text-xs text-[var(--sp-danger)]">{error}</span> : null}
    </label>
  );
}

const inputClass = 'admin-control text-sm';

export default function ContactSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [pageError, setPageError] = useState('');
  const {
    register,
    control,
    setValue,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSettingsSchema),
    defaultValues: {
      phone1: '',
      phone2: '',
      email: '',
      addressRu: '',
      addressUz: '',
      addressEn: '',
      workingHoursRu: '',
      workingHoursUz: '',
      workingHoursEn: '',
      telegram: '',
      whatsapp: '',
      cityRu: '',
      cityUz: '',
      cityEn: '',
      mapIframe: '',
    },
  });

  const localizedContacts = useWatch({ control });

  function setLocalizedContact(
    base: 'city' | 'address' | 'workingHours',
    language: TranslationLanguage,
    value: string,
  ) {
    const suffix = language === 'ru' ? 'Ru' : language === 'uz' ? 'Uz' : 'En';
    const field = `${base}${suffix}` as keyof ContactForm;
    setValue(field, value, { shouldDirty: true, shouldValidate: true });
  }

  useEffect(() => {
    let active = true;
    AdminRepository.getSettings()
      .then((settings) => {
        if (active) reset(settings.contacts);
      })
      .catch((error) => {
        if (active) setPageError(error instanceof Error ? error.message : 'Не удалось загрузить контакты.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [reset]);

  const save = handleSubmit(async (contacts) => {
    setNotice('');
    setPageError('');
    try {
      await AdminRepository.saveSettings({ contacts });
      setNotice('Контакты сохранены и будут использоваться в шапке, подвале и на странице контактов.');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Контакты не сохранены.');
    }
  });

  return (
    <div className="admin-page mx-auto max-w-6xl space-y-6">
      <AdminPageHeader
        title="Контакты магазина"
        description="Единый источник адреса, телефонов, графика работы и ссылок на мессенджеры для всего сайта."
      />

      {(pageError || notice) ? (
        <p className={`rounded-lg border px-4 py-3 text-sm ${pageError ? 'border-red-300/50 bg-red-500/8 text-[var(--sp-danger)]' : 'border-emerald-500/30 bg-emerald-500/8 text-[var(--sp-success)]'}`} role={pageError ? 'alert' : 'status'}>
          {pageError || notice}
        </p>
      ) : null}

      {loading ? (
        <p className="py-12 text-center text-sm text-[var(--sp-ink-tertiary)]">Загрузка контактов…</p>
      ) : (
        <form onSubmit={save} className="space-y-5">
          <section className="rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-5 md:p-6">
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 size-5 text-[var(--sp-brand)]" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-bold">Связь с компанией</h2>
                <p className="mt-1 text-xs leading-5 text-[var(--sp-ink-tertiary)]">Оба телефона отображаются одинаково. Второй номер можно оставить пустым.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Основной телефон" error={errors.phone1?.message}><input {...register('phone1')} className={inputClass} autoComplete="tel" placeholder="+998 90 123 45 67" /></Field>
              <Field label="Дополнительный телефон" hint="необязательно" error={errors.phone2?.message}><input {...register('phone2')} className={inputClass} autoComplete="tel" placeholder="+998 90 765 43 21" /></Field>
              <Field label="Email" error={errors.email?.message}><div className="relative"><Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--sp-ink-muted)]" aria-hidden="true" /><input {...register('email')} className={`${inputClass} pl-10`} autoComplete="email" placeholder="info@example.uz" /></div></Field>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-5 md:p-6">
            <div className="flex items-start gap-3">
              <MessageCircle className="mt-0.5 size-5 text-[var(--sp-brand)]" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-bold">Мессенджеры</h2>
                <p className="mt-1 text-xs leading-5 text-[var(--sp-ink-tertiary)]">Вставляйте полные ссылки. Пустое поле скрывает соответствующую кнопку.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Telegram" error={errors.telegram?.message}><input {...register('telegram')} className={inputClass} inputMode="url" placeholder="https://t.me/username" /></Field>
              <Field label="WhatsApp" error={errors.whatsapp?.message}><input {...register('whatsapp')} className={inputClass} inputMode="url" placeholder="https://wa.me/998901234567" /></Field>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-5 md:p-6">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-5 text-[var(--sp-brand)]" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-bold">Адрес и график</h2>
                <p className="mt-1 text-xs leading-5 text-[var(--sp-ink-tertiary)]">Русский текст обязателен; остальные языки используются при включённой локализации.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Field label="Город · RU" error={errors.cityRu?.message}><input {...register('cityRu')} className={inputClass} /></Field>
              <Field label="Город · UZ" error={errors.cityUz?.message}><input {...register('cityUz')} className={inputClass} /></Field>
              <Field label="Город · EN" error={errors.cityEn?.message}><input {...register('cityEn')} className={inputClass} /></Field>
              <Field label="Адрес · RU" error={errors.addressRu?.message}><input {...register('addressRu')} className={inputClass} /></Field>
              <Field label="Адрес · UZ" error={errors.addressUz?.message}><input {...register('addressUz')} className={inputClass} /></Field>
              <Field label="Адрес · EN" error={errors.addressEn?.message}><input {...register('addressEn')} className={inputClass} /></Field>
              <Field label="График · RU" error={errors.workingHoursRu?.message}><div className="relative"><Clock3 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--sp-ink-muted)]" aria-hidden="true" /><input {...register('workingHoursRu')} className={`${inputClass} pl-10`} /></div></Field>
              <Field label="График · UZ" error={errors.workingHoursUz?.message}><input {...register('workingHoursUz')} className={inputClass} /></Field>
              <Field label="График · EN" error={errors.workingHoursEn?.message}><input {...register('workingHoursEn')} className={inputClass} /></Field>
            </div>
            <div className="mt-4">
              <AiTranslateButton fields={[
                {
                  key: 'city',
                  label: 'Город',
                  values: {
                    ru: localizedContacts.cityRu || '',
                    uz: localizedContacts.cityUz || '',
                    en: localizedContacts.cityEn || '',
                  },
                  onChange: (language, value) => setLocalizedContact('city', language, value),
                },
                {
                  key: 'address',
                  label: 'Адрес',
                  values: {
                    ru: localizedContacts.addressRu || '',
                    uz: localizedContacts.addressUz || '',
                    en: localizedContacts.addressEn || '',
                  },
                  onChange: (language, value) => setLocalizedContact('address', language, value),
                },
                {
                  key: 'workingHours',
                  label: 'График работы',
                  values: {
                    ru: localizedContacts.workingHoursRu || '',
                    uz: localizedContacts.workingHoursUz || '',
                    en: localizedContacts.workingHoursEn || '',
                  },
                  onChange: (language, value) => setLocalizedContact('workingHours', language, value),
                },
              ]} />
            </div>
            <div className="mt-4">
              <Field label="Ссылка на карту в Яндекс Картах" hint="ссылка из конструктора карт — необязательно" error={errors.mapIframe?.message}><input {...register('mapIframe')} className={inputClass} inputMode="url" placeholder="https://yandex.uz/map-widget/v1/?..." /></Field>
            </div>
          </section>

          <div className="flex justify-end border-t border-[var(--sp-line)] pt-5">
            <button type="submit" disabled={isSubmitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--sp-brand)] px-5 font-compact text-xs font-bold text-[var(--sp-on-brand)] transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
              <Save className="size-4" aria-hidden="true" />{isSubmitting ? 'Сохранение…' : 'Сохранить контакты'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
