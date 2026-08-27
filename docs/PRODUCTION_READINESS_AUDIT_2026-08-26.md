# SANPACK — аудит готовности к production

Дата аудита: 26 августа 2026 года  
Актуализация после исправлений: 27 августа 2026 года  
Проект: `/Users/milana/Desktop/Sanpack/SANPACK`  
Checkpoint перед работой: `3dc5774` (`checkpoint: storefront redesign and Chinese localization`)

## Зафиксированная модель доступа

Firebase Auth в проекте является отдельным административным контуром. Саморегистрации администраторов нет: учётные записи создаются владельцем в Firebase Console. Каждый пользователь этого закрытого Firebase Auth-контура с валидным token и email намеренно получает `super_admin`. Покупатели не входят через Firebase Auth: их идентичность и сессии связаны с Telegram и коллекцией customers.

Поэтому прежняя рекомендация об обязательном `admins/{uid}` allowlist и capability matrix отменена решением владельца продукта. Граница безопасности — контроль создания Firebase Auth users, сильные пароли/MFA и отзыв учётной записи. Если появятся младшие роли, capability-based RBAC нужно ввести до их создания.

## Исправлено в текущем release candidate

- Административная авторизация приведена к описанной модели и покрыта тестами.
- Десктопный коммерческий блок товара уплотнён; мобильные touch-контролы сохранены.
- 404 очищена от рамки и декора, композиция центрирована, `lang` восстанавливается и на error document.
- RU/UZ/EN/ZH подключены к product/category metadata, JSON-LD, canonical, hreflang и `x-default`; robots разрешает `/zh/`.
- Sitemap строится из опубликованного repository с seed fallback, реальными `updatedAt` и language alternates.
- Язык PDF-каталога синхронизируется с URL, поэтому кнопка «Связаться» следует выбранному языку.
- Bag Designer получил единый storefront design code, четыре локали, визуальные карточки формы, живой цвет технического макета и исправленный цикл заявки.
- Контакт и спецификация сохраняются до вызова Gemini; failed draft остаётся видимым администратору. Лид не теряется при сбое генерации.
- Gemini request и обработка ошибок покрыты unit-тестами; секреты остаются server-only.
- Глобальная сериализация полного каталога удалена из layout. Поиск загружает данные лениво, главная получает только товары видимых полок и счётчики категорий.
- Тяжёлые category/promo PNG получили WebP runtime-варианты с quality 90; исходники сохранены. Необязательные шрифты больше не preload’ятся глобально.
- Публичные мутации, Bag Designer, Telegram/admin sessions защищены общим Firestore transaction rate limit; сырой IP не хранится.
- Добавлены `/api/health`, структурированные JSON events и production operations runbook.
- Добавлены GitHub Actions, unit/type/lint/build gate, Playwright desktop/mobile и axe regression.
- Выполнен обоснованный повторный `npm ci`; затем добавлены только Playwright и axe через npm. Yarn, pnpm и Bun не использовались.

## Проверки

- Node.js `v24.9.0`, npm `11.6.0`, Next.js `16.3.0`.
- До реализации: 20 файлов / 132 Vitest tests, typecheck, lint и build — успешно.
- После ключевых изменений: targeted auth, Gemini и distributed limiter tests — успешно; typecheck и lint — успешно.
- Browser smoke подтвердил четыре локали Bag Designer, Chinese product SEO/JSON-LD, PDF locale switching и 404.
- Первый browser-прогон выявил strict locator и отсутствие `lang` на Next error document. Обе причины исправлены. Финальный Playwright desktop/mobile + axe baseline: 16/16 успешно.
- Финальный Vitest baseline: 22 файла / 134 теста; typecheck, lint и production build — успешно.
- `npm audit`: 13 issues (11 moderate, 2 high), без automatic fix.

## Оставшиеся release prerequisites

### Отложено владельцем продукта

Публичные Firestore rules пока могут раскрывать draft/inactive документы. Это не маскируется как исправленное. Нужна отдельная миграция на public projection либо статусные queries/rules и Firebase Emulator Suite tests.

### Требует production environment

- Включить Firestore TTL для `rateLimits.expiresAt`.
- Настроить uptime monitor `/api/health`, Cloud Logging alerts и Gemini cost alert.
- Проверить HSTS/CSP/headers на реальном HTTPS edge.
- Выполнить Firestore backup/export и rollback rehearsal.
- Проверить Application Default Credentials для будущих production Admin SDK задач.

### Контент

Runtime и SEO поддерживают китайский язык, но live Firestore должен оставаться источником истины: отсутствующие `titleZh`/описания категорий, атрибутов и товаров заполняются существующим AI-действием в админке с review. Значения не придумываются при каждом чтении.

## Release checklist

- [x] Firebase Auth отделён от customer Telegram identity.
- [x] Все существующие Firebase admins намеренно `super_admin`; self-registration отсутствует.
- [x] RU/UZ/EN/ZH metadata, JSON-LD, hreflang, robots и sitemap.
- [x] Bag Designer сохраняет лид до генерации и показывает drafts в админке.
- [x] Runtime WebP, font preload и catalog payload оптимизированы.
- [x] Distributed rate limit, health endpoint и structured events добавлены.
- [x] CI, Playwright и axe test code добавлены.
- [x] Полный финальный test/typecheck/lint/build/E2E baseline зелёный.
- [ ] Firestore public draft policy закрыта отдельной миграцией (осознанно отложено).
- [ ] Production TTL/alerts/backup/rollback настроены в облачном окружении.

До выполнения production-only пунктов допустим release candidate/staging, но не необратимый production rollout.
