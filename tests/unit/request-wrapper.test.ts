import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeRequest } from '../../src/request-wrapper';
import { MemoryAdapter } from '../../src/storage/memory-adapter';
import { DeduplicationEngine } from '../../src/dedup';
import { TypedEventEmitter } from '../../src/event-emitter';
import { createLogger } from '../../src/utils/logger';
import type { ResolvedClientConfig } from '../../src/types';

describe('executeRequest', () => {
  let storage: MemoryAdapter;
  let dedup: DeduplicationEngine;
  let emitter: TypedEventEmitter;
  let config: ResolvedClientConfig;
  const logger = createLogger(false);
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    storage = new MemoryAdapter();
    dedup = new DeduplicationEngine(storage);
    emitter = new TypedEventEmitter();
    config = {
      storage: 'indexeddb',
      retryLimit: 5,
      baseDelay: 1000,
      autoSync: true,
      debug: false,
    };
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns response on successful fetch', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    mockFetch.mockResolvedValue(mockResponse);

    const result = await executeRequest(
      { url: '/api/test' },
      storage,
      dedup,
      emitter,
      config,
      logger,
    );

    expect(result).toBe(mockResponse);
    expect(await storage.count()).toBe(0);
  });

  it('returns 4xx response without queuing', async () => {
    const mockResponse = new Response('not found', { status: 404 });
    mockFetch.mockResolvedValue(mockResponse);

    const result = await executeRequest(
      { url: '/api/test' },
      storage,
      dedup,
      emitter,
      config,
      logger,
    );

    expect(result.status).toBe(404);
    expect(await storage.count()).toBe(0);
  });

  it('returns 5xx response without queuing', async () => {
    const mockResponse = new Response('server error', { status: 500 });
    mockFetch.mockResolvedValue(mockResponse);

    const result = await executeRequest(
      { url: '/api/test' },
      storage,
      dedup,
      emitter,
      config,
      logger,
    );

    expect(result.status).toBe(500);
    expect(await storage.count()).toBe(0);
  });

  it('queues request on network error and re-throws', async () => {
    const networkError = new TypeError('Failed to fetch');
    mockFetch.mockRejectedValue(networkError);

    await expect(
      executeRequest(
        { url: '/api/test', method: 'POST', body: { key: 'value' } },
        storage,
        dedup,
        emitter,
        config,
        logger,
      ),
    ).rejects.toThrow('Failed to fetch');

    expect(await storage.count()).toBe(1);
    const all = await storage.getAll();
    expect(all[0].url).toBe('/api/test');
    expect(all[0].method).toBe('POST');
  });

  it('does not queue when retry is false', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      executeRequest(
        { url: '/api/test', retry: false },
        storage,
        dedup,
        emitter,
        config,
        logger,
      ),
    ).rejects.toThrow('Failed to fetch');

    expect(await storage.count()).toBe(0);
  });

  it('emits queued event on queue', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
    const handler = vi.fn();
    emitter.on('queued', handler);

    await executeRequest(
      { url: '/api/test', method: 'POST' },
      storage,
      dedup,
      emitter,
      config,
      logger,
    ).catch(() => {});

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].request.url).toBe('/api/test');
  });

  it('does not queue duplicate requests', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    // First request
    await executeRequest(
      { url: '/api/test', method: 'POST', body: 'same' },
      storage,
      dedup,
      emitter,
      config,
      logger,
    ).catch(() => {});

    // Second identical request
    await executeRequest(
      { url: '/api/test', method: 'POST', body: 'same' },
      storage,
      dedup,
      emitter,
      config,
      logger,
    ).catch(() => {});

    expect(await storage.count()).toBe(1);
  });

  it('stores idempotency key in queued request', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await executeRequest(
      { url: '/api/test', method: 'POST', idempotencyKey: 'idem-123' },
      storage,
      dedup,
      emitter,
      config,
      logger,
    ).catch(() => {});

    const all = await storage.getAll();
    expect(all[0].idempotencyKey).toBe('idem-123');
  });
});
