import { openDB, type IDBPDatabase } from 'idb';
import type { StorageAdapter, StoredRequest } from '../types';

const DB_NAME = 'offline-retry-sdk';
const STORE_NAME = 'requests';
const DB_VERSION = 1;

export class IndexedDBAdapter implements StorageAdapter {
  private dbPromise: Promise<IDBPDatabase>;

  constructor() {
    this.dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('idempotencyKey', 'idempotencyKey', { unique: false });
        store.createIndex('hash', 'hash', { unique: false });
      },
    });
  }

  async add(request: StoredRequest): Promise<void> {
    const db = await this.dbPromise;
    await db.put(STORE_NAME, request);
  }

  async getAll(): Promise<StoredRequest[]> {
    const db = await this.dbPromise;
    return db.getAllFromIndex(STORE_NAME, 'createdAt');
  }

  async getById(id: string): Promise<StoredRequest | undefined> {
    const db = await this.dbPromise;
    return db.get(STORE_NAME, id);
  }

  async getByHash(hash: string): Promise<StoredRequest | undefined> {
    const db = await this.dbPromise;
    return db.getFromIndex(STORE_NAME, 'hash', hash);
  }

  async update(request: StoredRequest): Promise<void> {
    const db = await this.dbPromise;
    await db.put(STORE_NAME, request);
  }

  async remove(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete(STORE_NAME, id);
  }

  async clear(): Promise<void> {
    const db = await this.dbPromise;
    await db.clear(STORE_NAME);
  }

  async count(): Promise<number> {
    const db = await this.dbPromise;
    return db.count(STORE_NAME);
  }
}
