import type { Language } from '@/types';

const basePageCopy = {
  ru: {
    about: {
      eyebrow: 'Производитель и импортёр в Узбекистане',
      intro: 'Надёжный B2B-партнёр в сфере комплексного снабжения упаковочными материалами, одноразовыми расходниками, пищевой фольгой и специализированными товарами для HoReCa, ритейла и пищевой промышленности.',
      metrics: ['Постоянных B2B-клиентов', 'Складских площадей в Ташкенте', 'Гарантия прочности швов и плотности', 'Оперативная отгрузка и поддержка'],
      missionTitle: 'Миссия SANPACK — бесперебойность вашего бизнеса',
      mission: 'Даже небольшой сбой в поставках мешков, фольги или пищевых перчаток может остановить работу кухни или отельного сервиса. Поэтому SANPACK поддерживает буферный запас готовой продукции на складах в Ташкенте.',
      benefits: ['Собственное производство прочной полиэтиленовой продукции', 'Экологичные и безотходные производственные циклы', 'Полный пакет документов и сертификатов'],
      imageAlt: 'Производство SANPACK',
    },
    branding: {
      eyebrow: 'Брендирование упаковки и печать логотипа',
      intro: 'Разработаем и произведём фирменную упаковку с логотипом вашего бренда: от пакетов «Майка» до крафт-пакетов, коробок и ресторанной полиграфии.',
      services: [
        ['Пакеты «Майка» с логотипом', 'Флексопечать до 4 цветов, различная плотность от 15 до 45 мкм и размеры.'],
        ['Крафт-пакеты с закрученными ручками', 'Экологичная упаковка для ресторанов, бургерных и бутиков с шелкографией.'],
        ['Этикетки и стикеры контроля вскрытия', 'Наклейки для защиты курьерской доставки от несанкционированного вскрытия.'],
      ],
      ctaTitle: 'Хотите заказать расчёт макета и тиража?',
      ctaText: 'Оставьте заявку, и дизайнер SANPACK бесплатно подготовит визуализацию вашего логотипа на упаковке.',
      ctaButton: 'Запросить расчёт брендирования',
    },
    delivery: {
      intro: 'Прозрачные и оперативные условия отгрузки по всему Узбекистану',
      cards: [
        ['Курьер по Ташкенту', 'Бесплатная доставка при сумме заказа от 2 000 000 сум. При заказе до 12:00 отгрузка осуществляется в тот же день.'],
        ['Регионы Узбекистана', 'Отправка через проверенные логистические службы в Самарканд, Наманган, Андижан, Бухару, Карши и Нукус.'],
        ['Самовывоз со склада', 'Ташкент, Сергелийский район, ул. Янги Сергели, 14А. Склад работает с понедельника по субботу с 09:00 до 18:00.'],
      ],
      paymentTitle: 'Формы оплаты для юридических лиц',
      payments: [
        ['Безналичный расчёт', 'Полный пакет бухгалтерских документов в электронном виде. НДС включён.'],
        ['Uzcard, Humo и корпоративные карты', 'Оплата при получении или через выставленный QR-счёт.'],
      ],
    },
    contacts: {
      intro: 'Офис продаж и склад готовой продукции SANPACK в Ташкенте',
      salesTitle: 'Контакты отдела продаж',
      sales: 'Отдел B2B-продаж',
      email: 'Электронная почта',
      addressLabel: 'Адрес склада и офиса',
      address: 'Республика Узбекистан, Ташкент, Сергелийский район, ул. Янги Сергели, 14А',
      hoursLabel: 'Режим работы',
      hours: 'Понедельник — суббота: 09:00–18:00. Воскресенье — выходной.',
      callback: 'Заказать обратный звонок',
      mapTitle: 'Карта проезда к складу SANPACK',
      landmark: 'Ориентир: Сергелийский авторынок, ул. Янги Сергели.',
    },
    clients: {
      intro: 'Нам доверяют ведущие ресторанные холдинги, отели и производственные сети Узбекистана',
      reviewsTitle: 'Отзывы наших B2B-партнёров',
      reviews: [
        ['Сеть ресторанов Caravan Group', 'Алишер Каримов, директор по закупкам', 'Работаем с SANPACK больше двух лет. Стабильное качество и своевременная доставка по Ташкенту.'],
        ['Пекарня Bon!', 'Мадина Саидова, руководитель производства', 'Заказываем брендированные пакеты и пергамент. Чёткая печать, яркие цвета и оперативное производство.'],
        ['Lotte City Hotel', 'Фарход Турсунов, менеджер HoReCa', 'Отличный B2B-сервис: образцы, быстрые документы и внимательный менеджер.'],
      ],
    },
    favorites: {
      intro: 'Сохранённые позиции для быстрого добавления в заявку',
      clear: 'Очистить избранное',
      emptyTitle: 'Список избранного пуст',
      emptyText: 'Нажмите на сердечко у товара в каталоге, чтобы сохранить его в этом разделе.',
    },
    search: {
      title: 'Результаты поиска по запросу',
      emptyTitle: 'По вашему запросу ничего не найдено',
      emptyText: 'Проверьте артикул или название либо свяжитесь с менеджером SANPACK для индивидуального подбора.',
      loading: 'Загрузка результатов…',
    },
    privacy: {
      title: 'Политика конфиденциальности SANPACK',
      intro: 'Политика действует в отношении информации, которую SANPACK получает при использовании сайта.',
      sections: [
        ['1. Обработка персональных данных', 'Мы собираем только данные, необходимые для подготовки предложения, оформления документов и доставки заказа.'],
        ['2. Защита информации', 'SANPACK не передаёт персональные данные третьим лицам, кроме случаев, предусмотренных законодательством Республики Узбекистан.'],
      ],
    },
    terms: {
      title: 'Пользовательское соглашение SANPACK',
      intro: 'Оформляя заявку, пользователь соглашается с правилами B2B-обслуживания и условиями коммерческой поставки.',
      sections: [
        ['1. Цены и скидки', 'Цены на сайте носят ознакомительный характер. Итоговая стоимость и объёмная скидка рассчитываются менеджером при подготовке счёта.'],
        ['2. Отгрузка товаров', 'Отгрузка производится после согласования условий оплаты и адреса доставки.'],
      ],
    },
  },
  uz: {
    about: {
      eyebrow: 'O‘zbekistondagi ishlab chiqaruvchi va importchi',
      intro: 'HoReCa, chakana savdo va oziq-ovqat sanoati uchun qadoqlash, bir martalik sarf materiallari, folga va maxsus mahsulotlarni kompleks yetkazib beruvchi ishonchli B2B hamkor.',
      metrics: ['Doimiy B2B mijozlar', 'Toshkentdagi ombor maydoni', 'Chok va zichlik mustahkamligi kafolati', 'Tezkor jo‘natish va yordam'],
      missionTitle: 'SANPACK missiyasi — biznesingiz uzluksizligi',
      mission: 'Paket, folga yoki oziq-ovqat qo‘lqoplari yetkazib berishdagi kichik uzilish ham oshxona yoki mehmonxona ishini to‘xtatishi mumkin. Shu sabab SANPACK Toshkent omborlarida doimiy zaxira saqlaydi.',
      benefits: ['Mustahkam polietilen mahsulotlarining o‘z ishlab chiqarishi', 'Ekologik va chiqindisiz ishlab chiqarish sikllari', 'To‘liq hujjatlar va sertifikatlar to‘plami'],
      imageAlt: 'SANPACK ishlab chiqarishi',
    },
    branding: {
      eyebrow: 'Qadoqlashni brendlash va logotip bosish',
      intro: 'Brendingiz logotipi tushirilgan paketlar, kraft paketlar, qutilar va restoran poligrafiyasini ishlab chiqamiz va ishlab chiqaramiz.',
      services: [
        ['Logotipli “Mayka” paketlar', '4 ranggacha fleksobosma, 15–45 mkm zichlik va turli o‘lchamlar.'],
        ['Buralgan tutqichli kraft paketlar', 'Restoran, burger va butiklar uchun ekologik ipak bosmali qadoqlash.'],
        ['Yorliqlar va ochilishni nazorat qiluvchi stikerlar', 'Kuryerlik yetkazib berishni ruxsatsiz ochilishdan himoyalovchi stikerlar.'],
      ],
      ctaTitle: 'Maket va tiraj hisobini olishni xohlaysizmi?',
      ctaText: 'Ariza qoldiring, SANPACK dizayneri logotipingizning qadoqdagi ko‘rinishini bepul tayyorlaydi.',
      ctaButton: 'Brendlash hisobini so‘rash',
    },
    delivery: {
      intro: 'Butun O‘zbekiston bo‘ylab shaffof va tezkor yetkazib berish shartlari',
      cards: [
        ['Toshkent bo‘ylab kuryer', '2 000 000 so‘mdan boshlab bepul yetkazib berish. Soat 12:00 gacha berilgan buyurtma shu kuni jo‘natiladi.'],
        ['O‘zbekiston hududlari', 'Samarqand, Namangan, Andijon, Buxoro, Qarshi va Nukusga ishonchli logistika xizmatlari orqali jo‘natish.'],
        ['Ombordan olib ketish', 'Toshkent, Sergeli tumani, Yangi Sergeli ko‘chasi, 14A. Ombor dushanbadan shanbagacha 09:00–18:00 ishlaydi.'],
      ],
      paymentTitle: 'Yuridik shaxslar uchun to‘lov shakllari',
      payments: [
        ['Bank o‘tkazmasi', 'Elektron shakldagi to‘liq buxgalteriya hujjatlari. QQS kiritilgan.'],
        ['Uzcard, Humo va korporativ kartalar', 'Qabul qilganda yoki QR-hisob orqali to‘lov.'],
      ],
    },
    contacts: {
      intro: 'SANPACK savdo ofisi va tayyor mahsulotlar ombori Toshkentda',
      salesTitle: 'Savdo bo‘limi aloqalari',
      sales: 'B2B savdo bo‘limi',
      email: 'Elektron pochta',
      addressLabel: 'Ombor va ofis manzili',
      address: 'O‘zbekiston Respublikasi, Toshkent, Sergeli tumani, Yangi Sergeli ko‘chasi, 14A',
      hoursLabel: 'Ish vaqti',
      hours: 'Dushanba — shanba: 09:00–18:00. Yakshanba — dam olish kuni.',
      callback: 'Qayta qo‘ng‘iroq so‘rash',
      mapTitle: 'SANPACK omboriga borish xaritasi',
      landmark: 'Mo‘ljal: Sergeli avtomobil bozori, Yangi Sergeli ko‘chasi.',
    },
    clients: {
      intro: 'Bizga O‘zbekistonning yetakchi restoran, mehmonxona va ishlab chiqarish tarmoqlari ishonadi',
      reviewsTitle: 'B2B hamkorlarimiz fikrlari',
      reviews: [
        ['Caravan Group restoranlar tarmog‘i', 'Alisher Karimov, xaridlar direktori', 'SANPACK bilan ikki yildan ortiq ishlaymiz. Sifat barqaror, Toshkent bo‘ylab yetkazib berish o‘z vaqtida.'],
        ['Bon! novvoyxonasi', 'Madina Saidova, ishlab chiqarish rahbari', 'Brendlangan paketlar va pergament buyurtma qilamiz. Bosma aniq, ranglar yorqin, ishlab chiqarish tezkor.'],
        ['Lotte City Hotel', 'Farhod Tursunov, HoReCa menejeri', 'Ajoyib B2B xizmati: namunalar, tezkor hujjatlar va e’tiborli menejer.'],
      ],
    },
    favorites: {
      intro: 'Arizaga tez qo‘shish uchun saqlangan mahsulotlar',
      clear: 'Tanlanganlarni tozalash',
      emptyTitle: 'Tanlanganlar ro‘yxati bo‘sh',
      emptyText: 'Mahsulotni shu bo‘limga saqlash uchun katalogdagi yurakcha belgisini bosing.',
    },
    search: {
      title: 'Qidiruv natijalari',
      emptyTitle: 'So‘rovingiz bo‘yicha hech narsa topilmadi',
      emptyText: 'Artikul yoki nomni tekshiring yoxud individual tanlov uchun SANPACK menejeriga murojaat qiling.',
      loading: 'Natijalar yuklanmoqda…',
    },
    privacy: {
      title: 'SANPACK maxfiylik siyosati',
      intro: 'Ushbu siyosat SANPACK sayt ishlatilganda oladigan ma’lumotlarga nisbatan amal qiladi.',
      sections: [
        ['1. Shaxsiy ma’lumotlarni qayta ishlash', 'Biz faqat taklif tayyorlash, hujjatlarni rasmiylashtirish va buyurtmani yetkazish uchun zarur ma’lumotlarni yig‘amiz.'],
        ['2. Ma’lumotlarni himoya qilish', 'SANPACK shaxsiy ma’lumotlarni O‘zbekiston Respublikasi qonunchiligida nazarda tutilgan holatlardan tashqari uchinchi shaxslarga bermaydi.'],
      ],
    },
    terms: {
      title: 'SANPACK foydalanuvchi kelishuvi',
      intro: 'Ariza yuborish orqali foydalanuvchi B2B xizmat qoidalari va tijorat yetkazib berish shartlariga rozilik bildiradi.',
      sections: [
        ['1. Narxlar va chegirmalar', 'Saytdagi narxlar ma’lumot uchun berilgan. Yakuniy narx va hajm chegirmasi hisob tayyorlanganda menejer tomonidan aniqlanadi.'],
        ['2. Mahsulotlarni jo‘natish', 'Mahsulotlar to‘lov shartlari va yetkazib berish manzili kelishilgandan so‘ng jo‘natiladi.'],
      ],
    },
  },
  en: {
    about: {
      eyebrow: 'Manufacturer and importer in Uzbekistan',
      intro: 'A reliable B2B partner for packaging, disposable supplies, food foil and specialist products for HoReCa, retail and food production.',
      metrics: ['Regular B2B clients', 'Warehouse space in Tashkent', 'Seam strength and density guarantee', 'Fast dispatch and support'],
      missionTitle: 'SANPACK’s mission is to keep your business running',
      mission: 'Even a small disruption in bags, foil or food gloves can stop a kitchen or hotel service. SANPACK therefore maintains buffer stock at its Tashkent warehouses.',
      benefits: ['In-house production of durable polyethylene products', 'Low-waste, environmentally responsible production cycles', 'A complete set of documents and certificates'],
      imageAlt: 'SANPACK production',
    },
    branding: {
      eyebrow: 'Branded packaging and logo printing',
      intro: 'We design and produce packaging with your logo, from carrier bags to kraft bags, boxes and restaurant print materials.',
      services: [
        ['Logo-printed carrier bags', 'Flexographic printing in up to four colors, 15–45 μm thickness and multiple sizes.'],
        ['Kraft bags with twisted handles', 'Sustainable screen-printed packaging for restaurants, burger shops and boutiques.'],
        ['Labels and tamper-evident stickers', 'Stickers that protect courier deliveries against unauthorized opening.'],
      ],
      ctaTitle: 'Would you like a design and print-run estimate?',
      ctaText: 'Send a request and a SANPACK designer will prepare a free visualization of your logo on the packaging.',
      ctaButton: 'Request a branding estimate',
    },
    delivery: {
      intro: 'Clear and efficient delivery throughout Uzbekistan',
      cards: [
        ['Courier delivery in Tashkent', 'Free delivery on orders over UZS 2,000,000. Orders placed before 12:00 are dispatched the same day.'],
        ['Regions of Uzbekistan', 'Shipping through trusted logistics providers to Samarkand, Namangan, Andijan, Bukhara, Karshi and Nukus.'],
        ['Warehouse pickup', '14A Yangi Sergeli Street, Sergeli district, Tashkent. Open Monday–Saturday, 09:00–18:00.'],
      ],
      paymentTitle: 'Payment options for businesses',
      payments: [
        ['Bank transfer', 'A complete set of accounting documents in electronic form. VAT included.'],
        ['Uzcard, Humo and corporate cards', 'Pay on receipt or via an issued QR invoice.'],
      ],
    },
    contacts: {
      intro: 'SANPACK sales office and finished-goods warehouse in Tashkent',
      salesTitle: 'Sales contacts',
      sales: 'B2B sales team',
      email: 'Email',
      addressLabel: 'Warehouse and office address',
      address: '14A Yangi Sergeli Street, Sergeli district, Tashkent, Republic of Uzbekistan',
      hoursLabel: 'Business hours',
      hours: 'Monday–Saturday: 09:00–18:00. Closed on Sunday.',
      callback: 'Request a callback',
      mapTitle: 'Directions to the SANPACK warehouse',
      landmark: 'Landmark: Sergeli car market, Yangi Sergeli Street.',
    },
    clients: {
      intro: 'Trusted by leading restaurant groups, hotels and production businesses in Uzbekistan',
      reviewsTitle: 'What our B2B partners say',
      reviews: [
        ['Caravan Group restaurants', 'Alisher Karimov, Procurement Director', 'We have worked with SANPACK for more than two years. Quality is consistent and Tashkent deliveries arrive on time.'],
        ['Bon! bakery', 'Madina Saidova, Head of Production', 'We order branded bags and parchment. Printing is sharp, colors are bright and production is fast.'],
        ['Lotte City Hotel', 'Farkhod Tursunov, HoReCa Manager', 'Excellent B2B service with samples, fast documentation and an attentive account manager.'],
      ],
    },
    favorites: {
      intro: 'Saved items for quick addition to a quote',
      clear: 'Clear favorites',
      emptyTitle: 'Your favorites list is empty',
      emptyText: 'Select the heart on any catalog product to save it here.',
    },
    search: {
      title: 'Search results for',
      emptyTitle: 'No results found',
      emptyText: 'Check the SKU or product name, or contact a SANPACK manager for individual assistance.',
      loading: 'Loading results…',
    },
    privacy: {
      title: 'SANPACK privacy policy',
      intro: 'This policy applies to information SANPACK receives when you use this website.',
      sections: [
        ['1. Personal data processing', 'We collect only the data needed to prepare a quotation, issue documents and deliver an order.'],
        ['2. Information security', 'SANPACK does not share personal data with third parties except where required by the laws of the Republic of Uzbekistan.'],
      ],
    },
    terms: {
      title: 'SANPACK terms of use',
      intro: 'By submitting a request, the user agrees to the B2B service rules and commercial supply terms.',
      sections: [
        ['1. Prices and discounts', 'Website prices are indicative. Final pricing and volume discounts are calculated by a manager when the invoice is prepared.'],
        ['2. Dispatch', 'Products are dispatched after payment terms and the delivery address have been agreed.'],
      ],
    },
  },
} as const;

export const pageCopy = {
  ...basePageCopy,
  zh: {
    about: {
      eyebrow: '乌兹别克斯坦本地生产商与进口商',
      intro: 'SANPACK 是值得信赖的 B2B 综合供应伙伴，为 HoReCa、零售和食品生产企业提供包装材料、一次性耗材、食品箔材及专业用品。',
      metrics: ['长期 B2B 客户', '塔什干仓储面积', '接缝强度与材料密度保障', '快速发货与业务支持'],
      missionTitle: 'SANPACK 的使命：保障您的业务持续运转',
      mission: '垃圾袋、铝箔或食品手套供应中的一次小中断，也可能影响厨房或酒店服务。为此，SANPACK 在塔什干仓库长期保有安全库存。',
      benefits: ['自主生产高强度聚乙烯制品', '环保、低废料的生产流程', '完整的文件与证书'],
      imageAlt: 'SANPACK 生产基地',
    },
    branding: {
      eyebrow: '包装定制与品牌标识印刷',
      intro: '我们为您的品牌设计并生产定制包装，包括背心袋、牛皮纸袋、包装盒和餐饮印刷品。',
      services: [
        ['定制标识背心袋', '支持最多四色柔版印刷，厚度 15–45 微米，并提供多种尺寸。'],
        ['扭绳手提牛皮纸袋', '适用于餐厅、汉堡店和精品店的环保丝网印刷包装。'],
        ['标签与防拆封贴纸', '用于保护外送订单，防止配送过程中未经许可开启。'],
      ],
      ctaTitle: '需要设计稿和印量报价吗？',
      ctaText: '提交需求后，SANPACK 设计师将免费制作您的标识在包装上的效果图。',
      ctaButton: '申请品牌包装报价',
    },
    delivery: {
      intro: '覆盖乌兹别克斯坦的清晰、高效配送方案',
      cards: [
        ['塔什干市内配送', '订单金额满 2,000,000 苏姆可免费配送。12:00 前提交的订单可安排当日发货。'],
        ['乌兹别克斯坦各地区', '通过可靠的物流服务发往撒马尔罕、纳曼干、安集延、布哈拉、卡尔希和努库斯。'],
        ['仓库自提', '地址：塔什干市谢尔盖利区扬吉谢尔盖利街 14A。仓库周一至周六 09:00–18:00 营业。'],
      ],
      paymentTitle: '企业客户付款方式',
      payments: [
        ['银行转账', '提供完整的电子会计文件，价格包含增值税。'],
        ['Uzcard、Humo 与企业银行卡', '可在收货时付款，或通过开具的二维码账单支付。'],
      ],
    },
    contacts: {
      intro: 'SANPACK 销售办公室与成品仓库位于塔什干',
      salesTitle: '销售部联系方式',
      sales: 'B2B 销售部',
      email: '电子邮箱',
      addressLabel: '仓库与办公室地址',
      address: '乌兹别克斯坦共和国塔什干市谢尔盖利区扬吉谢尔盖利街 14A',
      hoursLabel: '营业时间',
      hours: '周一至周六：09:00–18:00；周日休息。',
      callback: '申请回电',
      mapTitle: '前往 SANPACK 仓库的路线',
      landmark: '附近地标：谢尔盖利汽车市场，扬吉谢尔盖利街。',
    },
    clients: {
      intro: '乌兹别克斯坦领先的餐饮集团、酒店和生产企业信赖 SANPACK',
      reviewsTitle: 'B2B 合作伙伴评价',
      reviews: [
        ['Caravan Group 餐饮集团', 'Alisher Karimov，采购总监', '我们与 SANPACK 合作已超过两年。产品质量稳定，塔什干市内配送始终准时。'],
        ['Bon! 烘焙坊', 'Madina Saidova，生产负责人', '我们订购定制包装袋和烘焙纸。印刷清晰、色彩鲜明，生产速度也很快。'],
        ['Lotte City Hotel', 'Farkhod Tursunov，HoReCa 经理', 'B2B 服务非常专业：可提供样品、文件办理迅速，客户经理也很细致。'],
      ],
    },
    favorites: {
      intro: '保存常用商品，便于快速加入询价单',
      clear: '清空收藏',
      emptyTitle: '收藏夹暂无商品',
      emptyText: '点击目录商品上的心形图标，即可将商品保存到这里。',
    },
    search: {
      title: '搜索结果',
      emptyTitle: '未找到相关商品',
      emptyText: '请检查商品编号或名称，也可以联系 SANPACK 经理协助选品。',
      loading: '正在加载结果…',
    },
    privacy: {
      title: 'SANPACK 隐私政策',
      intro: '本政策适用于您使用本网站时 SANPACK 获取的信息。',
      sections: [
        ['1. 个人数据处理', '我们仅收集制作报价、开具文件和配送订单所必需的信息。'],
        ['2. 信息安全', '除乌兹别克斯坦共和国法律规定的情形外，SANPACK 不会向第三方披露个人数据。'],
      ],
    },
    terms: {
      title: 'SANPACK 使用条款',
      intro: '提交询价即表示用户同意 B2B 服务规则和商业供货条件。',
      sections: [
        ['1. 价格与折扣', '网站价格仅供参考。最终价格和批量折扣由经理在制作账单时确认。'],
        ['2. 商品发货', '付款条件和配送地址确认后安排发货。'],
      ],
    },
  },
} as const satisfies Record<Language, Record<string, unknown>>;
