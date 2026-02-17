import { createOfflineClient } from '../src';

const client = createOfflineClient({
  retryLimit: 5,
  baseDelay: 1000,
  autoSync: true,
  debug: true,
});

// Listen for events
client.on('queued', ({ request }) => {
  console.log('Request queued for retry:', request.url);
});

client.on('success', ({ request }) => {
  console.log('Retry succeeded:', request.url);
});

client.on('failure', ({ request, error }) => {
  console.error('Request permanently failed:', request.url, error);
});

client.on('flushStart', ({ queueSize }) => {
  console.log(`Flushing ${queueSize} queued requests...`);
});

client.on('flushComplete', ({ processed, failed }) => {
  console.log(`Flush complete: ${processed} succeeded, ${failed} failed`);
});

// Make a request — if offline, it will be queued automatically
async function submitOrder(order: { items: string[]; total: number }) {
  try {
    const response = await client.request({
      url: 'https://api.example.com/orders',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: order,
      idempotencyKey: `order-${Date.now()}`,
    });
    console.log('Order submitted:', response.status);
  } catch (error) {
    console.log('Order queued for retry when back online');
  }
}

// Check queue status
async function checkQueue() {
  const size = await client.getQueueSize();
  console.log(`${size} requests in queue`);
}

// Manual flush
async function retryNow() {
  await client.flush();
}

// Cleanup when done
function cleanup() {
  client.destroy();
}
