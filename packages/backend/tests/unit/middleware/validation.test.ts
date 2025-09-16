import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { validateGenerateQuery, validateSql } from '../../../src/middleware/validation';
import { promptSchema, sqlQuerySchema } from '../../../src/utils/validators';

vi.mock('../../../src/utils/validators', () => ({
  promptSchema: {
    safeParse: vi.fn()
  },
  sqlQuerySchema: {
    safeParse: vi.fn()
  }
}));

const createMockReq = (body: any) => ({
  body
} as Request);

const createMockRes = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  } as any as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  return res;
};

const mockNext = vi.fn() as NextFunction;

describe('validation middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateGenerateQuery', () => {
    it('should call next if prompt is valid', () => {
      const validData = { prompt: 'Valid prompt', useAI: true };
      vi.mocked(promptSchema.safeParse).mockReturnValue({ success: true, data: validData } as any);
      const req = createMockReq({ prompt: 'Valid prompt' });
      const res = createMockRes();

      validateGenerateQuery(req, res, mockNext);

      expect(promptSchema.safeParse).toHaveBeenCalledWith({ prompt: 'Valid prompt' });
      expect(req.body).toEqual(validData);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 if prompt is invalid (empty)', () => {
      const invalidBody = { prompt: '' };
      const parseError = { success: false, error: { errors: [{ message: 'String must contain at least 1 character(s)' }] } };
      vi.mocked(promptSchema.safeParse).mockReturnValue(parseError as any);
      const req = createMockReq(invalidBody);
      const res = createMockRes();

      validateGenerateQuery(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'String must contain at least 1 character(s)' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 if prompt is too long', () => {
      const longPrompt = 'a'.repeat(501);
      const parseError = { success: false, error: { errors: [{ message: 'String must contain at most 500 character(s)' }] } };
      vi.mocked(promptSchema.safeParse).mockReturnValue(parseError as any);
      const req = createMockReq({ prompt: longPrompt });
      const res = createMockRes();

      validateGenerateQuery(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'String must contain at most 500 character(s)' });
    });

    it('should use default useAI if not provided', () => {
      const validData = { prompt: 'Valid prompt', useAI: true };
      vi.mocked(promptSchema.safeParse).mockReturnValue({ success: true, data: validData } as any);
      const req = createMockReq({ prompt: 'Valid prompt' });
      const res = createMockRes();

      validateGenerateQuery(req, res, mockNext);

      expect(req.body).toEqual(validData);
    });
  });

  describe('validateSql', () => {
    it('should call next if query is valid', () => {
      const validData = { query: 'SELECT * FROM users' };
      vi.mocked(sqlQuerySchema.safeParse).mockReturnValue({ success: true, data: validData } as any);
      const req = createMockReq({ query: 'SELECT * FROM users' });
      const res = createMockRes();

      validateSql(req, res, mockNext);

      expect(sqlQuerySchema.safeParse).toHaveBeenCalledWith({ query: 'SELECT * FROM users' });
      expect(req.body).toEqual(validData);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 if query is invalid (empty)', () => {
      const parseError = { success: false, error: { errors: [{ message: 'String must contain at least 1 character(s)' }] } };
      vi.mocked(sqlQuerySchema.safeParse).mockReturnValue(parseError as any);
      const req = createMockReq({ query: '' });
      const res = createMockRes();

      validateSql(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ isValid: false, error: 'String must contain at least 1 character(s)' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 if query is missing', () => {
      const parseError = { success: false, error: { errors: [{ message: 'Required' }] } };
      vi.mocked(sqlQuerySchema.safeParse).mockReturnValue(parseError as any);
      const req = createMockReq({});
      const res = createMockRes();

      validateSql(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ isValid: false, error: 'Required' });
    });
  });
});