import { describe, expect, it, vi, afterEach } from 'vitest';
import { ebirdGet, EbirdApiError } from '../ebird/client.js';

describe('ebirdGet', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.EBIRD_API_TOKEN;
  });

  it('sends X-eBirdApiToken header', async () => {
    process.env.EBIRD_API_TOKEN = 'test-key';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ taxonCode: 'amerob', scientificName: 'Turdus migratorius' }],
    });
    vi.stubGlobal('fetch', fetchMock);

    await ebirdGet('/ref/taxonomy/ebird', { fmt: 'json' });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({ 'X-eBirdApiToken': 'test-key' });
  });

  it('throws EbirdApiError on HTTP failure', async () => {
    process.env.EBIRD_API_TOKEN = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => 'Forbidden' }),
    );

    await expect(ebirdGet('/data/obs/US/recent')).rejects.toBeInstanceOf(EbirdApiError);
  });
});
