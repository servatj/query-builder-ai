// utils/logger.ts
// Simple logger utility

export const logger = {
  info: (message: string, ...optionalParams: unknown[]) => {
    console.info(`[Info]: ${message}`, ...optionalParams);
  },
  warn: (message: string, ...optionalParams: unknown[]) => {
    console.warn(`[Warn]: ${message}`, ...optionalParams);
  },
  error: (message: string, ...optionalParams: unknown[]) => {
    console.error(`[Error]: ${message}`, ...optionalParams);
  },
  debug: (message: string, ...optionalParams: unknown[]) => {
    console.debug(`[Debug]: ${message}`, ...optionalParams);
  },
};
