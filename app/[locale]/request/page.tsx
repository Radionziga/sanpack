'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  MessageSquareText,
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
import { formatMoney } from '@/lib/catalog/productPresentation';
import { PublicRepository } from '@/lib/repositories/publicRepository';
import type { Language } from '@/types';
import { readCustomerProfileDraft } from '@/lib/customer/profileDraft';
import { DeliveryDatePicker } from '@/components/checkout/DeliveryDatePicker';

interface CustomerStatus {
  authenticated: boolean;
  customer: { name: string; username: string; picture: string; phone: string; address?: string } | null;
}

interface FieldErrors {
  name?: string;
  phone?: string;
  address?: string;
  date?: string;
  window?: string;
}

const CHECKOUT_DRAFT_KEY = 'sanpack_checkout_draft_v1';
const DELIVERY_WINDOWS = ['09:00-13:00', '13:00-17:00', '17:00-21:00'] as const;

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
    deliveryTitle: 'Доставка',
    deliveryHint: 'Выберите удобную дату и интервал. Менеджер подтвердит доступность после получения заявки.',
    address: 'Адрес доставки',
    addressPlaceholder: 'Город, улица, дом или ориентир',
    addressError: 'Укажите адрес доставки — минимум пять символов.',
    date: 'Дата доставки',
    dateError: 'Выберите дату доставки.',
    time: 'Время доставки',
    timeError: 'Выберите интервал доставки.',
    comment: 'Комментарий курьеру или менеджеру',
    commentOptional: 'Необязательно',
    commentPlaceholder: 'Например: позвонить за 30 минут до приезда',
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
    deliveryTitle: 'Yetkazib berish',
    deliveryHint: 'Qulay sana va vaqt oralig‘ini tanlang. Menejer arizadan so‘ng mavjudligini tasdiqlaydi.',
    address: 'Yetkazib berish manzili',
    addressPlaceholder: 'Shahar, ko‘cha, uy yoki mo‘ljal',
    addressError: 'Yetkazib berish manzilini kiriting — kamida besh belgi.',
    date: 'Yetkazib berish sanasi',
    dateError: 'Yetkazib berish sanasini tanlang.',
    time: 'Yetkazib berish vaqti',
    timeError: 'Yetkazib berish vaqtini tanlang.',
    comment: 'Kuryer yoki menejer uchun izoh',
    commentOptional: 'Ixtiyoriy',
    commentPlaceholder: 'Masalan: kelishdan 30 daqiqa oldin qo‘ng‘iroq qiling',
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
    deliveryTitle: 'Delivery',
    deliveryHint: 'Choose a convenient date and time window. The manager will confirm availability after receiving the request.',
    address: 'Delivery address',
    addressPlaceholder: 'City, street, building, or landmark',
    addressError: 'Enter a delivery address using at least five characters.',
    date: 'Delivery date',
    dateError: 'Choose a delivery date.',
    time: 'Delivery time',
    timeError: 'Choose a delivery window.',
    comment: 'Note for the courier or manager',
    commentOptional: 'Optional',
    commentPlaceholder: 'For example: call 30 minutes before arrival',
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
  zh: {
    back: '继续选购',
    title: '提交采购申请',
    subtitle: '请留下姓名和电话，无需注册即可提交。',
    loading: '正在加载购物车…',
    emptyTitle: '购物车为空',
    emptyText: '请从目录中添加商品，然后向经理提交申请。',
    openCatalog: '打开商品目录',
    items: '商品',
    clear: '清空',
    clearQuestion: '确定要删除购物车中的全部商品吗？',
    cancel: '取消',
    confirmClear: '全部删除',
    contactTitle: '联系信息',
    contactHint: '经理将致电确认价格、数量和配送信息。',
    signedIn: '当前登录账号',
    miniAppTitle: '商店已在 Telegram 中打开',
    miniAppHint: '无需再次登录，提交申请时将自动验证账号。',
    telegramTitle: '要将此申请保存到 Telegram 吗？',
    telegramHint: '登录并非必需。购物车和已填写的信息都会保留。',
    telegramLogin: '使用 Telegram 登录',
    telegramError: 'Telegram 登录未完成。您可以直接提交申请，也可以重试。',
    name: '姓名',
    namePlaceholder: '我们该如何称呼您？',
    phone: '电话',
    phonePlaceholder: '+998 90 123 45 67',
    nameError: '请输入至少两个字符的姓名。',
    phoneError: '请输入格式为 +998 XX XXX XX XX 的乌兹别克斯坦号码。',
    deliveryTitle: '配送',
    deliveryHint: '请选择方便的日期和时间段。经理收到申请后会确认可配送时间。',
    address: '配送地址',
    addressPlaceholder: '城市、街道、门牌号或地标',
    addressError: '请输入至少五个字符的配送地址。',
    date: '配送日期',
    dateError: '请选择配送日期。',
    time: '配送时间',
    timeError: '请选择配送时间段。',
    comment: '给配送员或经理的备注',
    commentOptional: '选填',
    commentPlaceholder: '例如：到达前 30 分钟请来电',
    estimated: '预估金额',
    priceOnRequest: '价格面议',
    estimateHint: '经理收到申请后将确认最终价格和条件。',
    submit: '提交申请',
    submitting: '正在提交申请…',
    genericError: '申请提交失败，请检查网络连接后重试。',
    rateError: '尝试次数过多，请等待几分钟后重试。',
    successTitle: '申请已收到',
    successText: '经理将通过您提供的电话号码与您联系。',
    requestNumber: '申请编号',
    myRequests: '我的申请',
    returnCatalog: '返回商品目录',
    decrease: '减少数量',
    increase: '增加数量',
    remove: '删除商品',
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
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryWindow, setDeliveryWindow] = useState('');
  const [notes, setNotes] = useState('');
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
  const addressInputRef = useRef<HTMLInputElement>(null);
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
    let draftAddress = '';
    let draftDate = '';
    let draftWindow = '';
    let draftNotes = '';

    const profileDraft = readCustomerProfileDraft();
    if (profileDraft) {
      draftName = profileDraft.name;
      draftPhone = profileDraft.phone;
      draftAddress = profileDraft.address || '';
    }

    try {
      const draft = window.sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
      if (draft) {
        const parsed = JSON.parse(draft) as {
          contactName?: unknown;
          phone?: unknown;
          deliveryAddress?: unknown;
          deliveryDate?: unknown;
          deliveryWindow?: unknown;
          notes?: unknown;
        };
        if (typeof parsed.contactName === 'string') draftName = parsed.contactName;
        if (typeof parsed.phone === 'string') draftPhone = parsed.phone;
        if (typeof parsed.deliveryAddress === 'string') draftAddress = parsed.deliveryAddress;
        if (typeof parsed.deliveryDate === 'string') draftDate = parsed.deliveryDate;
        if (typeof parsed.deliveryWindow === 'string') draftWindow = parsed.deliveryWindow;
        if (typeof parsed.notes === 'string') draftNotes = parsed.notes;
      }
    } catch {
      window.sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
    }

    queueMicrotask(() => {
      if (telegramAuthFailed) setLoginError(copy.telegramError);
      setIsMiniApp(Boolean(window.Telegram?.WebApp?.initData));
      if (draftName) setContactName(draftName);
      if (draftPhone) setPhone(draftPhone);
      if (draftAddress) setDeliveryAddress(draftAddress);
      if (draftDate) setDeliveryDate(draftDate);
      if (draftWindow) setDeliveryWindow(draftWindow);
      if (draftNotes) setNotes(draftNotes);
    });

    fetch('/api/auth/customer', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() as Promise<CustomerStatus> : null)
      .then((status) => {
        if (!status) return;
        setCustomer(status);
        if (status.customer?.name) setContactName((current) => current || status.customer?.name || '');
        if (status.customer?.phone) setPhone((current) => current === '+998 ' ? status.customer?.phone || current : current);
        if (status.customer?.address) setDeliveryAddress((current) => current || status.customer?.address || '');
      })
      .catch(() => undefined)
      .finally(() => setCustomerChecked(true));
  }, [copy.telegramError]);

  useEffect(() => {
    if (submittedRequestNumber) successHeadingRef.current?.focus();
  }, [submittedRequestNumber]);

  function loginWithTelegram() {
    window.sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify({
      contactName,
      phone,
      deliveryAddress,
      deliveryDate,
      deliveryWindow,
      notes,
    }));
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
    if (deliveryAddress.trim().length < 5) nextErrors.address = copy.addressError;
    if (!deliveryDate) nextErrors.date = copy.dateError;
    if (!deliveryWindow) nextErrors.window = copy.timeError;
    setFieldErrors(nextErrors);

    if (nextErrors.name) nameInputRef.current?.focus();
    else if (nextErrors.phone) phoneInputRef.current?.focus();
    else if (nextErrors.address) addressInputRef.current?.focus();

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
        deliveryAddress: deliveryAddress.trim(),
        deliveryDate,
        deliveryWindow,
        notes: notes.trim() || undefined,
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
            {isHydrated && items.length > 0 ? (
              <section className="relative mt-2 overflow-hidden rounded-[var(--sp-radius-card)] bg-[var(--sp-primary-strong)] px-5 py-6 text-[var(--sp-on-primary-strong)] shadow-[var(--sp-shadow-soft)] sm:px-7 sm:py-7">
                <div className="absolute inset-y-0 right-0 w-2/3 bg-[radial-gradient(circle_at_78%_42%,color-mix(in_srgb,var(--sp-brand-accent)_42%,transparent),transparent_56%)]" aria-hidden="true" />
                <div className="relative z-10 grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--sp-on-primary-strong)_72%,transparent)]">{copy.items}: {items.length}</p>
                    <h1 className="mt-2 font-extended text-2xl font-bold tracking-[-0.03em] sm:text-3xl">{copy.title}</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[color-mix(in_srgb,var(--sp-on-primary-strong)_78%,transparent)]">{copy.subtitle}</p>
                  </div>
                  <div className="hidden items-center pr-2 sm:flex" aria-hidden="true">
                    {items.slice(0, 3).map((item, index) => (
                      <span key={`${item.productId}-${item.variantId || 'base'}`} className={`relative size-20 overflow-hidden rounded-[var(--sp-radius-control)] border-4 border-[var(--sp-primary-strong)] bg-white shadow-[0_12px_28px_rgb(0_0_0/22%)] ${index > 0 ? '-ml-5' : ''}`} style={{ zIndex: 3 - index }}>
                        <Image src={item.image || '/favicon.png'} alt="" fill sizes="80px" className="object-contain p-1.5" />
                      </span>
                    ))}
                  </div>
                </div>
              </section>
            ) : (
              <div className="mt-2">
                <h1 className="font-extended text-2xl font-bold tracking-[-0.025em] sm:text-3xl">{copy.title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--sp-ink-secondary)]">{copy.subtitle}</p>
              </div>
            )}

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
              <form id="request-checkout-form" onSubmit={submit} noValidate className="mt-7 grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
                <aside className="order-1 min-w-0 rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-4 shadow-[var(--sp-shadow-raised)] sm:p-5 lg:order-2 lg:sticky lg:top-6">
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

                <section className="order-2 min-w-0 overflow-hidden rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-4 shadow-[var(--sp-shadow-soft)] sm:p-6 lg:order-1">
                  <div className="border-b border-[var(--sp-line-soft)] pb-6">
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--sp-radius-control-inner)] bg-[color-mix(in_srgb,var(--sp-brand)_10%,var(--sp-surface))] text-[var(--sp-brand)]">
                        <MapPin className="size-5" aria-hidden="true" />
                      </span>
                      <div>
                        <h2 className="font-extended text-lg font-bold">{copy.deliveryTitle}</h2>
                        <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--sp-ink-tertiary)]">{copy.deliveryHint}</p>
                      </div>
                    </div>

                    <div className="mt-5">
                      <label htmlFor="checkout-address" className="block text-xs font-medium">{copy.address}</label>
                      <div className={`mt-2 flex min-h-12 items-center gap-2 rounded-[var(--sp-radius-control)] border bg-[var(--sp-control)] px-3 transition-[border-color,box-shadow] focus-within:border-[var(--sp-brand)] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--sp-brand)_18%,transparent)] ${fieldErrors.address ? 'border-[var(--sp-danger)]' : 'border-[var(--sp-line-strong)]'}`}>
                        <MapPin className="size-4 shrink-0 text-[var(--sp-ink-muted)]" aria-hidden="true" />
                        <input
                          ref={addressInputRef}
                          id="checkout-address"
                          name="deliveryAddress"
                          required
                          minLength={5}
                          maxLength={500}
                          value={deliveryAddress}
                          onFocus={() => setIsTextEntryFocused(true)}
                          onBlur={() => setIsTextEntryFocused(false)}
                          onChange={(event) => {
                            setDeliveryAddress(event.target.value);
                            if (fieldErrors.address) setFieldErrors((current) => ({ ...current, address: undefined }));
                          }}
                          autoComplete="street-address"
                          aria-invalid={fieldErrors.address ? true : undefined}
                          aria-describedby={fieldErrors.address ? 'checkout-address-error' : undefined}
                          className="sp-field-input min-w-0 w-full bg-transparent py-3 text-base"
                          placeholder={copy.addressPlaceholder}
                        />
                      </div>
                      {fieldErrors.address ? <p id="checkout-address-error" className="mt-1.5 text-xs leading-5 text-[var(--sp-danger)]">{fieldErrors.address}</p> : null}
                    </div>

                    <div className="mt-4 grid min-w-0 gap-4">
                      <DeliveryDatePicker
                        value={deliveryDate}
                        language={language}
                        label={copy.date}
                        error={fieldErrors.date}
                        onChange={(nextDate) => {
                          setDeliveryDate(nextDate);
                          if (fieldErrors.date) setFieldErrors((current) => ({ ...current, date: undefined }));
                        }}
                      />
                      <fieldset className="min-w-0">
                        <legend className="flex items-center gap-2 text-xs font-medium"><Clock3 className="size-4 text-[var(--sp-brand)]" aria-hidden="true" />{copy.time}</legend>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {DELIVERY_WINDOWS.map((window) => (
                            <button
                              key={window}
                              type="button"
                              onClick={() => {
                                setDeliveryWindow(window);
                                if (fieldErrors.window) setFieldErrors((current) => ({ ...current, window: undefined }));
                              }}
                              aria-pressed={deliveryWindow === window}
                              className={`min-h-12 rounded-[var(--sp-radius-control)] border px-2 text-[11px] font-semibold tabular-nums transition-colors ${deliveryWindow === window ? 'border-[var(--sp-brand)] bg-[color-mix(in_srgb,var(--sp-brand)_10%,var(--sp-surface))] text-[var(--sp-brand)]' : 'border-[var(--sp-line-strong)] bg-[var(--sp-control)] text-[var(--sp-ink-secondary)] hover:border-[var(--sp-brand)]'}`}
                            >
                              {window.replace('-', '–')}
                            </button>
                          ))}
                        </div>
                        {fieldErrors.window ? <p className="mt-1.5 text-xs leading-5 text-[var(--sp-danger)]">{fieldErrors.window}</p> : null}
                      </fieldset>
                    </div>

                    <div className="mt-4">
                      <label htmlFor="checkout-notes" className="flex items-center gap-2 text-xs font-medium">
                        <MessageSquareText className="size-4 text-[var(--sp-brand)]" aria-hidden="true" />
                        {copy.comment}
                        <span className="font-normal text-[var(--sp-ink-tertiary)]">{copy.commentOptional}</span>
                      </label>
                      <textarea
                        id="checkout-notes"
                        name="notes"
                        maxLength={1_000}
                        rows={3}
                        value={notes}
                        onFocus={() => setIsTextEntryFocused(true)}
                        onBlur={() => setIsTextEntryFocused(false)}
                        onChange={(event) => setNotes(event.target.value)}
                        className="admin-control mt-2 resize-y bg-[var(--sp-control)] p-3 text-base"
                        placeholder={copy.commentPlaceholder}
                      />
                    </div>
                  </div>

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
                      const title = getLocalizedText(item.productTitleRu, item.productTitleUz, item.productTitleEn, item.productTitleZh);
                      const variantTitle = getLocalizedText(item.variantTitleRu, item.variantTitleUz, item.variantTitleEn, item.variantTitleZh);
                      const orderRule = item.product ? getProductOrderRule(item.product, language, item.variant) : null;
                      const quantityStep = orderRule?.quantityStep || 1;
                      const minimumQuantity = orderRule?.minimumQuantity || quantityStep;
                      const orderSummary = item.product ? getOrderRuleSummary(item.product, language, item.variant) : '';
                      const quantityText = new Intl.NumberFormat(
                        language === 'uz' ? 'uz-UZ' : language === 'en' ? 'en-US' : 'ru-RU',
                        { maximumFractionDigits: 3 },
                      ).format(item.quantity);

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
                              <button type="button" onClick={() => {
                                if (item.quantity <= minimumQuantity) removeItem(item.productId, item.variantId);
                                else updateQuantity(item.productId, item.quantity - quantityStep, item.variantId);
                              }} className="flex size-11 shrink-0 cursor-pointer items-center justify-center" aria-label={copy.decrease}><Minus className="size-3.5" aria-hidden="true" /></button>
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
