# SANPACK commerce platform

Reusable single-store commerce foundation currently branded for SANPACK. It
supports a configurable catalog, variants and attributes, request-based
checkout, internal order management, Telegram notifications and non-fiscal PDF
documents.

## Local development

Requirements: Node.js 22 and npm.

1. Copy `.env.example` to `.env.local` and fill the Firebase web app values.
2. Install dependencies with `npm install`.
3. Start the application with `npm run dev`.
4. Open `http://localhost:3000`.

The storefront is available at `/ru`. The route structure remains ready for
additional locales, but the first production version uses Russian only.

## Firebase

The repository targets one Firebase project: `stamply-4df8a`.

- Enable Email/Password and Anonymous providers in Firebase Authentication.
- Create administrator accounts manually in Firebase Authentication. Public
  registration is intentionally unavailable.
- Anonymous Authentication gives each buyer a private same-browser order
  history. A phone number is contact data, not proof of identity.
- Deploy Firestore rules with `npm exec firebase deploy -- --only firestore:rules`.

For local server operations, Application Default Credentials or
`FIREBASE_SERVICE_ACCOUNT_JSON` are required. Never commit a service-account
key. Firebase App Hosting supplies server credentials automatically.

## Orders and documents

- Checkout requests only a name and Uzbekistan phone number.
- Product names and prices are rebuilt on the server from Firestore; client
  totals are never trusted.
- The original order snapshot is immutable. Admin corrections create a new
  revision and audit entry.
- Buyer history deliberately does not expose internal order statuses.
- `/admin/document-settings` configures the internal, non-fiscal PDF document.

## Telegram

Open `/admin/integrations` to configure separate bots for notifications and the
Telegram Mini App. Notification delivery requires a bot token and destination
chat ID. The storefront bot requires a public HTTPS App Hosting URL; after
saving it, use the action that configures the bot menu button.

Bot tokens are encrypted before Firestore storage. Production must provide a
strong `TELEGRAM_CONFIG_ENCRYPTION_KEY` through the App Hosting secret named
`sanpack-telegram-config-encryption-key`. Telegram Mini App identity is verified
server-side, but Telegram does not provide the user's phone number automatically.

## Production deployment

The application is configured for Firebase App Hosting through
`apphosting.yaml`; the old static Hosting rewrite has been removed. Connect
this repository to an App Hosting backend, create the secrets referenced by
`apphosting.yaml`, and deploy a saved version from the Firebase console or CLI.

Useful checks:

```bash
npm run lint
npm run typecheck
npm run build
```
