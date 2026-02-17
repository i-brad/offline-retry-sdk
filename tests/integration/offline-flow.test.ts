import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createOfflineClient } from '../../src/client';
import { IndexedDBAdapter } from '../../src/storage/indexeddb-adapter';
import type { OfflineClient } from '../../src/types';
import { simulateOnline } from '../helpers';

describe('Offline Flow (end-to-end)', () => {
  let client: OfflineClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Clear IndexedDB between tests to prevent data leakage
    const adapter = new IndexedDBAdapter();
    await adapter.clear();

    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    client?.destroy();
    vi.restoreAllMocks();
  });

  it('succeeds online — returns response, nothing queued', async () => {
    client = createOfflineClient({ autoSync: false });
    mockFetch.mockResolvedValue(new Response('ok', { status: 200 }));

    const response = await client.request({ url: '/api/data' });

    expect(response.status).toBe(200);
    expect(await client.getQueueSize()).toBe(0);
  });

  it('fails offline — queues request, emits queued event, throws error', async () => {
    client = createOfflineClient({ autoSync: false });
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    const queuedHandler = vi.fn();
    client.on('queued', queuedHandler);

    await expect(
      client.request({ url: '/api/data', method: 'POST', body: { x: 1 } }),
    ).rejects.toThrow('Failed to fetch');

    expect(await client.getQueueSize()).toBe(1);
    expect(queuedHandler).toHaveBeenCalledOnce();
  });

  it('auto-flushes on reconnect and emits success', async () => {
    client = createOfflineClient({
      autoSync: true,
      retryLimit: 3,
      baseDelay: 10,
    });

    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await client
      .request({ url: '/api/data', method: 'POST', body: { x: 1 } })
      .catch(() => {});

    expect(await client.getQueueSize()).toBe(1);

    const successHandler = vi.fn();
    client.on('success', successHandler);

    mockFetch.mockResolvedValue(new Response('ok'));

    simulateOnline();

    // Wait for async flush to complete
    await new Promise((r) => setTimeout(r, 200));

    expect(successHandler).toHaveBeenCalledOnce();
    expect(await client.getQueueSize()).toBe(0);
  });

  it(
    'retries and removes after exceeding maxRetries',
    async () => {
      client = createOfflineClient({
        autoSync: false,
        retryLimit: 2,
        baseDelay: 10,
      });

      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      const failureHandler = vi.fn();
      client.on('failure', failureHandler);

      await client
        .request({ url: '/api/data', method: 'POST' })
        .catch(() => {});

      // First flush — retries, fails, increments to retries:1, backoff delay
      await client.flush();

      // Second flush — retries, retries:2 >= maxRetries:2, removes
      await client.flush();

      expect(failureHandler).toHaveBeenCalledOnce();
      expect(await client.getQueueSize()).toBe(0);
    },
    15000,
  );

  it('does not double-queue duplicate requests', async () => {
    client = createOfflineClient({ autoSync: false });
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await client
      .request({ url: '/api/data', method: 'POST', body: 'same' })
      .catch(() => {});
    await client
      .request({ url: '/api/data', method: 'POST', body: 'same' })
      .catch(() => {});

    expect(await client.getQueueSize()).toBe(1);
  });

  it('pause prevents flush from processing', async () => {
    client = createOfflineClient({ autoSync: false });

    mockFetch
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValue(new Response('ok'));

    await client.request({ url: '/api/data', method: 'POST' }).catch(() => {});

    client.pause();
    await client.flush();

    expect(await client.getQueueSize()).toBe(1);
  });

  it('resume allows flush after pause', async () => {
    client = createOfflineClient({ autoSync: false });

    mockFetch
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValue(new Response('ok'));

    await client.request({ url: '/api/data', method: 'POST' }).catch(() => {});

    client.pause();
    await client.flush();
    expect(await client.getQueueSize()).toBe(1);

    client.resume();
    await client.flush();
    expect(await client.getQueueSize()).toBe(0);
  });

  it('preserves FIFO order during flush', async () => {
    client = createOfflineClient({ autoSync: false });
    mockFetch.mockRejectedValue(new TypeError('offline'));

    await client
      .request({ url: '/api/first', method: 'POST', body: 'a' })
      .catch(() => {});

    // Small delay to ensure different createdAt
    await new Promise((r) => setTimeout(r, 10));

    await client
      .request({ url: '/api/second', method: 'POST', body: 'b' })
      .catch(() => {});

    mockFetch.mockReset();
    mockFetch.mockResolvedValue(new Response('ok'));

    await client.flush();

    expect(mockFetch.mock.calls[0][0]).toBe('/api/first');
    expect(mockFetch.mock.calls[1][0]).toBe('/api/second');
  });
});
