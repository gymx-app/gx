/** Development-only logger. Silent in production. */
const isDev = import.meta.env.DEV

export const logger = {
  error: (...args) => isDev && console.error('[GX]', ...args),
  warn: (...args) => isDev && console.warn('[GX]', ...args),
  info: (...args) => isDev && console.info('[GX]', ...args),
}
