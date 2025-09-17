import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleError } from '../../../src/utils/errorHandler';

describe('errorHandler', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('handleError', () => {
    it('handles Error instances with message and stack', () => {
      const error = new Error('Test error message');
      error.stack = 'Error: Test error message\n    at test.js:1:1';

      handleError(error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenNthCalledWith(1, '[Error]: Test error message');
      expect(consoleErrorSpy).toHaveBeenNthCalledWith(2, error.stack);
    });

    it('handles Error instances with message but no stack', () => {
      const error = new Error('Test error message');
      delete error.stack;

      handleError(error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Error]: Test error message');
    });

    it('handles Error instances with empty message', () => {
      const error = new Error('');

      handleError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[Error]: ');
    });

    it('handles non-Error objects (string)', () => {
      const error = 'Simple error string';

      handleError(error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Error]:', error);
    });

    it('handles non-Error objects (number)', () => {
      const error = 404;

      handleError(error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Error]:', error);
    });

    it('handles non-Error objects (object)', () => {
      const error = { code: 'ENOENT', message: 'File not found' };

      handleError(error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Error]:', error);
    });

    it('handles null', () => {
      handleError(null);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Error]:', null);
    });

    it('handles undefined', () => {
      handleError(undefined);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Error]:', undefined);
    });

    it('handles custom error classes', () => {
      class CustomError extends Error {
        code: string;
        
        constructor(message: string, code: string) {
          super(message);
          this.code = code;
          this.name = 'CustomError';
        }
      }

      const error = new CustomError('Custom error occurred', 'CUSTOM_ERROR');
      error.stack = 'CustomError: Custom error occurred\n    at test.js:1:1';

      handleError(error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenNthCalledWith(1, '[Error]: Custom error occurred');
      expect(consoleErrorSpy).toHaveBeenNthCalledWith(2, error.stack);
    });
  });
});