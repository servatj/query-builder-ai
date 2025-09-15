// utils/errorHandler.ts
// Centralized error handling utility

export function handleError(error: unknown): void {
  if (error instanceof Error) {
    // Log error details
    console.error(`[Error]: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  } else {
    console.error('[Error]:', error);
  }
}
