'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useRequestCart } from '@/context/RequestCartContext';
import { useLanguage } from '@/context/LanguageContext';
import { SanpackRepository } from '@/lib/repositories/sanpackRepository';
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
  const { t, getLocalizedText } = useLanguage();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setIsSubmitting(true);

    try {
      const created = await SanpackRepository.createRequest({
        companyName,
        inn,
        contactName,
        phone,
        deliveryAddress,
        deliveryType,
        paymentMethod,
        items: items.map((it) => ({
          product: it.product || {
            id: it.productId,
            slug: it.productSlug,
            sku: it.sku,
            status: 'published',
            categoryId: 'cat-all',
            categorySlug: 'all',
            titleRu: it.productTitleRu,
            titleUz: it.productTitleUz,
            shortDescriptionRu: '',
            shortDescriptionUz: '',
            descriptionRu: '',
            descriptionUz: '',
            images: [it.image || ''],
            mainImage: it.image || '',
            attributes: {},
            variants: [],
            currency: 'UZS',
            showPrice: true,
            stockStatus: 'in_stock',
            minimumOrder: 1,
            salesUnit: it.unit || 'шт',
            featured: false,
            newProduct: false,
            ownProduction: true,
            sortOrder: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          variant: it.variant,
          quantity: it.quantity,
          comment: it.comment,
        })),
        notes,
      });

      setSubmittedRequestNumber(created.requestNumber);
      clearCart();
    } catch (err) {
      console.error('Failed to submit request:', err);
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
                Заявка успешно отправлена!
              </h2>
              <p className="text-xs sm:text-sm text-[#68736D]">
                Номер вашей коммерческой заявки: <strong className="text-[#006F3C] font-mono text-base">{submittedRequestNumber}</strong>
              </p>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200 leading-relaxed max-w-lg mx-auto">
              Наш отдел B2B-продаж SANPACK уже обрабатывает ваш заказ. Менеджер свяжется с вами по указанному телефону для подтверждения наличия, выписки счёта-фактуры и согласования времени доставки.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <a
                href={`https://t.me/sanpack_uz?text=${encodeURIComponent(`Здравствуйте! Я оставил заявку №${submittedRequestNumber} на сайте SANPACK. Подскажите статус.`)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-6 py-3.5 bg-[#008348] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md"
              >
                <Send className="w-4 h-4" />
                <span>Написать менеджеру в Telegram</span>
              </a>

              <Link
                href="/catalog"
                className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs"
              >
                Вернуться в каталог
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-8">
              <Link href="/catalog" className="inline-flex items-center gap-1.5 text-xs text-[#006F3C] font-bold hover:underline mb-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Вернуться в каталог</span>
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#18231E]">
                Оформление B2B Заявки SANPACK
              </h1>
              <p className="text-xs text-[#68736D] mt-1">
                Сформируйте список нужных позиций и укажите данные компании для расчёта персональной оптовой скидки
              </p>
            </div>

            {items.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 max-w-md mx-auto">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-[#18231E]">Ваша корзина заявок пуста</h3>
                <p className="text-xs text-slate-500">
                  Перейдите в каталог и добавьте нужные товары, мусорные мешки, перчатки или плёнку.
                </p>
                <Link
                  href="/catalog"
                  className="inline-block px-6 py-3 bg-[#006F3C] text-white font-bold rounded-xl text-xs shadow-md"
                >
                  Перейти в каталог
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Items List Table */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <h3 className="font-bold text-sm text-[#18231E]">
                        Состав заявки ({items.length} поз.)
                      </h3>
                      <button
                        onClick={clearCart}
                        className="text-xs text-rose-600 font-semibold flex items-center gap-1 hover:underline"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Очистить список
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {items.map((item) => {
                        const pTitle = getLocalizedText(item.productTitleRu, item.productTitleUz);
                        const vTitle = item.variantTitleRu
                          ? getLocalizedText(item.variantTitleRu, item.variantTitleUz)
                          : null;

                        return (
                          <div key={`${item.productId}-${item.variantId || 'base'}`} className="py-4 flex items-center gap-4">
                            <img
                              src={item.image || 'https://picsum.photos/200/200'}
                              alt={pTitle}
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
                                Арт: {item.variant?.sku || item.product?.sku || '—'}
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
                                {item.quantity} {item.product?.salesUnit || 'шт.'}
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
                      Данные покупателя
                    </h3>

                    <div className="space-y-4 text-xs">
                      {/* Company Name */}
                      <div>
                        <label className="font-bold text-[#18231E] block mb-1">
                          Наименование организации / ИП *
                        </label>
                        <div className="relative">
                          <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            required
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder='ООО "HoReCa Group" или ИП'
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#006F3C] font-medium"
                          />
                        </div>
                      </div>

                      {/* INN */}
                      <div>
                        <label className="font-bold text-[#18231E] block mb-1">
                          ИНН компании (для счёта-фактуры)
                        </label>
                        <input
                          type="text"
                          value={inn}
                          onChange={(e) => setInn(e.target.value)}
                          placeholder="9 цифр ИНН"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#006F3C] font-mono"
                        />
                      </div>

                      {/* Contact Person */}
                      <div>
                        <label className="font-bold text-[#18231E] block mb-1">
                          ФИО контактного лица *
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            required
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            placeholder="Иван Иванов"
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#006F3C] font-medium"
                          />
                        </div>
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="font-bold text-[#18231E] block mb-1">
                          Телефон для связи *
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
                          Способ получения товара
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
                            <span>Курьерская доставка по Ташкенту</span>
                          </label>

                          <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 ${deliveryType === 'regional_shipping' ? 'border-[#006F3C] bg-[#EAF5EF] font-bold text-[#006F3C]' : 'border-slate-200'}`}>
                            <input
                              type="radio"
                              name="delivery"
                              checked={deliveryType === 'regional_shipping'}
                              onChange={() => setDeliveryType('regional_shipping')}
                              className="accent-[#006F3C]"
                            />
                            <span>Доставка по вилоятам Узбекистана</span>
                          </label>

                          <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 ${deliveryType === 'self_pickup' ? 'border-[#006F3C] bg-[#EAF5EF] font-bold text-[#006F3C]' : 'border-slate-200'}`}>
                            <input
                              type="radio"
                              name="delivery"
                              checked={deliveryType === 'self_pickup'}
                              onChange={() => setDeliveryType('self_pickup')}
                              className="accent-[#006F3C]"
                            />
                            <span>Самовывоз со склада SANPACK (Янги Сергели)</span>
                          </label>
                        </div>
                      </div>

                      {/* Address */}
                      {deliveryType !== 'self_pickup' && (
                        <div>
                          <label className="font-bold text-[#18231E] block mb-1">
                            Адрес доставки
                          </label>
                          <div className="relative">
                            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                            <input
                              type="text"
                              value={deliveryAddress}
                              onChange={(e) => setDeliveryAddress(e.target.value)}
                              placeholder="г. Ташкент, Мирабадский р-н..."
                              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#006F3C]"
                            />
                          </div>
                        </div>
                      )}

                      {/* Payment Method */}
                      <div>
                        <label className="font-bold text-[#18231E] block mb-1">
                          Форма оплаты
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('bank_transfer')}
                            className={`p-2 rounded-xl border text-[11px] font-bold transition-all flex flex-col items-center gap-1 ${paymentMethod === 'bank_transfer' ? 'border-[#006F3C] bg-[#EAF5EF] text-[#006F3C]' : 'border-slate-200'}`}
                          >
                            <FileText className="w-4 h-4" />
                            <span>Перечисление</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('cash')}
                            className={`p-2 rounded-xl border text-[11px] font-bold transition-all flex flex-col items-center gap-1 ${paymentMethod === 'cash' ? 'border-[#006F3C] bg-[#EAF5EF] text-[#006F3C]' : 'border-slate-200'}`}
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>Наличные</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('card')}
                            className={`p-2 rounded-xl border text-[11px] font-bold transition-all flex flex-col items-center gap-1 ${paymentMethod === 'card' ? 'border-[#006F3C] bg-[#EAF5EF] text-[#006F3C]' : 'border-slate-200'}`}
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>Uzcard / Humo</span>
                          </button>
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="font-bold text-[#18231E] block mb-1">
                          Комментарий или специфические требования к упаковке
                        </label>
                        <textarea
                          rows={2}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Нужна брендированная завязка, толщина 35мкм..."
                          className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-[#006F3C]"
                        />
                      </div>
                    </div>

                    {/* Summary Totals */}
                    <div className="pt-4 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Ориентировочная сумма:</span>
                        <span className="font-bold text-[#18231E]">
                          {totalAmount > 0 ? `${totalAmount.toLocaleString()} сум` : 'Индивидуальный расчёт'}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#68736D]">
                        * Финальная стоимость с учётом оптовой скидки за объём будет сформирована менеджером SANPACK.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 bg-[#008348] hover:bg-[#006F3C] text-white font-extrabold rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span>Отправка заявки...</span>
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
