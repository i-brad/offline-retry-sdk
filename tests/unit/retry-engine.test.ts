import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RetryEngine } from '../../src/retry-engine';
import { MemoryAdapter } from '../../src/storage/memory-adapter';
import { TypedEventEmitter } from '../../src/event-emitter';
import { createLogger } from '../../src/utils/logger';
import type { StoredRequest } from '../../src/types';

function makeRequest(overrides: Partial<StoredRequest> = {}): StoredRequest {
  return {
    id: `id-${Math.random()}`,
    url: '/api/test',
    method: 'POST',
    createdAt: Date.now(),
    retries: 0,
    maxRetries: 5,
    hash: `hash-${Math.random()}`,
    ...overrides,
  };
}

describe('RetryEngine', () => {
  let storage: MemoryAdapter;
  let emitter: TypedEventEmitter;
  let engine: RetryEngine;
  let mockFetch: ReturnType<typeof vi.fn>;
  const logger = createLogger(false);

  beforeEach(() => {
    storage = new MemoryAdapter();
    emitter = new TypedEventEmitter();
    engine = new RetryEngine(storage, emitter, { baseDelay: 100 }, logger);
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('processes queue in FIFO order', async () => {
    const r1 = makeRequest({ id: 'r1', url: '/api/first', createdAt: 100 });
    const r2 = makeRequest({ id: 'r2', url: '/api/second', createdAt: 200 });
    await storage.add(r1);
    await storage.add(r2);

    mockFetch.mockResolvedValue(new Response('ok'));

    await engine.flush();

    expect(mockFetch.mock.calls[0][0]).toBe('/api/first');
    expect(mockFetch.mock.calls[1][0]).toBe('/api/second');
  });

  it('removes request from storage on success and emits success', async () => {
    const req = makeRequest({ id: 'r1' });
    await storage.add(req);

    const successHandler = vi.fn();
    emitter.on('success', successHandler);

    mockFetch.mockResolvedValue(new Response('ok'));
    await engine.flush();

    expect(await storage.count()).toBe(0);
    expect(successHandler).toHaveBeenCalledOnce();
  });

  it('increments retry count on failure', async () => {
    const req = makeRequest({ id: 'r1', retries: 0 });
    await storage.add(req);

    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    const flushPromise = engine.flush();
    // Advance past the backoff delay
    await vi.advanceTimersByTimeAsync(10_000);
    await flushPromise;

    const updated = await storage.getById('r1');
    expect(updated?.retries).toBe(1);
  });

  it('removes request and emits failure when maxRetries exceeded', async () => {
    const req = makeRequest({ id: 'r1', retries: 4, maxRetries: 5 });
    await storage.add(req);

    const failureHandler = vi.fn();
    emitter.on('failure', failureHandler);

    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await engine.flush();

    expect(await storage.count()).toBe(0);
    expect(failureHandler).toHaveBeenCalledOnce();
  });

  it('emits flushStart and flushComplete events', async () => {
    const req = makeRequest();
    await storage.add(req);

    const flushStart = vi.fn();
    const flushComplete = vi.fn();
    emitter.on('flushStart', flushStart);
    emitter.on('flushComplete', flushComplete);

    mockFetch.mockResolvedValue(new Response('ok'));
    await engine.flush();

    expect(flushStart).toHaveBeenCalledWith({ queueSize: 1 });
    expect(flushComplete).toHaveBeenCalledWith({ processed: 1, failed: 0 });
  });

  it('emits retry event before each retry attempt', async () => {
    const req = makeRequest({ id: 'r1', retries: 2 });
    await storage.add(req);

    const retryHandler = vi.fn();
    emitter.on('retry', retryHandler);

    mockFetch.mockResolvedValue(new Response('ok'));
    await engine.flush();

    expect(retryHandler).toHaveBeenCalledOnce();
    expect(retryHandler.mock.calls[0][0].attempt).toBe(3);
  });

  it('forwards idempotency key in retry headers', async () => {
    const req = makeRequest({ idempotencyKey: 'key-123' });
    await storage.add(req);

    mockFetch.mockResolvedValue(new Response('ok'));
    await engine.flush();

    const fetchHeaders = mockFetch.mock.calls[0][1].headers;
    expect(fetchHeaders['Idempotency-Key']).toBe('key-123');
  });

  it('applies exponential backoff on failure', async () => {
    const req = makeRequest({ id: 'r1', retries: 0, maxRetries: 3 });
    await storage.add(req);

    mockFetch.mockRejectedValue(new TypeError('network error'));

    const flushPromise = engine.flush();
    // backoff = 100 * 2^1 = 200ms
    await vi.advanceTimersByTimeAsync(200);
    await flushPromise;

    const updated = await storage.getById('r1');
    expect(updated?.retries).toBe(1);
  });

  it('pause stops processing mid-flush', async () => {
    const r1 = makeRequest({ id: 'r1', createdAt: 100 });
    const r2 = makeRequest({ id: 'r2', createdAt: 200 });
    await storage.add(r1);
    await storage.add(r2);

    let callCount = 0;
    mockFetch.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        engine.pause();
      }
      return new Response('ok');
    });

    await engine.flush();

    // Only first request processed before pause
    expect(mockFetch).toHaveBeenCalledOnce();
    // r2 should still be in storage
    expect(await storage.count()).toBe(1);
  });

  it('continues with next request if one retry crashes', async () => {
    const r1 = makeRequest({
      id: 'r1',
      url: '/api/crash',
      createdAt: 100,
      retries: 4,
      maxRetries: 5,
    });
    const r2 = makeRequest({ id: 'r2', url: '/api/ok', createdAt: 200 });
    await storage.add(r1);
    await storage.add(r2);

    mockFetch
      .mockRejectedValueOnce(new TypeError('network error'))
      .mockResolvedValueOnce(new Response('ok'));

    await engine.flush();

    // r1 hit max retries and was removed, r2 succeeded
    expect(await storage.count()).toBe(0);
  });

  it('prevents concurrent flush calls', async () => {
    const req = makeRequest();
    await storage.add(req);

    mockFetch.mockResolvedValue(new Response('ok'));

    const p1 = engine.flush();
    const p2 = engine.flush(); // Should be a no-op
    await p1;
    await p2;

    // fetch only called once (from first flush)
    expect(mockFetch).toHaveBeenCalledOnce();
  });
});
