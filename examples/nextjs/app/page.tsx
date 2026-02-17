'use client';

import { useCallback, useEffect, useState } from 'react';
import { client } from './offline-client';

interface LogEntry {
  id: number;
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warn';
}

let logId = 0;

export default function Home() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [queueSize, setQueueSize] = useState(0);
  const [online, setOnline] = useState(true);

  const addLog = useCallback(
    (message: string, type: LogEntry['type'] = 'info') => {
      setLogs((prev) => [
        { id: ++logId, time: new Date().toLocaleTimeString(), message, type },
        ...prev.slice(0, 49),
      ]);
    },
    [],
  );

  const refreshQueue = useCallback(async () => {
    setQueueSize(await client.getQueueSize());
  }, []);

  // Subscribe to SDK events + online/offline status
  useEffect(() => {
    setOnline(navigator.onLine);

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubs = [
      client.on('queued', ({ request }) => {
        addLog(`Queued: ${request.method} ${request.url}`, 'warn');
        refreshQueue();
      }),
      client.on('retry', ({ request, attempt }) => {
        addLog(`Retrying (attempt ${attempt}): ${request.url}`, 'info');
      }),
      client.on('success', ({ request }) => {
        addLog(`Retry succeeded: ${request.url}`, 'success');
        refreshQueue();
      }),
      client.on('failure', ({ request }) => {
        addLog(`Permanently failed: ${request.url}`, 'error');
        refreshQueue();
      }),
      client.on('flushStart', ({ queueSize }) => {
        addLog(`Flushing ${queueSize} queued requests...`, 'info');
      }),
      client.on('flushComplete', ({ processed, failed }) => {
        addLog(`Flush done: ${processed} succeeded, ${failed} failed`, 'info');
      }),
    ];

    refreshQueue();

    return () => {
      unsubs.forEach((unsub) => unsub());
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addLog, refreshQueue]);

  const sendRequest = async () => {
    try {
      const res = await client.request({
        url: 'https://jsonplaceholder.typicode.com/posts',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { title: 'Hello', body: 'World', userId: 1 },
        idempotencyKey: `post-${Date.now()}`,
      });
      addLog(`Response: ${res.status} ${res.statusText}`, 'success');
    } catch {
      addLog('Request failed — queued for retry', 'error');
    }
  };

  const flush = async () => {
    addLog('Manual flush triggered', 'info');
    await client.flush();
  };

  const clear = async () => {
    await client.clearQueue();
    addLog('Queue cleared', 'info');
    refreshQueue();
  };

  const colors: Record<LogEntry['type'], string> = {
    info: '#666',
    success: '#16a34a',
    error: '#dc2626',
    warn: '#ca8a04',
  };

  return (
    <div>
      <h1>offline-retry-sdk Demo</h1>

      <p>
        Status:{' '}
        <strong style={{ color: online ? '#16a34a' : '#dc2626' }}>
          {online ? 'Online' : 'Offline'}
        </strong>
        {' | '}Queue: <strong>{queueSize}</strong> request(s)
      </p>

      <p style={{ fontSize: '0.85rem', color: '#666' }}>
        Tip: Open DevTools → Network → toggle &quot;Offline&quot; to simulate going offline.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={sendRequest}>Send Request</button>
        <button onClick={flush}>Flush Queue</button>
        <button onClick={clear}>Clear Queue</button>
      </div>

      <h2>Event Log</h2>
      <div
        style={{
          maxHeight: 400,
          overflow: 'auto',
          border: '1px solid #ddd',
          borderRadius: 4,
          padding: '0.5rem',
          fontSize: '0.85rem',
        }}
      >
        {logs.length === 0 && (
          <p style={{ color: '#999' }}>No events yet. Send a request!</p>
        )}
        {logs.map((log) => (
          <div key={log.id} style={{ marginBottom: '0.25rem' }}>
            <span style={{ color: '#999' }}>{log.time}</span>{' '}
            <span style={{ color: colors[log.type] }}>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
