import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../../src/middleware/errorHandler';
import logger from '../../../src/utils/logger';

vi.mock('../../../src/utils/logger', () => ({
  default: {
    error: vi.fn()
  }
}));

const createMockReq = (path: string, method: string) => ({
  path,
  method
} as Request);

const createMockRes = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  } as any as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  return res;
};

const mockNext = vi.fn() as NextFunction;

describe('errorHandler', () => {
  it('should handle error with status and message', () => {
    const error = new Error('Test error');
    (error as any).status = 400;
    const req = createMockReq('/api/test', 'GET');
    const res = createMockRes();

    errorHandler(error, req, res, mockNext);

    expect(logger.error).toHaveBeenCalledWith('HTTP 400 - Test error', expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Test error' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle error without status', () => {
    const error = new Error('Test error');
    const req = createMockReq('/api/test', 'GET');
    const res = createMockRes();

    errorHandler(error, req, res, mockNext);

    expect(logger.error).toHaveBeenCalledWith('HTTP 500 - Test error', expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Test error' });
  });

  it('should handle validate-query path with isValid false', () => {
    const error = new Error('Validation error');
    (error as any).status = 400;
    const req = createMockReq('/api/validate-query', 'POST');
    const res = createMockRes();

    errorHandler(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ isValid: false, error: 'Validation error' });
  });

  it('should use default message if no error message', () => {
    const error = {};
    const req = createMockReq('/api/test', 'GET');
    const res = createMockRes();

    errorHandler(error as any, req, res, mockNext);

    expect(logger.error).toHaveBeenCalledWith('HTTP 500 - Internal server error', expect.any(Object));
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});