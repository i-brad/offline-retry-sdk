import { createOfflineClient } from 'offline-retry-sdk';

// Singleton client — created once, reused across the app.
// This file should only be imported from client components.
export const client = createOfflineClient({
  retryLimit: 5,
  baseDelay: 1000,
  autoSync: true,
  debug: true,
});
