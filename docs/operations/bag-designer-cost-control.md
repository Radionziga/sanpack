# Bag designer cost control

The public generation endpoint currently has a process-local IP limiter. It reduces accidental bursts on one server instance, but it is not distributed protection and can reset or be bypassed when traffic reaches another instance.

Generation requests use a client idempotency key and reserve one Firestore draft before Gemini runs. A retry with the same payload reuses the same document and completed assets. Drafts move through `processing`, `failed`, and `ready`; submission atomically changes `draft` to `new`. Submitted records are never selected by the cleanup dry-run.

## Distributed rate-limit options

| Option | Strength | Trade-off |
| --- | --- | --- |
| Firestore counters with expiry buckets | Uses existing Google/Firebase infrastructure and needs no new vendor | Adds reads/writes per anonymous request and needs careful contention handling |
| Managed Redis-compatible limiter | Atomic increments and TTLs are a natural fit for rate limiting | Adds a service, credentials, billing, and regional configuration |
| Hosting/WAF rate limiting | Rejects abuse before Next.js, Gemini, or Storage code runs | Rules are infrastructure-specific and generally have less product context |

No distributed option is selected yet. The choice should consider expected traffic, acceptable per-request cost, and who will operate the service.

## Cleanup scheduling options

The command below is read-only and reports drafts older than 24 hours. It never deletes Firestore documents or Storage objects:

```sh
npm run bag-designer:cleanup:dry-run
```

A future cleanup must delete only expired `draft` records and their recorded `assetPaths`; it must re-check status immediately before deletion so submitted assets remain intact.

Possible schedulers are Cloud Scheduler calling an authenticated cleanup endpoint, a scheduled Firebase/Google function, or a manual operator workflow. None is configured until ownership, authentication, schedule, and retention are approved.
