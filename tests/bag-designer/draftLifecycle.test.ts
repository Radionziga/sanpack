import { describe, expect, it } from 'vitest';
import {
  BAG_GENERATION_PROCESSING_TIMEOUT_MS,
  decideBagGeneration,
  isStaleBagDraft,
} from '@/lib/bag-designer/draftLifecycle';

const now = Date.parse('2026-08-22T12:00:00.000Z');
const identity = { requestTokenHash: 'token', payloadHash: 'payload' };

describe('bag designer draft lifecycle', () => {
  it.each([
    { existing: null, expected: 'create' },
    { existing: { ...identity, aiMockupUrl: 'https://example.test/mockup.png' }, expected: 'reuse' },
    { existing: { ...identity, generationState: 'failed' }, expected: 'retry' },
    {
      existing: {
        ...identity,
        generationState: 'processing',
        generationStartedAt: new Date(now - BAG_GENERATION_PROCESSING_TIMEOUT_MS + 1).toISOString(),
      },
      expected: 'busy',
    },
    { existing: { requestTokenHash: 'other', payloadHash: 'payload' }, expected: 'conflict' },
  ])('returns $expected for the generation state', ({ existing, expected }) => {
    expect(decideBagGeneration({ existing, ...identity, now })).toBe(expected);
  });

  it('selects only expired drafts for future cleanup', () => {
    expect(isStaleBagDraft({
      status: 'draft',
      createdAt: '2026-08-21T11:59:59.000Z',
    }, now)).toBe(true);
    expect(isStaleBagDraft({
      status: 'new',
      createdAt: '2026-08-20T00:00:00.000Z',
    }, now)).toBe(false);
    expect(isStaleBagDraft({
      status: 'draft',
      createdAt: '2026-08-22T11:30:00.000Z',
    }, now)).toBe(false);
  });
});
