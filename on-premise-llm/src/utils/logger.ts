// 간단한 로그 레벨 유틸

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LEVELS;

const currentLevel: LogLevel = (process.env.LOG_LEVEL?.toLowerCase() as LogLevel) || 'info';

function log(level: LogLevel, ...args: unknown[]) {
  if (LEVELS[level] >= LEVELS[currentLevel]) {
    const ts = new Date().toISOString();
    console[level === 'debug' ? 'log' : level](`[${ts}] [${level.toUpperCase()}]`, ...args);
  }
}

export const logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info: (...args: unknown[]) => log('info', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  error: (...args: unknown[]) => log('error', ...args),
};
