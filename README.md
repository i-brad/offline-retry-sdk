# offline-retry-sdk

Browser SDK that queues failed fetch requests offline and auto-retries them when connectivity is restored.

## Install

```bash
pnpm add offline-retry-sdk
```

## Quick Start

```ts
import { createOfflineClient } from 'offline-retry-sdk';

const client = createOfflineClient({
  retryLimit: 5,      // Max retry attempts per request (default: 5)
  baseDelay: 1000,    // Base delay in ms for exponential backoff (default: 1000)
  autoSync: true,     // Auto-flush queue when back online (default: true)
  debug: false,       // Enable console logging (default: false)
});

// Make requests — network failures are automatically queued
try {
  const response = await client.request({
    url: 'https://api.example.com/data',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { key: 'value' },
  });
  console.log('Success:', response.status);
} catch (error) {
  // Request failed and was queued for retry
  console.log('Offline — request queued');
}
```

## API

### `createOfflineClient(config?)`

Creates a new client instance.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `retryLimit` | `number` | `5` | Max retries before giving up |
| `baseDelay` | `number` | `1000` | Base delay (ms) for exponential backoff |
| `autoSync` | `boolean` | `true` | Auto-retry when `online` event fires |
| `debug` | `boolean` | `false` | Log internal activity to console |

### Client Methods

| Method | Description |
|--------|-------------|
| `request(config)` | Send a request. Queues on network failure. |
| `flush()` | Manually process the retry queue. |
| `pause()` | Pause queue processing. |
| `resume()` | Resume queue processing. |
| `getQueueSize()` | Get number of queued requests. |
| `clearQueue()` | Remove all queued requests. |
| `on(event, handler)` | Subscribe to events. Returns unsubscribe function. |
| `destroy()` | Clean up listeners and resources. |

### Request Config

```ts
{
  url: string;
  method?: string;          // default: 'GET'
  headers?: Record<string, string>;
  body?: any;
  retry?: boolean;          // default: true — set false to skip queueing
  idempotencyKey?: string;  // forwarded as Idempotency-Key header on retry
}
```

### Events

```ts
client.on('queued', ({ request }) => { /* request was queued */ });
client.on('retry', ({ request, attempt }) => { /* retry attempt starting */ });
client.on('success', ({ request, response }) => { /* retry succeeded */ });
client.on('failure', ({ request, error }) => { /* max retries exceeded */ });
client.on('flushStart', ({ queueSize }) => { /* flush beginning */ });
client.on('flushComplete', ({ processed, failed }) => { /* flush done */ });
```

## How It Works

1. `client.request()` wraps `fetch`. If fetch succeeds (any HTTP status), the response is returned.
2. If fetch throws (network error, offline), the request is persisted to **IndexedDB**.
3. When `window.online` fires, the queue is processed in **FIFO** order with **exponential backoff**.
4. Successful retries are removed. Failed retries increment the counter until `maxRetries` is reached.
5. Duplicate requests (same URL + method + body) are deduplicated via content hashing.

## Key Behaviors

- **Only network errors are queued** — 4xx/5xx responses are returned as-is, never queued.
- **Requests survive page reloads** — IndexedDB persists across sessions.
- **Exponential backoff** — `delay = baseDelay * 2^retries`
- **Idempotency support** — provide `idempotencyKey` and it will be sent as a header on retry.
- **Graceful fallback** — if IndexedDB is unavailable, an in-memory queue is used (does not survive reload).

## License

MIT
