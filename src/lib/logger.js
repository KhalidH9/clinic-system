/* Lightweight logger wrapper – swap for Sentry/Datadog later */
export const logger = {
    info:  (msg, meta = {}) => console.info  (`[info]  ${msg}`, meta),
    warn:  (msg, meta = {}) => console.warn  (`[warn]  ${msg}`, meta),
    error: (msg, meta = {}) => console.error(`[error] ${msg}`, meta),
  };