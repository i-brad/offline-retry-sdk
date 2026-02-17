export interface Logger {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function createLogger(debug: boolean): Logger {
  return {
    log: (...args: unknown[]) => {
      if (debug) console.log('[offline-retry-sdk]', ...args);
    },
    warn: (...args: unknown[]) => {
      if (debug) console.warn('[offline-retry-sdk]', ...args);
    },
    error: (...args: unknown[]) => {
      if (debug) console.error('[offline-retry-sdk]', ...args);
    },
  };
}
