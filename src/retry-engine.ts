import type { StorageAdapter, StoredRequest } from './types';
import type { TypedEventEmitter } from './event-emitter';
import type { Logger } from './utils/logger';
import { delay } from './utils/delay';

function serializeBody(body: unknown): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body === 'string') return body;
  return JSON.stringify(body);
}

export class RetryEngine {
  private running = false;
  private paused = false;

  constructor(
    private storage: StorageAdapter,
    private emitter: TypedEventEmitter,
    private config: { baseDelay: number },
    private logger: Logger,
  ) {}

  async flush(): Promise<void> {
    if (this.running || this.paused) return;
    this.running = true;

    let processed = 0;
    let failed = 0;

    try {
      const requests = await this.storage.getAll();
      this.emitter.emit('flushStart', { queueSize: requests.length });

      if (requests.length === 0) {
        this.emitter.emit('flushComplete', { processed: 0, failed: 0 });
        return;
      }

      for (const req of requests) {
        if (this.paused) break;

        try {
          const headers: Record<string, string> = { ...req.headers };
          if (req.idempotencyKey) {
            headers['Idempotency-Key'] = req.idempotencyKey;
          }

          this.emitter.emit('retry', {
            request: req,
            attempt: req.retries + 1,
          });

          const response = await fetch(req.url, {
            method: req.method,
            headers,
            body: serializeBody(req.body),
          });

          await this.storage.remove(req.id);
          this.emitter.emit('success', { request: req, response });
          processed++;
        } catch (error) {
          const updated: StoredRequest = {
            ...req,
            retries: req.retries + 1,
          };

          if (updated.retries >= updated.maxRetries) {
            await this.storage.remove(req.id);
            this.emitter.emit('failure', { request: req, error });
            failed++;
            this.logger.warn(
              'Request exceeded max retries, removed:',
              req.url,
            );
          } else {
            await this.storage.update(updated);
            failed++;
            this.logger.log(
              `Retry ${updated.retries}/${updated.maxRetries} failed for:`,
              req.url,
            );

            const backoffDelay =
              this.config.baseDelay * Math.pow(2, updated.retries);
            await delay(backoffDelay);
          }
        }
      }

      this.emitter.emit('flushComplete', { processed, failed });
    } finally {
      this.running = false;
    }
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  get isRunning(): boolean {
    return this.running;
  }
}
