import type {
  RequestConfig,
  ResolvedClientConfig,
  StorageAdapter,
  StoredRequest,
} from './types';
import type { DeduplicationEngine } from './dedup';
import type { TypedEventEmitter } from './event-emitter';
import type { Logger } from './utils/logger';
import { computeHash } from './utils/hash';
import { generateId } from './utils/id';

function serializeBody(body: unknown): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body === 'string') return body;
  return JSON.stringify(body);
}

export async function executeRequest(
  config: RequestConfig,
  storage: StorageAdapter,
  dedup: DeduplicationEngine,
  emitter: TypedEventEmitter,
  clientConfig: ResolvedClientConfig,
  logger: Logger,
): Promise<Response> {
  const {
    url,
    method = 'GET',
    headers,
    body,
    retry = true,
    idempotencyKey,
  } = config;

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: serializeBody(body),
    });
    return response;
  } catch (error) {
    if (!retry) throw error;

    const hash = await computeHash(url, method, body);
    if (await dedup.isDuplicate(hash)) {
      logger.log('Duplicate request detected, skipping queue:', url);
      throw error;
    }

    const storedRequest: StoredRequest = {
      id: generateId(),
      url,
      method: method.toUpperCase(),
      headers,
      body,
      createdAt: Date.now(),
      retries: 0,
      maxRetries: clientConfig.retryLimit,
      idempotencyKey,
      hash,
    };

    await storage.add(storedRequest);
    emitter.emit('queued', { request: storedRequest });
    logger.log('Request queued:', url);

    throw error;
  }
}
