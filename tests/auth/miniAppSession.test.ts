import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ensureTelegramMiniAppSession,
  getLastTelegramMiniAppSessionFailureReason,
  resetTelegramMiniAppSessionCache,
} from '@/lib/telegram/miniAppSession';

const fetchMock = vi.fn();

beforeEach(() => {
  resetTelegramMiniAppSessionCache();
  vi.stubGlobal('window', { Telegram: { WebApp: { initData: 'signed-a' } } });
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

afterEach(() => vi.unstubAllGlobals());

describe('Mini App customer session bootstrap', () => {
  it('deduplicates only an in-flight request and caches a successful identity briefly', async () => {
    let resolve: ((value: { ok: boolean }) => void) | undefined;
    fetchMock.mockReturnValue(new Promise((done) => { resolve = done; }));
    const first = ensureTelegramMiniAppSession();
    const second = ensureTelegramMiniAppSession();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolve?.({ ok: true });
    await expect(first).resolves.toBe('authenticated');
    await expect(second).resolves.toBe('authenticated');
    await expect(ensureTelegramMiniAppSession()).resolves.toBe('authenticated');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a failed bootstrap and never reuses success for changed initData', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ reason: 'expired' }) }).mockResolvedValue({ ok: true });
    await expect(ensureTelegramMiniAppSession()).resolves.toBe('rejected');
    expect(getLastTelegramMiniAppSessionFailureReason()).toBe('expired');
    await expect(ensureTelegramMiniAppSession()).resolves.toBe('authenticated');
    expect(getLastTelegramMiniAppSessionFailureReason()).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    window.Telegram!.WebApp!.initData = 'signed-b';
    await expect(ensureTelegramMiniAppSession()).resolves.toBe('authenticated');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not let an older in-flight identity replace a newer Mini App account', async () => {
    const resolvers: Array<(value: { ok: boolean }) => void> = [];
    fetchMock.mockImplementation(() => new Promise((resolve) => resolvers.push(resolve)));
    const oldIdentity = ensureTelegramMiniAppSession();
    const oldSignal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    window.Telegram!.WebApp!.initData = 'signed-b';
    const newIdentity = ensureTelegramMiniAppSession();
    expect(oldSignal.aborted).toBe(true);
    resolvers[1]({ ok: true });
    await expect(newIdentity).resolves.toBe('authenticated');
    resolvers[0]({ ok: true });
    await expect(oldIdentity).resolves.toBe('rejected');
    await expect(ensureTelegramMiniAppSession()).resolves.toBe('authenticated');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('distinguishes an ordinary browser from a rejected Mini App proof', async () => {
    window.Telegram!.WebApp!.initData = '';
    await expect(ensureTelegramMiniAppSession()).resolves.toBe('browser');
    expect(fetchMock).not.toHaveBeenCalled();

    window.Telegram!.WebApp!.initData = 'invalid-proof';
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ reason: 'signature_mismatch' }) });
    await expect(ensureTelegramMiniAppSession()).resolves.toBe('rejected');
    expect(getLastTelegramMiniAppSessionFailureReason()).toBe('signature_mismatch');
  });

  it('switches A to B to A without reusing another account cache entry', async () => {
    fetchMock.mockResolvedValue({ ok: true });
    await expect(ensureTelegramMiniAppSession()).resolves.toBe('authenticated');
    window.Telegram!.WebApp!.initData = 'signed-b';
    await expect(ensureTelegramMiniAppSession()).resolves.toBe('authenticated');
    window.Telegram!.WebApp!.initData = 'signed-a';
    await expect(ensureTelegramMiniAppSession()).resolves.toBe('authenticated');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
