# SANPACK website

Multilingual B2B catalog for SANPACK: packaging, consumables, food products
and print services for HoReCa businesses in Uzbekistan.

## Local development

Requirements: Node.js 22 and npm.

1. Copy `.env.example` to `.env.local` and fill the Firebase web app values.
2. Install dependencies with `npm install`.
3. Start the application with `npm run dev`.
4. Open `http://localhost:3000`.

The root route is the temporary launch screen. The catalog is available at
`/ru`, `/uz` and `/en` while it is being prepared.

## Firebase

The repository targets one Firebase project: `stamply-4df8a`.

- Enable Email/Password in Firebase Authentication.
- Create an Authentication user for every administrator.
- Add `admins/{uid}` in Firestore with `active: true`, `name` and a role:
  `super_admin`, `content_manager`, `sales_manager` or `viewer`.
- Deploy Firestore rules with `npm exec firebase deploy -- --only firestore:rules`.

For local server operations, Application Default Credentials or
`FIREBASE_SERVICE_ACCOUNT_JSON` are required. Never commit a service-account
key. Firebase App Hosting supplies server credentials automatically.

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
