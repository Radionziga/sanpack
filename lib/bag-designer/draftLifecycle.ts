export const BAG_GENERATION_PROCESSING_TIMEOUT_MS = 2 * 60 * 1000;
export const BAG_DRAFT_RETENTION_MS = 24 * 60 * 60 * 1000;

export interface ExistingBagGeneration {
  requestTokenHash?: unknown;
  payloadHash?: unknown;
  generationState?: unknown;
  generationStartedAt?: unknown;
  aiMockupUrl?: unknown;
}

export type BagGenerationDecision = 'create' | 'reuse' | 'retry' | 'busy' | 'conflict';

export function decideBagGeneration({
  existing,
  requestTokenHash,
  payloadHash,
  now,
}: {
  existing: ExistingBagGeneration | null;
  requestTokenHash: string;
  payloadHash: string;
  now: number;
}): BagGenerationDecision {
  if (!existing) return 'create';
  if (existing.requestTokenHash !== requestTokenHash || existing.payloadHash !== payloadHash) {
    return 'conflict';
  }
  if (typeof existing.aiMockupUrl === 'string' && existing.aiMockupUrl) return 'reuse';

  const startedAt = typeof existing.generationStartedAt === 'string'
    ? Date.parse(existing.generationStartedAt)
    : Number.NaN;
  if (
    existing.generationState === 'processing'
    && Number.isFinite(startedAt)
    && now - startedAt < BAG_GENERATION_PROCESSING_TIMEOUT_MS
  ) {
    return 'busy';
  }
  return 'retry';
}

export function isStaleBagDraft({
  status,
  createdAt,
}: {
  status?: unknown;
  createdAt?: unknown;
}, now: number): boolean {
  if (status !== 'draft' || typeof createdAt !== 'string') return false;
  const created = Date.parse(createdAt);
  return Number.isFinite(created) && now - created >= BAG_DRAFT_RETENTION_MS;
}
