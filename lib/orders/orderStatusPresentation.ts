import type { Language, RequestOrder } from '@/types';

const customerStatusMessages: Record<Language, Record<RequestOrder['status'], string>> = {
  ru: {
    new: 'Заявка принята. Менеджер свяжется с вами.',
    processing: 'Заявка в работе.',
    fulfilled: 'Заявка завершена.',
    cancelled: 'Заявка отменена.',
  },
  uz: {
    new: 'Ariza qabul qilindi. Menejer siz bilan bog‘lanadi.',
    processing: 'Ariza ko‘rib chiqilmoqda.',
    fulfilled: 'Ariza yakunlandi.',
    cancelled: 'Ariza bekor qilindi.',
  },
  en: {
    new: 'Your request has been received. A manager will contact you.',
    processing: 'Your request is being processed.',
    fulfilled: 'Your request is complete.',
    cancelled: 'Your request was cancelled.',
  },
  zh: {
    new: '申请已收到，经理将与您联系。',
    processing: '申请正在处理中。',
    fulfilled: '申请已完成。',
    cancelled: '申请已取消。',
  },
};

export function customerOrderStatusMessage(status: RequestOrder['status'], language: Language) {
  return customerStatusMessages[language][status];
}
