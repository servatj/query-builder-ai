/**
 * Sandbox mode utilities
 * 
 * Provides functions to detect and manage sandbox mode which disables
 * configuration editing for security purposes.
 */

/**
 * Check if the application is running in sandbox mode
 * @returns true if SANDBOX_MODE environment variable is set to 'true'
 */
export const isSandboxMode = (): boolean => {
  return process.env.SANDBOX_MODE === 'true';
};

/**
 * Middleware to block requests in sandbox mode
 * Throws an error if the application is in sandbox mode
 */
export const requireNonSandboxMode = () => {
  if (isSandboxMode()) {
    throw new Error('Configuration editing is disabled in sandbox mode');
  }
};

/**
 * Get sandbox mode status for API responses
 * @returns object with sandbox mode status
 */
export const getSandboxStatus = () => {
  return {
    sandboxMode: isSandboxMode(),
    configEditingEnabled: !isSandboxMode()
  };
};