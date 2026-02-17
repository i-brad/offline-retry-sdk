export interface ClientConfig {
  storage?: 'indexeddb';
  retryLimit?: number;
  baseDelay?: number;
  autoSync?: boolean;
  debug?: boolean;
}

export interface ResolvedClientConfig {
  storage: 'indexeddb';
  retryLimit: number;
  baseDelay: number;
  autoSync: boolean;
  debug: boolean;
}

export interface RequestConfig {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  retry?: boolean;
  idempotencyKey?: string;
}

export interface OfflineClient {
  request(config: RequestConfig): Promise<Response>;
  flush(): Promise<void>;
  pause(): void;
  resume(): void;
  getQueueSize(): Promise<number>;
  clearQueue(): Promise<void>;
  on<E extends EventName>(event: E, handler: EventHandlerMap[E]): () => void;
  destroy(): void;
}

export interface StoredRequest {
  id: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
  createdAt: number;
  retries: number;
  maxRetries: number;
  idempotencyKey?: string;
  hash: string;
}

export type EventName =
  | 'queued'
  | 'retry'
  | 'success'
  | 'failure'
  | 'flushStart'
  | 'flushComplete';

export interface QueuedEvent {
  request: StoredRequest;
}

export interface RetryEvent {
  request: StoredRequest;
  attempt: number;
}

export interface SuccessEvent {
  request: StoredRequest;
  response: Response;
}

export interface FailureEvent {
  request: StoredRequest;
  error: unknown;
}

export interface FlushStartEvent {
  queueSize: number;
}

export interface FlushCompleteEvent {
  processed: number;
  failed: number;
}

export interface EventHandlerMap {
  queued: (event: QueuedEvent) => void;
  retry: (event: RetryEvent) => void;
  success: (event: SuccessEvent) => void;
  failure: (event: FailureEvent) => void;
  flushStart: (event: FlushStartEvent) => void;
  flushComplete: (event: FlushCompleteEvent) => void;
}

export interface StorageAdapter {
  add(request: StoredRequest): Promise<void>;
  getAll(): Promise<StoredRequest[]>;
  getById(id: string): Promise<StoredRequest | undefined>;
  getByHash(hash: string): Promise<StoredRequest | undefined>;
  update(request: StoredRequest): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
  count(): Promise<number>;
}
