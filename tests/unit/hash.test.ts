import { describe, it, expect } from 'vitest';
import { computeHash } from '../../src/utils/hash';

describe('computeHash', () => {
  it('produces the same hash for identical inputs', async () => {
    const h1 = await computeHash('/api/data', 'POST', { key: 'value' });
    const h2 = await computeHash('/api/data', 'POST', { key: 'value' });
    expect(h1).toBe(h2);
  });

  it('produces different hashes for different URLs', async () => {
    const h1 = await computeHash('/api/a', 'GET');
    const h2 = await computeHash('/api/b', 'GET');
    expect(h1).not.toBe(h2);
  });

  it('produces different hashes for different methods', async () => {
    const h1 = await computeHash('/api/data', 'GET');
    const h2 = await computeHash('/api/data', 'POST');
    expect(h1).not.toBe(h2);
  });

  it('produces different hashes for different bodies', async () => {
    const h1 = await computeHash('/api/data', 'POST', { a: 1 });
    const h2 = await computeHash('/api/data', 'POST', { a: 2 });
    expect(h1).not.toBe(h2);
  });

  it('handles undefined body', async () => {
    const hash = await computeHash('/api/data', 'GET');
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('handles null body', async () => {
    const hash = await computeHash('/api/data', 'GET', null);
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('handles string body', async () => {
    const hash = await computeHash('/api/data', 'POST', 'raw text');
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('is case-insensitive for method', async () => {
    const h1 = await computeHash('/api/data', 'post');
    const h2 = await computeHash('/api/data', 'POST');
    expect(h1).toBe(h2);
  });
});
