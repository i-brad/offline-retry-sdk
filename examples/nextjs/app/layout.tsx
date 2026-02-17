import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'offline-retry-sdk — Next.js Example',
  description: 'Demo of offline request queueing and retry',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 640, margin: '2rem auto', padding: '0 1rem' }}>
        {children}
      </body>
    </html>
  );
}
