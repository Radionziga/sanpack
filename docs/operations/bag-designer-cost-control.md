# Bag designer cost control

The public generation endpoint uses the shared Firestore transaction limiter in `lib/security/distributedRateLimit.ts`. The bucket is common to all App Hosting instances, stores a SHA-256 client fingerprint rather than the raw IP, and expires through the `rateLimits.expiresAt` TTL policy described in `docs/PRODUCTION_OPERATIONS.md`.

Generation requests use a client idempotency key and reserve one Firestore draft before Gemini runs. A retry with the same payload reuses the same document and completed assets. Drafts move through `processing`, `failed`, and `ready`; submission atomically changes `draft` to `new`. Submitted records are never selected by the cleanup dry-run.

## Selected distributed rate limit

Firestore counters with expiry buckets were selected because they reuse the existing Firebase operational boundary and provide atomic, cross-instance enforcement without another credentialed service. The trade-off is one transactional Firestore operation per checked request and an operational TTL prerequisite.

Hosting/WAF throttling can still be added as an outer production layer if traffic or abuse patterns justify it; it is not required for correctness of the application limiter.

## Cleanup scheduling options

The command below is read-only and reports drafts older than 24 hours. It never deletes Firestore documents or Storage objects:

```sh
npm run bag-designer:cleanup:dry-run
```

A future cleanup must delete only expired `draft` records and their recorded `assetPaths`; it must re-check status immediately before deletion so submitted assets remain intact.

Possible schedulers are Cloud Scheduler calling an authenticated cleanup endpoint, a scheduled Firebase/Google function, or a manual operator workflow. None is configured until ownership, authentication, schedule, and retention are approved.
