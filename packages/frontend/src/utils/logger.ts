/**
 * Frontend Logger Utility
 * Provides colored console logging for function execution tracking
 * Outputs to both browser console (with CSS) and terminal (with ANSI colors)
 */

interface LogOptions {
  requestId?: string;
  sanitize?: boolean;
}

// Browser CSS colors
const COLORS = {
  START: '#4CAF50', // Green
  END: '#2196F3', // Blue
  REQUEST: '#FF9800', // Orange
  RESPONSE: '#9C27B0', // Purple
  ERROR: '#F44336', // Red
  TIMING: '#607D8B', // Gray
};

// Browser CSS styles
const STYLES = {
  HEADER_START: `color: ${COLORS.START}; font-weight: bold; font-size: 14px; padding: 2px 0;`,
  HEADER_END: `color: ${COLORS.END}; font-weight: bold; font-size: 14px; padding: 2px 0;`,
  REQUEST: `color: ${COLORS.REQUEST};`,
  RESPONSE: `color: ${COLORS.RESPONSE};`,
  ERROR: `color: ${COLORS.ERROR}; font-weight: bold;`,
  TIMING: `color: ${COLORS.TIMING}; font-style: italic;`,
};

// ANSI color codes for terminal
const ANSI_COLORS = {
  RESET: '\x1b[0m',
  GREEN: '\x1b[32m',
  BLUE: '\x1b[34m',
  YELLOW: '\x1b[33m',
  MAGENTA: '\x1b[35m',
  RED: '\x1b[31m',
  CYAN: '\x1b[36m',
  GRAY: '\x1b[90m',
  BOLD: '\x1b[1m',
};

// Check if we're in Node.js environment (terminal)
const isNodeEnv = typeof process !== 'undefined' && process.stdout && typeof process.stdout.write === 'function';
const CLIENT_LOG_ENDPOINT = '/api/client-logs';

function clampString(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}... [truncated]`;
}

function clampData(data: any, depth = 0): any {
  if (depth > 3) return '[Max Depth Reached]';
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') return clampString(data, 2000);
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.slice(0, 20).map((item) => clampData(item, depth + 1));
  }

  const clamped: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    clamped[key] = clampData(value, depth + 1);
  }
  return clamped;
}

function sendClientLog(payload: Record<string, any>) {
  if (typeof window === 'undefined') return;

  const body = JSON.stringify({
    ...payload,
    data: clampData(payload.data),
    timestamp: payload.timestamp ?? Date.now(),
  });

  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(CLIENT_LOG_ENDPOINT, blob);
    return;
  }

  fetch(CLIENT_LOG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }).catch(() => {});
}

/**
 * Terminal color helpers
 */
const terminalColor = {
  green: (text: string) => `${ANSI_COLORS.GREEN}${ANSI_COLORS.BOLD}${text}${ANSI_COLORS.RESET}`,
  blue: (text: string) => `${ANSI_COLORS.BLUE}${ANSI_COLORS.BOLD}${text}${ANSI_COLORS.RESET}`,
  yellow: (text: string) => `${ANSI_COLORS.YELLOW}${text}${ANSI_COLORS.RESET}`,
  magenta: (text: string) => `${ANSI_COLORS.MAGENTA}${text}${ANSI_COLORS.RESET}`,
  red: (text: string) => `${ANSI_COLORS.RED}${ANSI_COLORS.BOLD}${text}${ANSI_COLORS.RESET}`,
  gray: (text: string) => `${ANSI_COLORS.GRAY}${text}${ANSI_COLORS.RESET}`,
};


/**
 * Sanitize sensitive data from objects
 */
function sanitizeData(data: any, depth = 0): any {
  if (depth > 5) return '[Max Depth Reached]';
  
  if (data === null || data === undefined) return data;
  
  if (typeof data === 'string') {
    // Don't sanitize short strings
    if (data.length < 50) return data;
    // Truncate very long strings
    if (data.length > 1000) return data.substring(0, 1000) + '... [truncated]';
    return data;
  }
  
  if (typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.slice(0, 10).map(item => sanitizeData(item, depth + 1));
  }
  
  const sanitized: Record<string, any> = {};
  const sensitiveKeys = ['password', 'token', 'authorization', 'apiKey', 'secret', 'auth'];
  
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeData(value, depth + 1);
    }
  }
  
  return sanitized;
}

/**
 * Format timestamp
 */
function getTimestamp(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const ms = now.getMilliseconds().toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

/**
 * Log function execution start
 */
export function logFunctionStart(functionName: string, options: LogOptions = {}) {
  const timestamp = getTimestamp();
  const requestId = options.requestId || 'N/A';
  
  const header = `======== [${functionName}] START ========`;
  const info = `   [${timestamp}] Request ID: ${requestId}`;
  
  // Browser console
  console.log(`%c${header}`, STYLES.HEADER_START);
  console.log(info);

  sendClientLog({
    level: 'info',
    event: 'function_start',
    functionName,
    requestId,
    message: header,
    data: { timestamp },
  });
  
  // Terminal output
  if (isNodeEnv) {
    process.stdout.write(`${terminalColor.green(header)}\n`);
    process.stdout.write(`${terminalColor.gray(info)}\n`);
  }
  
  return Date.now();
}

/**
 * Log request payload
 */
export function logRequest(functionName: string, payload: any, options: LogOptions = {}) {
  const dataToLog = options.sanitize !== false ? sanitizeData(payload) : payload;
  const payloadStr = JSON.stringify(dataToLog, null, 2);
  
  // Browser console
  console.group(`%c📤 Request Payload`, STYLES.REQUEST);
  console.log(payloadStr);
  console.groupEnd();

  sendClientLog({
    level: 'info',
    event: 'request',
    message: 'Request payload',
    functionName,
    requestId: options.requestId || 'N/A',
    data: dataToLog,
  });
  
  // Terminal output
  if (isNodeEnv) {
    process.stdout.write(`${terminalColor.yellow('📤 Request Payload:')}\n`);
    process.stdout.write(`${payloadStr}\n`);
  }
}

/**
 * Log response payload
 */
export function logResponse(functionName: string, response: any, duration: number, options: LogOptions = {}) {
  const dataToLog = options.sanitize !== false ? sanitizeData(response) : response;
  const responseStr = JSON.stringify(dataToLog, null, 2);
  
  // Browser console
  console.group(`%c📥 Response (${duration}ms)`, STYLES.RESPONSE);
  console.log(responseStr);
  console.groupEnd();

  sendClientLog({
    level: 'info',
    event: 'response',
    message: `Response (${duration}ms)`,
    functionName,
    requestId: options.requestId || 'N/A',
    duration,
    data: dataToLog,
  });
  
  // Terminal output
  if (isNodeEnv) {
    process.stdout.write(`${terminalColor.magenta(`📥 Response (${duration}ms):`)}\n`);
    process.stdout.write(`${responseStr}\n`);
  }
}

/**
 * Log function execution end
 */
export function logFunctionEnd(functionName: string, duration: number) {
  const message = `======== [${functionName}] END ======== (${duration}ms)`;
  
  // Browser console
  console.log(`%c${message}`, STYLES.HEADER_END);

  sendClientLog({
    level: 'info',
    event: 'function_end',
    functionName,
    message,
    duration,
  });
  
  // Terminal output
  if (isNodeEnv) {
    process.stdout.write(`${terminalColor.blue(message)}\n`);
  }
}

/**
 * Log error
 */
export function logError(functionName: string, error: any, duration: number, _options: LogOptions = {}) {
  const timestamp = getTimestamp();
  
  const errorHeader = `======== [${functionName}] ERROR ======== (${duration}ms)`;
  const errorInfo = `   [${timestamp}] Error occurred`;
  
  // Browser console
  console.log(`%c${errorHeader}`, STYLES.ERROR);
  console.log(errorInfo);
  console.group(`%c❌ Error Details`, STYLES.ERROR);
  
  let errorDetails = '';
  if (error instanceof Error) {
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    errorDetails = `Message: ${error.message}\nStack: ${error.stack || 'N/A'}`;
  } else if (typeof error === 'object') {
    const errorStr = JSON.stringify(error, null, 2);
    console.error(errorStr);
    errorDetails = errorStr;
  } else {
    const errorStr = String(error);
    console.error(errorStr);
    errorDetails = errorStr;
  }
  
  console.groupEnd();
  
  const endMessage = `======== [${functionName}] END ========`;
  console.log(`%c${endMessage}`, STYLES.HEADER_END);

  sendClientLog({
    level: 'error',
    event: 'error',
    functionName,
    message: errorHeader,
    duration,
    data: errorDetails,
  });
  
  // Terminal output
  if (isNodeEnv) {
    process.stdout.write(`${terminalColor.red(errorHeader)}\n`);
    process.stdout.write(`${terminalColor.gray(errorInfo)}\n`);
    process.stdout.write(`${terminalColor.red('❌ Error Details:')}\n`);
    process.stdout.write(`${errorDetails}\n`);
    process.stdout.write(`${terminalColor.blue(endMessage)}\n`);
  }
}

/**
 * Wrapper function to log a complete function execution
 */
export async function logFunction<T>(
  functionName: string,
  fn: () => Promise<T>,
  options: LogOptions = {}
): Promise<T> {
  const startTime = logFunctionStart(functionName, options);
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    
    if (options.sanitize !== false) {
      logResponse(functionName, result, duration, options);
    }
    
    logFunctionEnd(functionName, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logError(functionName, error, duration, options);
    throw error;
  }
}

/**
 * Log function execution with request/response
 */
export async function logFunctionWithPayload<TRequest, TResponse>(
  functionName: string,
  request: TRequest,
  fn: (request: TRequest) => Promise<TResponse>,
  options: LogOptions = {}
): Promise<TResponse> {
  const startTime = logFunctionStart(functionName, options);
  logRequest(functionName, request, options);
  
  try {
    const result = await fn(request);
    const duration = Date.now() - startTime;
    logResponse(functionName, result, duration, options);
    logFunctionEnd(functionName, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logError(functionName, error, duration, options);
    throw error;
  }
}
