/**
 * Dev Logs API Route
 *
 * Receives console logs from the browser and prints them to the server terminal.
 * Only active in development mode.
 */

import { NextRequest, NextResponse } from 'next/server';

interface LogEntry {
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  args: unknown[];
  timestamp: number;
}

export async function POST(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  try {
    const { logs } = (await req.json()) as { logs: LogEntry[] };

    for (const entry of logs) {
      const time = new Date(entry.timestamp).toISOString().split('T')[1].slice(0, -1);
      const levelTag = entry.level.toUpperCase().padEnd(5);
      const prefix = `🌐 [BROWSER LOG] [${time}] [${levelTag}]`;
      const args = entry.args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ');

      switch (entry.level) {
        case 'error':
          console.error(`${prefix} ${args}`);
          break;
        case 'warn':
          console.warn(`${prefix} ${args}`);
          break;
        default:
          console.log(`${prefix} ${args}`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
