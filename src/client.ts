import type {
  ClientConfig,
  OfflineClient,
  ResolvedClientConfig,
  StorageAdapter,
} from './types';
import { TypedEventEmitter } from './event-emitter';
import { IndexedDBAdapter } from './storage/indexeddb-adapter';
import { MemoryAdapter } from './storage/memory-adapter';
import { ResilientAdapter } from './storage/resilient-adapter';
import { DeduplicationEngine } from './dedup';
import { RetryEngine } from './retry-engine';
import { NetworkMonitor } from './network-monitor';
import { executeRequest } from './request-wrapper';
import { createLogger } from './utils/logger';

export function createOfflineClient(config: ClientConfig = {}): OfflineClient {
  const resolved: ResolvedClientConfig = {
    storage: config.storage ?? 'indexeddb',
    retryLimit: config.retryLimit ?? 5,
    baseDelay: config.baseDelay ?? 1000,
    autoSync: config.autoSync ?? true,
    debug: config.debug ?? false,
  };

  const logger = createLogger(resolved.debug);
  const emitter = new TypedEventEmitter();

  let storage: StorageAdapter;
  try {
    storage = new ResilientAdapter(new IndexedDBAdapter(), logger);
  } catch {
    logger.warn('IndexedDB unavailable at init, using in-memory fallback');
    storage = new MemoryAdapter();
  }

  const dedup = new DeduplicationEngine(storage);
  const retryEngine = new RetryEngine(
    storage,
    emitter,
    { baseDelay: resolved.baseDelay },
    logger,
  );

  const networkMonitor = new NetworkMonitor({
    onOnline: () => {
      if (resolved.autoSync) {
        retryEngine.flush();
      }
    },
    onOffline: () => {
      logger.log('Network went offline');
    },
  });
  networkMonitor.start();

  return {
    request: (reqConfig) =>
      executeRequest(reqConfig, storage, dedup, emitter, resolved, logger),
    flush: () => retryEngine.flush(),
    pause: () => retryEngine.pause(),
    resume: () => retryEngine.resume(),
    getQueueSize: () => storage.count(),
    clearQueue: () => storage.clear(),
    on: (event, handler) => emitter.on(event, handler),
    destroy: () => {
      networkMonitor.destroy();
      emitter.removeAllListeners();
    },
  };
}
