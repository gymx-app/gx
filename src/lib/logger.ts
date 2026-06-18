const isDev = import.meta.env.DEV

export const logger = {
  error: (...args: unknown[]) => isDev && console.error('[GX]', ...args),
  warn: (...args: unknown[]) => isDev && console.warn('[GX]', ...args),
  // eslint-disable-next-line no-console
  info: (...args: unknown[]) => isDev && console.info('[GX]', ...args),
}
