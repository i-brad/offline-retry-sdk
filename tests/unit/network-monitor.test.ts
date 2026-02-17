import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NetworkMonitor } from '../../src/network-monitor';

describe('NetworkMonitor', () => {
  let onOnline: ReturnType<typeof vi.fn>;
  let onOffline: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onOnline = vi.fn();
    onOffline = vi.fn();
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  it('reports correct initial online state', () => {
    const monitor = new NetworkMonitor({ onOnline, onOffline });
    expect(monitor.isOnline).toBe(true);
  });

  it('reports initial offline state', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });
    const monitor = new NetworkMonitor({ onOnline, onOffline });
    expect(monitor.isOnline).toBe(false);
  });

  it('fires onOnline callback when online event dispatched', () => {
    const monitor = new NetworkMonitor({ onOnline, onOffline });
    monitor.start();

    window.dispatchEvent(new Event('online'));

    expect(onOnline).toHaveBeenCalledOnce();
    monitor.destroy();
  });

  it('fires onOffline callback when offline event dispatched', () => {
    const monitor = new NetworkMonitor({ onOnline, onOffline });
    monitor.start();

    window.dispatchEvent(new Event('offline'));

    expect(onOffline).toHaveBeenCalledOnce();
    monitor.destroy();
  });

  it('updates isOnline state on events', () => {
    const monitor = new NetworkMonitor({ onOnline, onOffline });
    monitor.start();

    window.dispatchEvent(new Event('offline'));
    expect(monitor.isOnline).toBe(false);

    window.dispatchEvent(new Event('online'));
    expect(monitor.isOnline).toBe(true);

    monitor.destroy();
  });

  it('stop removes event listeners', () => {
    const monitor = new NetworkMonitor({ onOnline, onOffline });
    monitor.start();
    monitor.stop();

    window.dispatchEvent(new Event('online'));
    window.dispatchEvent(new Event('offline'));

    expect(onOnline).not.toHaveBeenCalled();
    expect(onOffline).not.toHaveBeenCalled();
  });
});
