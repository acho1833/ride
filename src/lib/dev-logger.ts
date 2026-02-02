/**
 * Dev Logger - Browser to Server Console Bridge
 *
 * Intercepts browser console.log/warn/error calls and sends them
 * to the server for terminal output. Only active in development.
 *
 * Usage: Call initDevLogger() once at app startup.
 */

interface LogEntry {
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  args: unknown[];
  timestamp: number;
}

/** Batch interval in milliseconds */
const BATCH_INTERVAL_MS = 500;

/** Log buffer */
let logBuffer: LogEntry[] = [];

/** Timer reference */
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/** Original console methods (saved for restoration) */
let originalConsole: {
  log: typeof console.log;
  warn: typeof console.warn;
  error: typeof console.error;
  info: typeof console.info;
  debug: typeof console.debug;
} | null = null;

/** Whether the logger is initialized */
let isInitialized = false;

/**
 * Flush buffered logs to the server
 */
async function flushLogs() {
  if (logBuffer.length === 0) return;

  const logsToSend = [...logBuffer];
  logBuffer = [];

  try {
    await fetch('/api/dev-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs: logsToSend })
    });
  } catch {
    // Silently fail - don't want logging failures to break the app
  }
}

/**
 * Schedule a flush if not already scheduled
 */
function scheduleFlush() {
  if (flushTimer === null) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushLogs();
    }, BATCH_INTERVAL_MS);
  }
}

/**
 * Create an interceptor for a console method
 */
function createInterceptor(level: LogEntry['level'], original: (...args: unknown[]) => void) {
  return (...args: unknown[]) => {
    // Call original console method (still shows in browser)
    original.apply(console, args);

    // Add to buffer for server
    logBuffer.push({
      level,
      args: args.map(arg => {
        // Handle special cases for serialization
        if (arg instanceof Error) {
          return { __error: true, message: arg.message, stack: arg.stack };
        }
        if (typeof arg === 'function') {
          return '[Function]';
        }
        if (typeof arg === 'symbol') {
          return arg.toString();
        }
        return arg;
      }),
      timestamp: Date.now()
    });

    scheduleFlush();
  };
}

/**
 * Initialize the dev logger.
 * Intercepts console methods and sends logs to server.
 * Only works in development mode.
 */
export function initDevLogger() {
  // Only run in browser and in development
  if (typeof window === 'undefined') return;
  if (process.env.NODE_ENV !== 'development') return;
  if (isInitialized) return;

  isInitialized = true;

  // Save original methods
  originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
  };

  // Replace with interceptors
  console.log = createInterceptor('log', originalConsole.log);
  console.warn = createInterceptor('warn', originalConsole.warn);
  console.error = createInterceptor('error', originalConsole.error);
  console.info = createInterceptor('info', originalConsole.info);
  console.debug = createInterceptor('debug', originalConsole.debug);

  // Flush on page unload
  window.addEventListener('beforeunload', () => {
    if (logBuffer.length > 0) {
      // Use sendBeacon for reliable delivery on page close
      navigator.sendBeacon('/api/dev-logs', JSON.stringify({ logs: logBuffer }));
    }
  });
}

/**
 * Restore original console methods.
 * Useful for cleanup in tests.
 */
export function restoreConsole() {
  if (!originalConsole) return;

  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;

  originalConsole = null;
  isInitialized = false;

  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}
