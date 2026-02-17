import { vi } from 'vitest';
import type { TypedEventEmitter } from '../src/event-emitter';
import type { EventName } from '../src/types';

export function createMockFetch() {
  const mockFetch = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', mockFetch);
  return mockFetch;
}

export function simulateOffline() {
  Object.defineProperty(navigator, 'onLine', {
    value: false,
    writable: true,
    configurable: true,
  });
  window.dispatchEvent(new Event('offline'));
}

export function simulateOnline() {
  Object.defineProperty(navigator, 'onLine', {
    value: true,
    writable: true,
    configurable: true,
  });
  window.dispatchEvent(new Event('online'));
}

export function waitForEvent(
  emitter: TypedEventEmitter,
  event: EventName,
  timeoutMs = 5000,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for event: ${event}`)),
      timeoutMs,
    );
    emitter.on(event, (data: unknown) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}
