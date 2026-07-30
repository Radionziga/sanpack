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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-[#006F3C] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#18231E] mb-2">{copy.success}</h3>
            <p className="text-slate-600 text-sm">
              {copy.successText}
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#EAF5EF] flex items-center justify-center text-[#006F3C]">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#18231E]">{t('callback')}</h3>
                <p className="text-xs text-[#68736D]">{copy.team}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-6 bg-slate-50 p-3 rounded-lg flex items-center gap-2 border border-slate-100">
              <Clock className="w-4 h-4 text-[#006F3C] shrink-0" />
              <span>{copy.hours}</span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#18231E] mb-1">
                  {copy.name} *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={copy.namePlaceholder}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#006F3C] focus:ring-2 focus:ring-[#006F3C]/20 outline-none text-sm transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#18231E] mb-1">
                  {copy.phone} *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#006F3C] focus:ring-2 focus:ring-[#006F3C]/20 outline-none text-sm transition-all"
                  required
                />
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#008348] hover:bg-[#006F3C] text-white font-medium rounded-xl shadow-md transition-all active:scale-[0.99] text-sm"
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
