'use client';

import React, { useState } from 'react';
import { X, Phone, Clock, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface CallbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CallbackModal({ isOpen, onClose }: CallbackModalProps) {
  const { t, language } = useLanguage();
  const copy = {
    ru: {
      nameError: 'Пожалуйста, укажите ваше имя',
      phoneError: 'Укажите корректный номер телефона',
      serverError: 'Запрос не сохранён. Попробуйте ещё раз.',
      success: 'Заявка принята!',
      successText: 'Менеджер SANPACK перезвонит вам в ближайшее время.',
      team: 'Отдел продаж SANPACK',
      hours: 'Звоним по рабочим дням с 09:00 до 18:00',
      name: 'Ваше имя',
      namePlaceholder: 'Имя или название компании',
      phone: 'Номер телефона',
      submit: 'Отправить запрос',
      sending: 'Отправка…',
    },
    uz: {
      nameError: 'Ismingizni kiriting',
      phoneError: 'To‘g‘ri telefon raqamini kiriting',
      serverError: 'So‘rov saqlanmadi. Qayta urinib ko‘ring.',
      success: 'So‘rov qabul qilindi!',
      successText: 'SANPACK menejeri tez orada sizga qo‘ng‘iroq qiladi.',
      team: 'SANPACK savdo bo‘limi',
      hours: 'Ish kunlari 09:00 dan 18:00 gacha qo‘ng‘iroq qilamiz',
      name: 'Ismingiz',
      namePlaceholder: 'Ism yoki kompaniya nomi',
      phone: 'Telefon raqami',
      submit: 'So‘rov yuborish',
      sending: 'Yuborilmoqda…',
    },
    en: {
      nameError: 'Please enter your name',
      phoneError: 'Enter a valid phone number',
      serverError: 'The request was not saved. Please try again.',
      success: 'Request received',
      successText: 'A SANPACK manager will call you shortly.',
      team: 'SANPACK sales team',
      hours: 'We call on business days from 09:00 to 18:00',
      name: 'Your name',
      namePlaceholder: 'Name or company',
      phone: 'Phone number',
      submit: 'Send request',
      sending: 'Sending…',
    },
  }[language];
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(copy.nameError);
      return;
    }
    if (phone.length < 12) {
      setError(copy.phoneError);
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/callbacks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });
      if (!response.ok) throw new Error(copy.serverError);
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : copy.serverError);
      return;
    } finally {
      setIsSubmitting(false);
    }

    setTimeout(() => {
      setSubmitted(false);
      setName('');
      setPhone('+998 ');
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="callback-modal-title"
        className="relative max-h-full w-full max-w-md overflow-y-auto rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface-raised)] p-6 shadow-[var(--sp-shadow-raised)] animate-in fade-in zoom-in-95 duration-200 md:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={language === 'ru' ? 'Закрыть' : language === 'uz' ? 'Yopish' : 'Close'}
          className="sp-icon-button absolute right-4 top-4 size-10"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        {submitted ? (
          <div className="text-center py-6">
            <CheckCircle className="mx-auto mb-4 size-14 text-[var(--sp-success)]" />
            <h3 className="mb-2 text-xl font-bold text-[var(--sp-ink)]">{copy.success}</h3>
            <p className="text-sm text-[var(--sp-ink-secondary)]">
              {copy.successText}
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex size-10 items-center justify-center rounded-[var(--sp-radius-control)] bg-[var(--sp-brand-soft)] text-[var(--sp-brand)]">
                <Phone className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h3 id="callback-modal-title" className="text-lg font-bold text-[var(--sp-ink)]">{t('callback')}</h3>
                <p className="text-xs text-[var(--sp-ink-tertiary)]">{copy.team}</p>
              </div>
            </div>

            <p className="mb-6 flex items-center gap-2 rounded-[var(--sp-radius-control-inner)] border border-[var(--sp-line-soft)] bg-[var(--sp-surface-inset)] p-3 text-xs text-[var(--sp-ink-secondary)]">
              <Clock className="size-4 shrink-0 text-[var(--sp-brand)]" aria-hidden="true" />
              <span>{copy.hours}</span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--sp-ink)]">
                  {copy.name} *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={copy.namePlaceholder}
                  className="min-h-12 w-full rounded-[var(--sp-radius-control)] border border-[var(--sp-control-border)] bg-[var(--sp-control)] px-4 text-sm outline-none transition-[border-color,box-shadow] focus:border-[var(--sp-brand)] focus:ring-2 focus:ring-[var(--sp-brand-soft)]"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--sp-ink)]">
                  {copy.phone} *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="min-h-12 w-full rounded-[var(--sp-radius-control)] border border-[var(--sp-control-border)] bg-[var(--sp-control)] px-4 text-sm outline-none transition-[border-color,box-shadow] focus:border-[var(--sp-brand)] focus:ring-2 focus:ring-[var(--sp-brand-soft)]"
                  required
                />
              </div>

              {error && <p role="alert" className="sp-alert sp-alert-danger text-xs">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-12 w-full rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-5 text-sm font-medium text-[var(--sp-on-brand)] shadow-[var(--sp-shadow-soft)] transition-[background-color,transform] hover:bg-[var(--sp-brand-deep)] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isSubmitting ? copy.sending : copy.submit}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
