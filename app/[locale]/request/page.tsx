'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  Minus,
  Phone,
  Plus,
  Send,
  ShoppingBag,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { useRequestCart } from '@/context/RequestCartContext';
import { getOrderRuleSummary, getProductOrderRule } from '@/lib/commerce/orderQuantities';
import { formatMoney, formatProductQuantity } from '@/lib/catalog/productPresentation';
import { PublicRepository } from '@/lib/repositories/publicRepository';
import type { Language } from '@/types';
import { readCustomerProfileDraft } from '@/lib/customer/profileDraft';

interface CustomerStatus {
  authenticated: boolean;
  customer: { name: string; username: string; picture: string; phone: string } | null;
}

interface FieldErrors {
  name?: string;
  phone?: string;
}

const CHECKOUT_DRAFT_KEY = 'sanpack_checkout_draft_v1';

const checkoutCopy = {
  ru: {
    back: 'Продолжить покупки',
    title: 'Оформление заявки',
    subtitle: 'Оставьте имя и телефон — регистрация для оформления не требуется.',
    loading: 'Загружаем корзину…',
    emptyTitle: 'Корзина пуста',
    emptyText: 'Добавьте товары из каталога, чтобы отправить заявку менеджеру.',
    openCatalog: 'Перейти в каталог',
    items: 'Товары',
    clear: 'Очистить',
    clearQuestion: 'Удалить все товары из корзины?',
    cancel: 'Отмена',
    confirmClear: 'Удалить всё',
    contactTitle: 'Контактные данные',
    contactHint: 'Менеджер позвонит, чтобы подтвердить цены, количество и доставку.',
    signedIn: 'Вы вошли как',
    miniAppTitle: 'Магазин открыт в Telegram',
    miniAppHint: 'Повторный вход не нужен — аккаунт будет проверен при отправке заявки.',
    telegramTitle: 'Хотите сохранить заявку в Telegram?',
    telegramHint: 'Вход необязателен. Корзина и введённые данные сохранятся.',
    telegramLogin: 'Войти через Telegram',
    telegramError: 'Не удалось войти через Telegram. Можно оформить заявку без входа или повторить попытку.',
    name: 'Имя',
    namePlaceholder: 'Как к вам обращаться',
    phone: 'Телефон',
    phonePlaceholder: '+998 90 123 45 67',
    nameError: 'Укажите имя — минимум два символа.',
    phoneError: 'Укажите номер Узбекистана в формате +998 XX XXX XX XX.',
    estimated: 'Предварительная сумма',
    priceOnRequest: 'По запросу',
    estimateHint: 'Итоговые цены и условия менеджер подтвердит после получения заявки.',
    submit: 'Отправить заявку',
    submitting: 'Отправляем заявку…',
    genericError: 'Не удалось отправить заявку. Проверьте соединение и попробуйте ещё раз.',
    rateError: 'Слишком много попыток. Подождите несколько минут и попробуйте снова.',
    successTitle: 'Заявка принята',
    successText: 'Менеджер свяжется с вами по указанному номеру телефона.',
    requestNumber: 'Номер заявки',
    myRequests: 'Мои заявки',
    returnCatalog: 'Вернуться в каталог',
    decrease: 'Уменьшить количество',
    increase: 'Увеличить количество',
    remove: 'Удалить товар',
  },
  uz: {
    back: 'Xaridni davom ettirish',
    title: 'Arizani rasmiylashtirish',
    subtitle: 'Ism va telefon raqamingizni qoldiring — ro‘yxatdan o‘tish shart emas.',
    loading: 'Savat yuklanmoqda…',
    emptyTitle: 'Savat bo‘sh',
    emptyText: 'Menejerga ariza yuborish uchun katalogdan mahsulot qo‘shing.',
    openCatalog: 'Katalogga o‘tish',
    items: 'Mahsulotlar',
    clear: 'Tozalash',
    clearQuestion: 'Savatdagi barcha mahsulotlar o‘chirilsinmi?',
    cancel: 'Bekor qilish',
    confirmClear: 'Hammasini o‘chirish',
    contactTitle: 'Aloqa ma’lumotlari',
    contactHint: 'Menejer narx, miqdor va yetkazib berishni tasdiqlash uchun qo‘ng‘iroq qiladi.',
    signedIn: 'Sizning Telegram profilingiz',
    miniAppTitle: 'Do‘kon Telegram ichida ochilgan',
    miniAppHint: 'Qayta kirish shart emas — akkaunt ariza yuborilganda tekshiriladi.',
    telegramTitle: 'Arizani Telegram’da saqlamoqchimisiz?',
    telegramHint: 'Kirish ixtiyoriy. Savat va kiritilgan ma’lumotlar saqlanadi.',
    telegramLogin: 'Telegram orqali kirish',
    telegramError: 'Telegram orqali kirib bo‘lmadi. Arizani kirishsiz yuborishingiz yoki qayta urinishingiz mumkin.',
    name: 'Ism',
    namePlaceholder: 'Sizga qanday murojaat qilaylik',
    phone: 'Telefon',
    phonePlaceholder: '+998 90 123 45 67',
    nameError: 'Ismingizni kiriting — kamida ikki belgi.',
    phoneError: 'O‘zbekiston raqamini +998 XX XXX XX XX formatida kiriting.',
    estimated: 'Taxminiy summa',
    priceOnRequest: 'So‘rov bo‘yicha',
    estimateHint: 'Yakuniy narx va shartlarni menejer arizani olgach tasdiqlaydi.',
    submit: 'Ariza yuborish',
    submitting: 'Ariza yuborilmoqda…',
    genericError: 'Arizani yuborib bo‘lmadi. Internet aloqasini tekshirib, qayta urinib ko‘ring.',
    rateError: 'Urinishlar juda ko‘p. Bir necha daqiqadan keyin qayta urinib ko‘ring.',
    successTitle: 'Ariza qabul qilindi',
    successText: 'Menejer ko‘rsatilgan telefon raqami orqali siz bilan bog‘lanadi.',
    requestNumber: 'Ariza raqami',
    myRequests: 'Mening arizalarim',
    returnCatalog: 'Katalogga qaytish',
    decrease: 'Miqdorni kamaytirish',
    increase: 'Miqdorni oshirish',
    remove: 'Mahsulotni o‘chirish',
  },
  en: {
    back: 'Continue shopping',
    title: 'Submit a request',
    subtitle: 'Leave your name and phone number — registration is not required.',
    loading: 'Loading your cart…',
    emptyTitle: 'Your cart is empty',
    emptyText: 'Add products from the catalog to send a request to the manager.',
    openCatalog: 'Open catalog',
    items: 'Products',
    clear: 'Clear',
    clearQuestion: 'Remove all products from the cart?',
    cancel: 'Cancel',
    confirmClear: 'Remove all',
    contactTitle: 'Contact details',
    contactHint: 'A manager will call to confirm prices, quantities, and delivery.',
    signedIn: 'Signed in as',
    miniAppTitle: 'Store opened in Telegram',
    miniAppHint: 'No additional sign-in is needed. Your account will be checked when the request is sent.',
    telegramTitle: 'Save this request to Telegram?',
    telegramHint: 'Signing in is optional. Your cart and entered details will be preserved.',
    telegramLogin: 'Sign in with Telegram',
    telegramError: 'Telegram sign-in did not complete. You can submit without signing in or try again.',
    name: 'Name',
    namePlaceholder: 'How should we address you?',
    phone: 'Phone',
    phonePlaceholder: '+998 90 123 45 67',
    nameError: 'Enter your name using at least two characters.',
    phoneError: 'Enter an Uzbekistan number in the +998 XX XXX XX XX format.',
    estimated: 'Estimated total',
    priceOnRequest: 'On request',
    estimateHint: 'The manager will confirm final prices and terms after receiving the request.',
    submit: 'Submit request',
    submitting: 'Submitting your request…',
    genericError: 'We could not submit the request. Check your connection and try again.',
    rateError: 'There have been too many attempts. Wait a few minutes and try again.',
    successTitle: 'Request received',
    successText: 'A manager will contact you using the phone number provided.',
    requestNumber: 'Request number',
    myRequests: 'My requests',
    returnCatalog: 'Return to catalog',
    decrease: 'Decrease quantity',
    increase: 'Increase quantity',
    remove: 'Remove product',
  },
} satisfies Record<Language, Record<string, string>>;

function checkoutErrorMessage(error: unknown, language: Language) {
  const copy = checkoutCopy[language];
  if (error instanceof Error && error.message.startsWith('Слишком много попыток')) {
    return copy.rateError;
  }
  return copy.genericError;
}

function CheckoutSkeleton({ label }: { label: string }) {
  return (
    <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]" aria-busy="true" aria-label={label}>
      <div className="h-64 animate-pulse rounded-[var(--sp-radius-card)] bg-[var(--sp-surface-inset)] lg:order-2" aria-hidden="true" />
      <div className="h-80 animate-pulse rounded-[var(--sp-radius-card)] bg-[var(--sp-surface-inset)] lg:order-1" aria-hidden="true" />
    </div>
  );
}

export default function RequestPage() {
  const { language, getLocalizedText } = useLanguage();
  const copy = checkoutCopy[language];
  const { items, updateQuantity, removeItem, clearCart, totalAmount, isHydrated } = useRequestCart();
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [customer, setCustomer] = useState<CustomerStatus>({ authenticated: false, customer: null });
  const [customerChecked, setCustomerChecked] = useState(false);
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTextEntryFocused, setIsTextEntryFocused] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [submittedRequestNumber, setSubmittedRequestNumber] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const telegramAuthFailed = currentUrl.searchParams.get('telegramAuth') === 'error';
    if (currentUrl.searchParams.has('telegramAuth') || currentUrl.searchParams.has('reason')) {
      currentUrl.searchParams.delete('telegramAuth');
      currentUrl.searchParams.delete('reason');
      window.history.replaceState(null, '', `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
    }

    let draftName = '';
    let draftPhone = '';

    const profileDraft = readCustomerProfileDraft();
    if (profileDraft) {
      draftName = profileDraft.name;
      draftPhone = profileDraft.phone;
    }

    try {
      const draft = window.sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
      if (draft) {
        const parsed = JSON.parse(draft) as { contactName?: unknown; phone?: unknown };
        if (typeof parsed.contactName === 'string') draftName = parsed.contactName;
        if (typeof parsed.phone === 'string') draftPhone = parsed.phone;
      }
    } catch {
      window.sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
    }

    queueMicrotask(() => {
      if (telegramAuthFailed) setLoginError(copy.telegramError);
      setIsMiniApp(Boolean(window.Telegram?.WebApp?.initData));
      if (draftName) setContactName(draftName);
      if (draftPhone) setPhone(draftPhone);
    });

    fetch('/api/auth/customer', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() as Promise<CustomerStatus> : null)
      .then((status) => {
        if (!status) return;
        setCustomer(status);
        if (status.customer?.name) setContactName((current) => current || status.customer?.name || '');
        if (status.customer?.phone) setPhone((current) => current === '+998 ' ? status.customer?.phone || current : current);
      })
      .catch(() => undefined)
      .finally(() => setCustomerChecked(true));
  }, [copy.telegramError]);

  useEffect(() => {
    if (submittedRequestNumber) successHeadingRef.current?.focus();
  }, [submittedRequestNumber]);

  function loginWithTelegram() {
    window.sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify({ contactName, phone }));
    const returnTo = window.location.pathname;
    window.location.replace(
      new URL(`/api/auth/telegram/start?returnTo=${encodeURIComponent(returnTo)}`, window.location.origin).toString(),
    );
  }

  function validateFields() {
    const nextErrors: FieldErrors = {};
    if (contactName.trim().length < 2) nextErrors.name = copy.nameError;
    const phoneDigits = phone.replace(/\D/g, '');
    if (!/^998\d{9}$/.test(phoneDigits)) nextErrors.phone = copy.phoneError;
    setFieldErrors(nextErrors);

    if (nextErrors.name) nameInputRef.current?.focus();
    else if (nextErrors.phone) phoneInputRef.current?.focus();

    return Object.keys(nextErrors).length === 0;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (items.length === 0 || isSubmitting || !validateFields()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const created = await PublicRepository.createRequest({
        contactName: contactName.trim(),
        phone: phone.trim(),
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          comment: item.comment,
        })),
        telegramInitData: window.Telegram?.WebApp?.initData || undefined,
      });
      window.sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
      setSubmittedRequestNumber(created.requestNumber);
      clearCart();
    } catch (error) {
      setSubmitError(checkoutErrorMessage(error, language));
    } finally {
      setIsSubmitting(false);
    }
  }

  const formattedTotal = totalAmount > 0
    ? formatMoney(totalAmount, language, 'UZS')
    : copy.priceOnRequest;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--sp-canvas)] text-[var(--sp-ink)]">
      <Header />
      <main className={`mx-auto w-full max-w-6xl flex-1 px-4 pt-5 sm:px-6 md:pt-8 lg:pt-12 ${isHydrated && items.length > 0 && !submittedRequestNumber ? 'pb-[calc(var(--sp-mobile-nav-height)+env(safe-area-inset-bottom)+6rem)] md:pb-12' : 'pb-[calc(var(--sp-mobile-nav-height)+env(safe-area-inset-bottom)+2rem)] md:pb-12'}`}>
        {submittedRequestNumber ? (
          <section className="mx-auto max-w-xl rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-6 text-center shadow-[var(--sp-shadow-raised)] sm:p-10" aria-live="polite">
            <span className="mx-auto flex size-14 items-center justify-center rounded-[var(--sp-radius-control)] bg-[color-mix(in_srgb,var(--sp-brand)_12%,transparent)] text-[var(--sp-brand)]">
              <CheckCircle2 className="size-7" aria-hidden="true" />
            </span>
            <h1 ref={successHeadingRef} tabIndex={-1} className="mt-5 font-extended text-2xl font-bold focus-visible:outline-none">{copy.successTitle}</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--sp-ink-secondary)]">{copy.successText}</p>
            <div className="mt-6 rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-surface-inset)] px-4 py-3">
              <span className="block text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--sp-ink-tertiary)]">{copy.requestNumber}</span>
              <strong className="mt-1 block text-lg font-semibold tabular-nums text-[var(--sp-brand)]">{submittedRequestNumber}</strong>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link href="/orders" className="inline-flex min-h-11 items-center justify-center rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] px-4 text-xs font-semibold transition-colors hover:border-[var(--sp-line-strong)]">{copy.myRequests}</Link>
              <Link href="/catalog" className="inline-flex min-h-11 items-center justify-center rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-4 text-xs font-semibold text-[var(--sp-on-brand)]">{copy.returnCatalog}</Link>
            </div>
          </section>
        ) : (
          <>
            <Link href="/catalog" className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[var(--sp-brand)]">
              <ArrowLeft className="size-4" aria-hidden="true" />
              {copy.back}
            </Link>
            <div className="mt-2">
              <h1 className="font-extended text-2xl font-bold tracking-[-0.025em] sm:text-3xl">{copy.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--sp-ink-secondary)]">{copy.subtitle}</p>
            </div>

            {!isHydrated ? (
              <CheckoutSkeleton label={copy.loading} />
            ) : items.length === 0 ? (
              <section className="mt-8 rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] px-5 py-10 text-center sm:p-10">
                <ShoppingBag className="mx-auto size-10 text-[var(--sp-brand)]" aria-hidden="true" />
                <h2 className="mt-4 font-extended text-lg font-bold">{copy.emptyTitle}</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--sp-ink-secondary)]">{copy.emptyText}</p>
                <Link href="/catalog" className="mt-5 inline-flex min-h-11 items-center rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-5 text-xs font-semibold text-[var(--sp-on-brand)]">{copy.openCatalog}</Link>
              </section>
            ) : (
              <form id="request-checkout-form" onSubmit={submit} noValidate className="mt-7 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
                <aside className="order-1 rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-4 shadow-[var(--sp-shadow-raised)] sm:p-5 lg:order-2 lg:sticky lg:top-6">
                  <h2 className="font-extended text-lg font-bold">{copy.contactTitle}</h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--sp-ink-tertiary)]">{copy.contactHint}</p>

                  {customer.authenticated && customer.customer ? (
                    <p className="mt-4 flex items-center gap-2 rounded-[var(--sp-radius-control-inner)] bg-[color-mix(in_srgb,var(--sp-success)_9%,var(--sp-surface))] px-3 py-2.5 text-xs text-[var(--sp-success)]">
                      <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                      <span>{copy.signedIn} <strong>{customer.customer.name}</strong></span>
                    </p>
                  ) : isMiniApp ? (
                    <div className="mt-4 rounded-[var(--sp-radius-control-inner)] bg-[color-mix(in_srgb,var(--sp-brand)_8%,var(--sp-surface))] px-3 py-3">
                      <p className="flex items-center gap-2 text-xs font-semibold text-[var(--sp-brand)]"><Send className="size-4 shrink-0" aria-hidden="true" />{copy.miniAppTitle}</p>
                      <p className="mt-1 text-[10px] leading-4 text-[var(--sp-ink-tertiary)]">{copy.miniAppHint}</p>
                    </div>
                  ) : customerChecked ? (
                    <div className="mt-4 rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-surface-inset)] p-3">
                      <p className="text-xs font-semibold text-[var(--sp-ink)]">{copy.telegramTitle}</p>
                      <p className="mt-1 text-[10px] leading-4 text-[var(--sp-ink-tertiary)]">{copy.telegramHint}</p>
                      <button type="button" onClick={loginWithTelegram} className="mt-3 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface)] px-4 text-xs font-semibold text-[var(--sp-brand)] transition-colors hover:border-[var(--sp-brand)]">
                        <Send className="size-4" aria-hidden="true" />{copy.telegramLogin}
                      </button>
                    </div>
                  ) : null}

                  {loginError ? (
                    <div className="sp-alert sp-alert-danger mt-4 flex items-start gap-2 text-xs" role="alert">
                      <span className="min-w-0 flex-1">{loginError}</span>
                      <button type="button" onClick={() => setLoginError(null)} aria-label={copy.cancel} className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--sp-radius-control-inner)]">
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}

                  <div className="mt-5">
                    <label htmlFor="checkout-name" className="block text-xs font-medium">{copy.name}</label>
                    <div className={`mt-2 flex min-h-12 items-center gap-2 rounded-[var(--sp-radius-control)] border bg-[var(--sp-control)] px-3 transition-[border-color,box-shadow] focus-within:border-[var(--sp-brand)] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--sp-brand)_18%,transparent)] ${fieldErrors.name ? 'border-[var(--sp-danger)]' : 'border-[var(--sp-line-strong)]'}`}>
                      <User className="size-4 shrink-0 text-[var(--sp-ink-muted)]" aria-hidden="true" />
                      <input
                        ref={nameInputRef}
                        id="checkout-name"
                        name="name"
                        required
                        minLength={2}
                        maxLength={120}
                        value={contactName}
                        onFocus={() => setIsTextEntryFocused(true)}
                        onBlur={() => setIsTextEntryFocused(false)}
                        onChange={(event) => {
                          setContactName(event.target.value);
                          if (fieldErrors.name) setFieldErrors((current) => ({ ...current, name: undefined }));
                        }}
                        autoComplete="name"
                        aria-invalid={fieldErrors.name ? true : undefined}
                        aria-describedby={fieldErrors.name ? 'checkout-name-error' : undefined}
                        className="sp-field-input min-w-0 w-full bg-transparent py-3 text-base"
                        placeholder={copy.namePlaceholder}
                      />
                    </div>
                    {fieldErrors.name ? <p id="checkout-name-error" className="mt-1.5 text-xs leading-5 text-[var(--sp-danger)]">{fieldErrors.name}</p> : null}
                  </div>

                  <div className="mt-4">
                    <label htmlFor="checkout-phone" className="block text-xs font-medium">{copy.phone}</label>
                    <div className={`mt-2 flex min-h-12 items-center gap-2 rounded-[var(--sp-radius-control)] border bg-[var(--sp-control)] px-3 transition-[border-color,box-shadow] focus-within:border-[var(--sp-brand)] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--sp-brand)_18%,transparent)] ${fieldErrors.phone ? 'border-[var(--sp-danger)]' : 'border-[var(--sp-line-strong)]'}`}>
                      <Phone className="size-4 shrink-0 text-[var(--sp-ink-muted)]" aria-hidden="true" />
                      <input
                        ref={phoneInputRef}
                        id="checkout-phone"
                        name="tel"
                        required
                        type="tel"
                        inputMode="tel"
                        value={phone}
                        onFocus={() => setIsTextEntryFocused(true)}
                        onBlur={() => setIsTextEntryFocused(false)}
                        onChange={(event) => {
                          setPhone(event.target.value);
                          if (fieldErrors.phone) setFieldErrors((current) => ({ ...current, phone: undefined }));
                        }}
                        autoComplete="tel"
                        aria-invalid={fieldErrors.phone ? true : undefined}
                        aria-describedby={fieldErrors.phone ? 'checkout-phone-error' : undefined}
                        className="sp-field-input min-w-0 w-full bg-transparent py-3 text-base"
                        placeholder={copy.phonePlaceholder}
                      />
                    </div>
                    {fieldErrors.phone ? <p id="checkout-phone-error" className="mt-1.5 text-xs leading-5 text-[var(--sp-danger)]">{fieldErrors.phone}</p> : null}
                  </div>

                  {submitError ? (
                    <p className="sp-alert sp-alert-danger mt-4 text-xs leading-5" role="alert">{submitError}</p>
                  ) : null}

                  <div className="mt-5 bg-[var(--sp-surface-inset)] p-3 rounded-[var(--sp-radius-control-inner)]">
                    <div className="flex items-center justify-between gap-4 text-xs text-[var(--sp-ink-secondary)]">
                      <span>{copy.estimated}</span>
                      <strong className="text-right text-sm tabular-nums text-[var(--sp-ink)]">{formattedTotal}</strong>
                    </div>
                    <p className="mt-2 text-[10px] leading-4 text-[var(--sp-ink-tertiary)]">{copy.estimateHint}</p>
                  </div>

                  <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} className="mt-5 hidden min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-5 text-xs font-semibold text-[var(--sp-on-brand)] disabled:cursor-wait disabled:opacity-60 md:inline-flex">
                    {isSubmitting ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
                    {copy.submit}
                  </button>
                </aside>

                <section className="order-2 rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-4 sm:p-6 lg:order-1">
                  <div className="flex min-h-11 flex-wrap items-center justify-between gap-3">
                    <h2 className="font-extended text-lg font-bold">{copy.items} <span className="text-[var(--sp-ink-tertiary)]">{items.length}</span></h2>
                    {!isConfirmingClear ? (
                      <button type="button" onClick={() => setIsConfirmingClear(true)} className="min-h-11 cursor-pointer px-2 text-xs font-semibold text-[var(--sp-danger)]">{copy.clear}</button>
                    ) : null}
                  </div>

                  {isConfirmingClear ? (
                    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-[var(--sp-radius-control-inner)] bg-[color-mix(in_srgb,var(--sp-danger)_7%,var(--sp-surface))] p-3 text-xs">
                      <span className="min-w-0 flex-1 text-[var(--sp-ink-secondary)]">{copy.clearQuestion}</span>
                      <button type="button" onClick={() => setIsConfirmingClear(false)} className="min-h-10 cursor-pointer rounded-[var(--sp-radius-control-inner)] px-3 font-semibold text-[var(--sp-ink-secondary)]">{copy.cancel}</button>
                      <button type="button" onClick={() => { clearCart(); setIsConfirmingClear(false); }} className="min-h-10 cursor-pointer rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-danger)] px-3 font-semibold text-white">{copy.confirmClear}</button>
                    </div>
                  ) : null}

                  <div className="divide-y divide-[var(--sp-line-soft)]">
                    {items.map((item) => {
                      const title = getLocalizedText(item.productTitleRu, item.productTitleUz, item.productTitleEn);
                      const variantTitle = getLocalizedText(item.variantTitleRu, item.variantTitleUz, item.variantTitleEn);
                      const orderRule = item.product ? getProductOrderRule(item.product, language, item.variant) : null;
                      const quantityStep = orderRule?.quantityStep || 1;
                      const orderSummary = item.product ? getOrderRuleSummary(item.product, language, item.variant) : '';
                      const quantityText = item.product
                        ? formatProductQuantity(item.product, item.quantity, language)
                        : `${item.quantity} ${item.unit}`;

                      return (
                        <article key={`${item.productId}-${item.variantId || 'base'}`} className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-3 gap-y-3 py-4 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center">
                          <Image src={item.image || '/favicon.png'} alt="" width={72} height={72} sizes="72px" className="size-16 rounded-[var(--sp-radius-control-inner)] bg-white object-contain p-1 sm:size-[72px]" />
                          <div className="min-w-0">
                            <Link href={`/product/${item.productSlug}`} className="inline-block max-w-full"><h3 className="text-sm font-semibold leading-5 transition-colors hover:text-[var(--sp-brand)]">{title}</h3></Link>
                            {variantTitle ? <p className="mt-1 text-xs font-medium text-[var(--sp-brand)]">{variantTitle}</p> : null}
                            {item.price !== undefined ? <p className="mt-2 text-xs font-semibold tabular-nums">{formatMoney(item.price, language, 'UZS')}</p> : <p className="mt-2 text-xs font-semibold text-[var(--sp-brand)]">{copy.priceOnRequest}</p>}
                            {orderSummary ? <p className="mt-1 max-w-md text-[10px] leading-4 text-[var(--sp-ink-tertiary)]">{orderSummary}</p> : null}
                          </div>
                          <div className="col-start-2 flex min-w-0 items-center justify-between gap-2 sm:col-start-auto">
                            <div className="flex min-h-11 min-w-0 items-center rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-control)]">
                              <button type="button" onClick={() => updateQuantity(item.productId, item.quantity - quantityStep, item.variantId)} className="flex size-11 shrink-0 cursor-pointer items-center justify-center" aria-label={copy.decrease}><Minus className="size-3.5" aria-hidden="true" /></button>
                              <span className="min-w-0 flex-1 px-1 text-center text-xs font-semibold tabular-nums">{quantityText}</span>
                              <button type="button" onClick={() => updateQuantity(item.productId, item.quantity + quantityStep, item.variantId)} className="flex size-11 shrink-0 cursor-pointer items-center justify-center" aria-label={copy.increase}><Plus className="size-3.5" aria-hidden="true" /></button>
                            </div>
                            <button type="button" onClick={() => removeItem(item.productId, item.variantId)} className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[var(--sp-radius-control)] text-[var(--sp-danger)] transition-colors hover:bg-red-500/8" aria-label={`${copy.remove}: ${title}`}><Trash2 className="size-4" aria-hidden="true" /></button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              </form>
            )}
          </>
        )}
      </main>

      <div role="status" className="sr-only">{isSubmitting ? copy.submitting : ''}</div>

      {isHydrated && items.length > 0 && !submittedRequestNumber && !isTextEntryFocused ? (
        <div className="fixed inset-x-0 z-30 border-t border-[var(--sp-line)] bg-[color-mix(in_srgb,var(--sp-surface)_97%,transparent)] px-[max(0.75rem,env(safe-area-inset-left))] py-2 shadow-[0_-12px_28px_rgb(21_27_24/10%)] backdrop-blur-xl md:hidden" style={{ bottom: 'calc(var(--sp-mobile-nav-height) + env(safe-area-inset-bottom))' }}>
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <span className="block truncate text-[10px] font-medium text-[var(--sp-ink-tertiary)]">{copy.estimated}</span>
              <strong className="block truncate text-base font-bold tabular-nums text-[var(--sp-brand)]">{formattedTotal}</strong>
            </div>
            <button type="submit" form="request-checkout-form" disabled={isSubmitting} aria-busy={isSubmitting} className="flex min-h-12 min-w-[9.75rem] cursor-pointer items-center justify-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-4 text-sm font-semibold text-[var(--sp-on-brand)] shadow-[var(--sp-shadow-raised)] disabled:cursor-wait disabled:opacity-60">
              {isSubmitting ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
              {copy.submit}
            </button>
          </div>
        </div>
      ) : null}

      <Footer />
    </div>
  );
}
