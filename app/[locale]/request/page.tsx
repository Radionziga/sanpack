'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useRequestCart } from '@/context/RequestCartContext';
import { useLanguage } from '@/context/LanguageContext';
import { PublicSanpackRepository } from '@/lib/repositories/publicRepository';
import {
  Trash2,
  Send,
  Building,
  User,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  CheckCircle2,
  ArrowLeft,
  ShoppingBag,
} from 'lucide-react';

export default function RequestPage() {
  const { items, updateQuantity, removeItem, clearCart, totalAmount } = useRequestCart();
  const { t, getLocalizedText, language } = useLanguage();
  const copy = {
    ru: {
      error: 'Заявка не была сохранена. Повторите отправку позже.',
      success: 'Заявка успешно отправлена!',
      number: 'Номер вашей коммерческой заявки',
      successText: 'Менеджер SANPACK свяжется с вами для подтверждения наличия, документов и доставки.',
      telegram: 'Написать менеджеру в Telegram',
      telegramPrefill: 'Здравствуйте! Я оставил заявку на сайте SANPACK. Подскажите её статус.',
      back: 'Вернуться в каталог',
      title: 'Оформление B2B-заявки SANPACK',
      intro: 'Укажите нужные позиции и данные компании для расчёта персонального предложения.',
      empty: 'Ваша корзина заявок пуста',
      emptyText: 'Перейдите в каталог и добавьте нужные товары.',
      composition: 'Состав заявки',
      positions: 'поз.',
      clear: 'Очистить список',
      sku: 'Арт.',
      unit: 'шт.',
      buyer: 'Данные покупателя',
      company: 'Наименование организации или ИП',
      companyPlaceholder: 'Название компании или ИП',
      inn: 'ИНН компании',
      innPlaceholder: '9 цифр ИНН',
      contact: 'ФИО контактного лица',
      contactPlaceholder: 'Имя и фамилия',
      phone: 'Телефон для связи',
      delivery: 'Способ получения товара',
      deliveryOptions: ['Курьер по Ташкенту', 'Доставка по регионам Узбекистана', 'Самовывоз со склада SANPACK'],
      address: 'Адрес доставки',
      addressPlaceholder: 'Город, район, улица и дом',
      payment: 'Форма оплаты',
      paymentOptions: ['Перечисление', 'Наличные', 'Uzcard / Humo'],
      notes: 'Комментарий или требования к упаковке',
      notesPlaceholder: 'Опишите дополнительные требования',
      estimate: 'Ориентировочная сумма',
      individual: 'Индивидуальный расчёт',
      currency: 'сум',
      disclaimer: 'Финальную стоимость с оптовой скидкой сформирует менеджер SANPACK.',
      sending: 'Отправка заявки…',
    },
    uz: {
      error: 'Ariza saqlanmadi. Keyinroq qayta yuboring.',
      success: 'Ariza muvaffaqiyatli yuborildi!',
      number: 'Tijorat arizangiz raqami',
      successText: 'SANPACK menejeri mavjudlik, hujjatlar va yetkazib berishni tasdiqlash uchun siz bilan bog‘lanadi.',
      telegram: 'Telegram orqali menejerga yozish',
      telegramPrefill: 'Salom! Men SANPACK saytida ariza qoldirdim. Holatini ayta olasizmi?',
      back: 'Katalogga qaytish',
      title: 'SANPACK B2B arizasini rasmiylashtirish',
      intro: 'Shaxsiy taklifni hisoblash uchun mahsulotlar va kompaniya ma’lumotlarini kiriting.',
      empty: 'Arizalar savatingiz bo‘sh',
      emptyText: 'Katalogga o‘tib, kerakli mahsulotlarni qo‘shing.',
      composition: 'Ariza tarkibi',
      positions: 'poz.',
      clear: 'Ro‘yxatni tozalash',
      sku: 'Art.',
      unit: 'dona',
      buyer: 'Xaridor ma’lumotlari',
      company: 'Tashkilot yoki YTT nomi',
      companyPlaceholder: 'Kompaniya yoki YTT nomi',
      inn: 'Kompaniya STIRi',
      innPlaceholder: '9 raqamli STIR',
      contact: 'Aloqa uchun shaxs',
      contactPlaceholder: 'Ism va familiya',
      phone: 'Aloqa telefoni',
      delivery: 'Mahsulotni olish usuli',
      deliveryOptions: ['Toshkent bo‘ylab kuryer', 'O‘zbekiston hududlariga yetkazish', 'SANPACK omboridan olib ketish'],
      address: 'Yetkazib berish manzili',
      addressPlaceholder: 'Shahar, tuman, ko‘cha va uy',
      payment: 'To‘lov shakli',
      paymentOptions: ['Bank o‘tkazmasi', 'Naqd pul', 'Uzcard / Humo'],
      notes: 'Izoh yoki qadoqlash talablari',
      notesPlaceholder: 'Qo‘shimcha talablarni yozing',
      estimate: 'Taxminiy summa',
      individual: 'Individual hisob',
      currency: 'so‘m',
      disclaimer: 'Ulgurji chegirma bilan yakuniy narxni SANPACK menejeri hisoblaydi.',
      sending: 'Ariza yuborilmoqda…',
    },
    en: {
      error: 'The request was not saved. Please try again later.',
      success: 'Request sent successfully',
      number: 'Your commercial request number',
      successText: 'A SANPACK manager will contact you to confirm availability, documents and delivery.',
      telegram: 'Message a manager on Telegram',
      telegramPrefill: 'Hello! I submitted a request on the SANPACK website. Could you share its status?',
      back: 'Back to catalog',
      title: 'Submit a SANPACK B2B request',
      intro: 'Enter the required products and company details for a tailored quotation.',
      empty: 'Your quote list is empty',
      emptyText: 'Browse the catalog and add the products you need.',
      composition: 'Request items',
      positions: 'items',
      clear: 'Clear list',
      sku: 'SKU',
      unit: 'pcs',
      buyer: 'Buyer details',
      company: 'Company or sole trader name',
      companyPlaceholder: 'Company or sole trader',
      inn: 'Company tax ID',
      innPlaceholder: 'Tax ID',
      contact: 'Contact person',
      contactPlaceholder: 'First and last name',
      phone: 'Contact phone',
      delivery: 'Delivery method',
      deliveryOptions: ['Courier delivery in Tashkent', 'Delivery across Uzbekistan', 'Pickup from the SANPACK warehouse'],
      address: 'Delivery address',
      addressPlaceholder: 'City, district, street and building',
      payment: 'Payment method',
      paymentOptions: ['Bank transfer', 'Cash', 'Uzcard / Humo'],
      notes: 'Comments or packaging requirements',
      notesPlaceholder: 'Describe any additional requirements',
      estimate: 'Estimated total',
      individual: 'Individual quotation',
      currency: 'UZS',
      disclaimer: 'A SANPACK manager will calculate the final price including volume discounts.',
      sending: 'Sending request…',
    },
  }[language];

  const [companyName, setCompanyName] = useState('');
  const [inn, setInn] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryType, setDeliveryType] = useState<'tashkent_courier' | 'regional_shipping' | 'self_pickup'>('tashkent_courier');
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'cash' | 'card'>('bank_transfer');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRequestNumber, setSubmittedRequestNumber] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const created = await PublicSanpackRepository.createRequest({
        companyName,
        inn,
        contactName,
        phone,
        deliveryAddress,
        deliveryType,
        paymentMethod,
        items: items.map(({ product: _product, variant: _variant, ...item }) => item),
        notes,
      });

      setSubmittedRequestNumber(created.requestNumber);
      clearCart();
    } catch (err) {
      console.error('Failed to submit request:', err);
      setSubmitError(
        err instanceof Error
          ? err.message
          : copy.error
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7F6]">
      <Header />

      <main className="flex-1 py-10 max-w-7xl mx-auto px-4 w-full">
        {/* Success Modal */}
        {submittedRequestNumber ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 md:p-12 text-center max-w-2xl mx-auto shadow-2xl space-y-6">
            <div className="w-16 h-16 rounded-full bg-[#EAF5EF] text-[#006F3C] flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#18231E]">
                {copy.success}
              </h2>
              <p className="text-xs sm:text-sm text-[#68736D]">
                {copy.number}: <strong className="text-[#006F3C] font-mono text-base">{submittedRequestNumber}</strong>
              </p>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200 leading-relaxed max-w-lg mx-auto">
              {copy.successText}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <a
                href={`https://t.me/sanpack_uz?text=${encodeURIComponent(`${copy.telegramPrefill} №${submittedRequestNumber}`)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-6 py-3.5 bg-[#008348] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md"
              >
                <Send className="w-4 h-4" />
                <span>{copy.telegram}</span>
              </a>

              <Link
                href="/catalog"
                className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs"
              >
                {copy.back}
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-8">
              <Link href="/catalog" className="inline-flex items-center gap-1.5 text-xs text-[#006F3C] font-bold hover:underline mb-2">
                <ArrowLeft className="w-4 h-4" />
                <span>{copy.back}</span>
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#18231E]">
                {copy.title}
              </h1>
              <p className="text-xs text-[#68736D] mt-1">
                {copy.intro}
              </p>
            </div>

            {items.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 max-w-md mx-auto">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-[#18231E]">{copy.empty}</h3>
                <p className="text-xs text-slate-500">
                  {copy.emptyText}
                </p>
                <Link
                  href="/catalog"
                  className="inline-block px-6 py-3 bg-[#006F3C] text-white font-bold rounded-xl text-xs shadow-md"
                >
                  {t('goToCatalog')}
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Items List Table */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <h3 className="font-bold text-sm text-[#18231E]">
                        {copy.composition} ({items.length} {copy.positions})
                      </h3>
                      <button
                        onClick={clearCart}
                        className="text-xs text-rose-600 font-semibold flex items-center gap-1 hover:underline"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> {copy.clear}
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {items.map((item) => {
                        const pTitle = getLocalizedText(item.productTitleRu, item.productTitleUz, item.productTitleEn);
                        const vTitle = item.variantTitleRu
                          ? getLocalizedText(item.variantTitleRu, item.variantTitleUz, item.variantTitleEn)
                          : null;

                        return (
                          <div key={`${item.productId}-${item.variantId || 'base'}`} className="py-4 flex items-center gap-4">
                            <Image
                              src={item.image || 'https://picsum.photos/200/200'}
                              alt={pTitle}
                              width={64}
                              height={64}
                              sizes="64px"
                              className="w-16 h-16 object-contain rounded-xl bg-slate-50 p-1 border border-slate-200 shrink-0"
                            />

                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-[#18231E] line-clamp-1">
                                {pTitle}
                              </h4>
                              {vTitle && (
                                <span className="text-[11px] text-[#006F3C] font-semibold block">
                                  {vTitle}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 block">
                                {copy.sku}: {item.variant?.sku || item.product?.sku || '—'}
                              </span>
                            </div>

                            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50 shrink-0">
                              <button
                                onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                                className="px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200"
                              >
                                -
                              </button>
                              <span className="px-3 py-1 text-xs font-bold text-[#18231E]">
                                {item.quantity} {item.product?.salesUnit || copy.unit}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                                className="px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200"
                              >
                                +
                              </button>
                            </div>

                            <button
                              onClick={() => removeItem(item.productId, item.variantId)}
                              className="text-slate-300 hover:text-rose-500 p-1 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Checkout Form */}
                <div className="lg:col-span-5">
                  <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xl space-y-5">
                    <h3 className="font-extrabold text-base text-[#18231E] border-b pb-3">
                      {copy.buyer}
                    </h3>

                    <div className="space-y-4 text-xs">
                      {/* Company Name */}
                      <div>
                        <label className="font-bold text-[#18231E] block mb-1">
                          {copy.company} *
                        </label>
                        <div className="relative">
                          <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            required
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder={copy.companyPlaceholder}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#006F3C] font-medium"
                          />
                        </div>
                      </div>

                      {/* INN */}
                      <div>
                        <label className="font-bold text-[#18231E] block mb-1">
                          {copy.inn}
                        </label>
                        <input
                          type="text"
                          value={inn}
                          onChange={(e) => setInn(e.target.value)}
                          placeholder={copy.innPlaceholder}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#006F3C] font-mono"
                        />
                      </div>

                      {/* Contact Person */}
                      <div>
                        <label className="font-bold text-[#18231E] block mb-1">
                          {copy.contact} *
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            required
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            placeholder={copy.contactPlaceholder}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#006F3C] font-medium"
                          />
                        </div>
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="font-bold text-[#18231E] block mb-1">
                          {copy.phone} *
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#006F3C] font-bold text-[#18231E]"
                          />
                        </div>
                      </div>

                      {/* Delivery Type */}
                      <div>
                        <label className="font-bold text-[#18231E] block mb-1">
                          {copy.delivery}
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                          <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 ${deliveryType === 'tashkent_courier' ? 'border-[#006F3C] bg-[#EAF5EF] font-bold text-[#006F3C]' : 'border-slate-200'}`}>
                            <input
                              type="radio"
                              name="delivery"
                              checked={deliveryType === 'tashkent_courier'}
                              onChange={() => setDeliveryType('tashkent_courier')}
                              className="accent-[#006F3C]"
                            />
                            <span>{copy.deliveryOptions[0]}</span>
                          </label>

                          <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 ${deliveryType === 'regional_shipping' ? 'border-[#006F3C] bg-[#EAF5EF] font-bold text-[#006F3C]' : 'border-slate-200'}`}>
                            <input
                              type="radio"
                              name="delivery"
                              checked={deliveryType === 'regional_shipping'}
                              onChange={() => setDeliveryType('regional_shipping')}
                              className="accent-[#006F3C]"
                            />
                            <span>{copy.deliveryOptions[1]}</span>
                          </label>

                          <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 ${deliveryType === 'self_pickup' ? 'border-[#006F3C] bg-[#EAF5EF] font-bold text-[#006F3C]' : 'border-slate-200'}`}>
                            <input
                              type="radio"
                              name="delivery"
                              checked={deliveryType === 'self_pickup'}
                              onChange={() => setDeliveryType('self_pickup')}
                              className="accent-[#006F3C]"
                            />
                            <span>{copy.deliveryOptions[2]}</span>
                          </label>
                        </div>
                      </div>

                      {/* Address */}
                      {deliveryType !== 'self_pickup' && (
                        <div>
                          <label className="font-bold text-[#18231E] block mb-1">
                            {copy.address}
                          </label>
                          <div className="relative">
                            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                            <input
                              type="text"
                              value={deliveryAddress}
                              onChange={(e) => setDeliveryAddress(e.target.value)}
                              placeholder={copy.addressPlaceholder}
                              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#006F3C]"
                            />
                          </div>
                        </div>
                      )}

                      {/* Payment Method */}
                      <div>
                        <label className="font-bold text-[#18231E] block mb-1">
                          {copy.payment}
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('bank_transfer')}
                            className={`p-2 rounded-xl border text-[11px] font-bold transition-all flex flex-col items-center gap-1 ${paymentMethod === 'bank_transfer' ? 'border-[#006F3C] bg-[#EAF5EF] text-[#006F3C]' : 'border-slate-200'}`}
                          >
                            <FileText className="w-4 h-4" />
                            <span>{copy.paymentOptions[0]}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('cash')}
                            className={`p-2 rounded-xl border text-[11px] font-bold transition-all flex flex-col items-center gap-1 ${paymentMethod === 'cash' ? 'border-[#006F3C] bg-[#EAF5EF] text-[#006F3C]' : 'border-slate-200'}`}
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>{copy.paymentOptions[1]}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('card')}
                            className={`p-2 rounded-xl border text-[11px] font-bold transition-all flex flex-col items-center gap-1 ${paymentMethod === 'card' ? 'border-[#006F3C] bg-[#EAF5EF] text-[#006F3C]' : 'border-slate-200'}`}
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>{copy.paymentOptions[2]}</span>
                          </button>
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="font-bold text-[#18231E] block mb-1">
                          {copy.notes}
                        </label>
                        <textarea
                          rows={2}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder={copy.notesPlaceholder}
                          className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-[#006F3C]"
                        />
                      </div>
                    </div>

                    {/* Summary Totals */}
                    <div className="pt-4 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{copy.estimate}:</span>
                        <span className="font-bold text-[#18231E]">
                          {totalAmount > 0 ? `${totalAmount.toLocaleString()} ${copy.currency}` : copy.individual}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#68736D]">
                        * {copy.disclaimer}
                      </p>
                    </div>

                    {submitError && (
                      <div
                        role="alert"
                        className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700"
                      >
                        {submitError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 bg-[#008348] hover:bg-[#006F3C] text-white font-extrabold rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span>{copy.sending}</span>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>{t('submitRequest')}</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
