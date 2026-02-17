import { describe, it, expect, vi } from 'vitest';
import { TypedEventEmitter } from '../../src/event-emitter';
import type { StoredRequest } from '../../src/types';

function makeStoredRequest(overrides: Partial<StoredRequest> = {}): StoredRequest {
  return {
    id: 'test-id',
    url: '/api/test',
    method: 'POST',
    createdAt: Date.now(),
    retries: 0,
    maxRetries: 5,
    hash: 'abc123',
    ...overrides,
  };
}

describe('TypedEventEmitter', () => {
  it('calls handler when event is emitted', () => {
    const emitter = new TypedEventEmitter();
    const handler = vi.fn();
    emitter.on('queued', handler);

    const request = makeStoredRequest();
    emitter.emit('queued', { request });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ request });
  });

  it('supports multiple listeners for the same event', () => {
    const emitter = new TypedEventEmitter();
    const h1 = vi.fn();
    const h2 = vi.fn();
    emitter.on('queued', h1);
    emitter.on('queued', h2);

    emitter.emit('queued', { request: makeStoredRequest() });

    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('unsubscribe function removes the handler', () => {
    const emitter = new TypedEventEmitter();
    const handler = vi.fn();
    const unsub = emitter.on('queued', handler);

    unsub();
    emitter.emit('queued', { request: makeStoredRequest() });

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not throw when emitting with no listeners', () => {
    const emitter = new TypedEventEmitter();
    expect(() => {
      emitter.emit('queued', { request: makeStoredRequest() });
    }).not.toThrow();
  });

  it('handler errors do not propagate to other handlers', () => {
    const emitter = new TypedEventEmitter();
    const h1 = vi.fn(() => {
      throw new Error('boom');
    });
    const h2 = vi.fn();

    emitter.on('queued', h1);
    emitter.on('queued', h2);

    emitter.emit('queued', { request: makeStoredRequest() });

    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('removeAllListeners clears everything', () => {
    const emitter = new TypedEventEmitter();
    const handler = vi.fn();
    emitter.on('queued', handler);
    emitter.on('retry', vi.fn());

    emitter.removeAllListeners();
    emitter.emit('queued', { request: makeStoredRequest() });

    expect(handler).not.toHaveBeenCalled();
  });

  it('passes correct data for different event types', () => {
    const emitter = new TypedEventEmitter();
    const handler = vi.fn();
    emitter.on('flushStart', handler);

    emitter.emit('flushStart', { queueSize: 42 });

    expect(handler).toHaveBeenCalledWith({ queueSize: 42 });
  });
});
