/**
 * Logger utility with configurable verbosity levels
 * 
 * Log levels:
 * - 'lite': Only logs errors and warnings
 * - 'verbose': Logs everything including debug/info messages
 * 
 * Set LOG_LEVEL environment variable to 'verbose' to enable verbose logging.
 * Defaults to 'lite' mode.
 */

type LogLevel = 'lite' | 'verbose';

const LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL?.toLowerCase() === 'verbose' ? 'verbose' : 'lite') as LogLevel;

class Logger {
  private isVerbose(): boolean {
    return LOG_LEVEL === 'verbose';
  }

  /**
   * Log debug/info messages (only in verbose mode)
   */
  debug(...args: unknown[]): void {
    if (this.isVerbose()) {
      console.log(...args);
    }
  }

  /**
   * Log informational messages (only in verbose mode)
   */
  info(...args: unknown[]): void {
    if (this.isVerbose()) {
      console.log(...args);
    }
  }

  /**
   * Log warnings (always logged)
   */
  warn(...args: unknown[]): void {
    console.warn(...args);
  }

  /**
   * Log errors (always logged)
   */
  error(...args: unknown[]): void {
    console.error(...args);
  }

  /**
   * Log in verbose mode with a prefix tag
   */
  verbose(tag: string, ...args: unknown[]): void {
    if (this.isVerbose()) {
      console.log(`[${tag}]`, ...args);
    }
  }
}

export const logger = new Logger();

