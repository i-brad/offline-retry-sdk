import { beforeEach } from 'vitest';
import { IndexedDBAdapter } from '../../src/storage/indexeddb-adapter';
import { runStorageContractTests } from './storage-contract';

let counter = 0;

// Each test gets a fresh adapter. Since fake-indexeddb shares the same
// in-memory IDB across a test file, we clear data between tests
// by creating the adapter fresh and clearing it in beforeEach.
runStorageContractTests('IndexedDBAdapter', () => {
  counter++;
  return new IndexedDBAdapter();
});

beforeEach(async () => {
  // Clear data between tests by creating a fresh adapter and clearing
  const adapter = new IndexedDBAdapter();
  await adapter.clear();
});
