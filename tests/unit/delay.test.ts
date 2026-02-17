import { describe, it, expect, vi } from 'vitest';
import { delay } from '../../src/utils/delay';

describe('delay', () => {
  it('resolves after the specified time', async () => {
    vi.useFakeTimers();
    const promise = delay(1000);
    vi.advanceTimersByTime(1000);
    await expect(promise).resolves.toBeUndefined();
    vi.useRealTimers();
  });

  it('returns a promise', () => {
    const result = delay(0);
    expect(result).toBeInstanceOf(Promise);
  });
});
