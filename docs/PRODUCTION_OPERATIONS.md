# SANPACK — production operations

## Health и наблюдаемость

- `GET /api/health` возвращает только состояние сервиса, revision и время; секреты и состояние клиентов не раскрываются.
- Серверные ошибки критических воронок пишутся как однострочный JSON с `severity`, `event`, `timestamp` и безопасным типом ошибки. Эти события автоматически доступны в Cloud Logging App Hosting.
- Для uptime monitor использовать `/api/health`; alert: 3 последовательных ошибки или p95 ответа выше 2 секунд в течение 5 минут.
- Отдельные alerts: рост `bag_designer.operation_failed`, `order.creation_failed`, `order.notification_failed`, а также дневные расходы Gemini.

## Распределённый rate limit

Публичные мутации и создание сессий используют коллекцию `rateLimits`. В документах хранится только SHA-256 отпечаток клиента внутри ID документа; сырой IP не сохраняется. Окно и счётчик обновляются транзакцией Firestore, поэтому лимит общий для всех экземпляров App Hosting.

В Firebase Console нужно один раз включить TTL policy для поля `expiresAt` коллекции `rateLimits`. TTL отвечает только за уборку старых buckets и не влияет на корректность лимита.

## Release gate

1. `npm ci`
2. `npm ls --depth=0`
3. `npm test`
4. `npm run typecheck`
5. `npm run lint`
6. `npm run build`
7. `npm run test:e2e`
8. `git diff --check`

GitHub Actions выполняет тот же quality gate и отдельный Chromium desktop/mobile + axe smoke. E2E работает с `SANPACK_USE_SEED_DATA=true` и не пишет в Firebase, Storage, Telegram или Gemini.

## Осознанно отложено

- Публичные Firestore rules для draft/inactive данных должны быть закрыты отдельной миграцией публичной проекции и emulator-тестами.
- Production alerts, Firestore TTL и HTTPS security headers проверяются после подключения реального App Hosting environment.
- Backup/export Firestore и rollback rehearsal выполняются перед первым production rollout.
