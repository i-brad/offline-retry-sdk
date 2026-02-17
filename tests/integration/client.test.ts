import { describe, it, expect, vi, afterEach } from 'vitest';
import { createOfflineClient } from '../../src/client';
import type { OfflineClient } from '../../src/types';

describe('createOfflineClient', () => {
  let client: OfflineClient;

  afterEach(() => {
    client?.destroy();
    vi.restoreAllMocks();
  });

  it('returns an object with all expected methods', () => {
    client = createOfflineClient();

    expect(typeof client.request).toBe('function');
    expect(typeof client.flush).toBe('function');
    expect(typeof client.pause).toBe('function');
    expect(typeof client.resume).toBe('function');
    expect(typeof client.getQueueSize).toBe('function');
    expect(typeof client.clearQueue).toBe('function');
    expect(typeof client.on).toBe('function');
    expect(typeof client.destroy).toBe('function');
  });

  it('applies default config values', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', mockFetch);

    client = createOfflineClient();

    const response = await client.request({ url: '/api/test' });
    expect(response).toBeInstanceOf(Response);

    expect(mockFetch).toHaveBeenCalledWith('/api/test', {
      method: 'GET',
      headers: undefined,
      body: undefined,
    });
  });

  it('getQueueSize returns 0 initially', async () => {
    client = createOfflineClient();
    expect(await client.getQueueSize()).toBe(0);
  });

  it('clearQueue empties the queue', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new TypeError('offline'));
    vi.stubGlobal('fetch', mockFetch);

    client = createOfflineClient({ autoSync: false });
    await client.request({ url: '/api/test', method: 'POST' }).catch(() => {});

    expect(await client.getQueueSize()).toBe(1);
    await client.clearQueue();
    expect(await client.getQueueSize()).toBe(0);
  });
});
