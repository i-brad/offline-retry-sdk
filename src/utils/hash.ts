function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function serializeBody(body: unknown): string {
  if (body === undefined || body === null) return '';
  if (typeof body === 'string') return body;
  try {
    return JSON.stringify(body);
  } catch {
    return String(body);
  }
}

export async function computeHash(
  url: string,
  method: string,
  body?: unknown,
): Promise<string> {
  const input = `${method.toUpperCase()}:${url}:${serializeBody(body)}`;

  if (
    typeof crypto !== 'undefined' &&
    crypto.subtle &&
    typeof TextEncoder !== 'undefined'
  ) {
    try {
      const data = new TextEncoder().encode(input);
      const buffer = await crypto.subtle.digest('SHA-256', data);
      const bytes = new Uint8Array(buffer);
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      // Fall through to DJB2
    }
  }

  return djb2Hash(input);
}
