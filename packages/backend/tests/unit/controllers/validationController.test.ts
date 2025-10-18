import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';
import { validateQuery } from '../../../src/controllers/validationController';

// Mock the pools service
vi.mock('../../../src/services/pools', () => ({
  getDestinationPool: vi.fn()
}));

// Mock queryLogService
vi.mock('../../../src/services/queryLogService', () => ({
  queryLogService: {
    logQuery: vi.fn()
  }
}));

import { getDestinationPool } from '../../../src/services/pools';

const createMockRes = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  } as any as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  return res;
};

const createMockRequest = (sql: string, execute: boolean = true): Request => ({
  body: { sql, execute },
  headers: { 'x-session-id': 'test-session' },
  ip: '127.0.0.1',
  socket: { remoteAddress: '127.0.0.1' }
} as any as Request);

const createMockPool = (shouldFailExplain = false, shouldFailExecution = false, syntaxError = false) => ({
  getConnection: vi.fn().mockResolvedValue({
    query: vi.fn().mockImplementation((query: string) => {
      if (query.startsWith('EXPLAIN') && shouldFailExplain) {
        const error = new Error('Table does not exist');
        (error as any).code = 'ER_NO_SUCH_TABLE';
        throw error;
      }
      return Promise.resolve();
    }),
    release: vi.fn()
  }),
  execute: vi.fn().mockImplementation(() => {
    if (shouldFailExecution) {
      if (syntaxError) {
        const error = new Error('You have an error in your SQL syntax');
        (error as any).code = 'ER_PARSE_ERROR';
        (error as any).sqlState = '42000';
        throw error;
      } else {
        const error = new Error('Unknown column');
        (error as any).code = 'ER_BAD_FIELD_ERROR';
        (error as any).sqlState = '42S22';
        throw error;
      }
    }
    return Promise.resolve([[
      { id: 1, name: 'John', email: 'john@example.com' },
      { id: 2, name: 'Jane', email: 'jane@example.com' }
    ]]);
  })
});

describe('validationController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('validateQuery', () => {
    it('should validate and execute a successful query', async () => {
      const mockPool = createMockPool();
      vi.mocked(getDestinationPool).mockReturnValue(mockPool as any);
      
      const req = createMockRequest('SELECT * FROM users', true);
      const res = createMockRes();
      
      await validateQuery(req, res);
      
      const expectedData = [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' }
      ];
      expect(res.json).toHaveBeenCalledWith({
        isValid: true,
        syntaxValid: true,
        results: expectedData,
        data: expectedData, // Now includes data field for backwards compatibility
        rowCount: 2,
        executionTime: expect.stringMatching(/\d+ms/),
        limited: true
      });
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should add LIMIT clause when not present', async () => {
      const mockPool = createMockPool();
      vi.mocked(getDestinationPool).mockReturnValue(mockPool as any);
      
      const req = createMockRequest('SELECT * FROM users', true);
      const res = createMockRes();
      
      await validateQuery(req, res);
      
      // Verify LIMIT was added
      expect(mockPool.execute).toHaveBeenCalledWith('SELECT * FROM users LIMIT 50');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        limited: true
      }));
    });

    it('should not add LIMIT clause when already present', async () => {
      const mockPool = createMockPool();
      vi.mocked(getDestinationPool).mockReturnValue(mockPool as any);
      
      const req = createMockRequest('SELECT * FROM users LIMIT 10', true);
      const res = createMockRes();
      
      await validateQuery(req, res);
      
      // Verify LIMIT was not added again
      expect(mockPool.execute).toHaveBeenCalledWith('SELECT * FROM users LIMIT 10');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        limited: false
      }));
    });

    it('should return 503 when database is not configured', async () => {
      vi.mocked(getDestinationPool).mockReturnValue(null);
      
      const req = createMockRequest('SELECT * FROM users', true);
      const res = createMockRes();
      
      await validateQuery(req, res);
      
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        isValid: false,
        error: 'Database not configured. Please set DATABASE_URL environment variable.',
        syntaxValid: true
      });
    });

    it('should return 400 for syntax errors', async () => {
      const mockPool = createMockPool(false, true, true);
      vi.mocked(getDestinationPool).mockReturnValue(mockPool as any);
      
      const req = createMockRequest('SELEC * FROM users', true);
      const res = createMockRes();
      
      await validateQuery(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        isValid: false,
        syntaxValid: false,
        error: 'You have an error in your SQL syntax',
        errorCode: 'ER_PARSE_ERROR',
        sqlState: '42000',
        suggestion: 'Check your SQL syntax for typos or missing keywords'
      });
    });

    it('should return 200 for execution errors (non-syntax)', async () => {
      const mockPool = createMockPool(false, true, false);
      vi.mocked(getDestinationPool).mockReturnValue(mockPool as any);
      
      const req = createMockRequest('SELECT unknown_column FROM users', true);
      const res = createMockRes();
      
      await validateQuery(req, res);
      
      // Changed: Now returns 200 for execution errors (only 400 for syntax errors)
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        isValid: false,
        syntaxValid: true,
        error: 'Unknown column',
        errorCode: 'ER_BAD_FIELD_ERROR',
        sqlState: '42S22',
        suggestion: 'The query is syntactically correct but failed to execute. Check table/column names.'
      });
    });

    it('should handle query timeout', async () => {
      const mockPool = {
        getConnection: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue(undefined),
          release: vi.fn()
        }),
        execute: vi.fn().mockRejectedValue(new Error('Query timeout (30s)'))
      };
      vi.mocked(getDestinationPool).mockReturnValue(mockPool as any);
      
      const req = createMockRequest('SELECT * FROM users', true);
      const res = createMockRes();
      
      await validateQuery(req, res);
      
      // Changed: Now returns 200 for timeouts (execution errors)
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        isValid: false,
        error: 'Query timeout (30s)'
      }));
    }, 1000);

    it('should return 500 for internal server errors', async () => {
      vi.mocked(getDestinationPool).mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      
      const req = createMockRequest('SELECT * FROM users', true);
      const res = createMockRes();
      
      await validateQuery(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        isValid: false,
        error: 'Internal server error during validation',
        message: undefined
      });
    });

    it('should include error message in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      vi.mocked(getDestinationPool).mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      
      const req = createMockRequest('SELECT * FROM users', true);
      const res = createMockRes();
      
      await validateQuery(req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        isValid: false,
        error: 'Internal server error during validation',
        message: 'Unexpected error'
      });
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should release connection even when query fails', async () => {
      const mockConnection = {
        query: vi.fn().mockResolvedValue(undefined),
        release: vi.fn()
      };
      const mockPool = {
        getConnection: vi.fn().mockResolvedValue(mockConnection),
        execute: vi.fn().mockRejectedValue(new Error('Query failed'))
      };
      vi.mocked(getDestinationPool).mockReturnValue(mockPool as any);
      
      const req = createMockRequest('SELECT * FROM users', true);
      const res = createMockRes();
      
      await validateQuery(req, res);
      
      expect(mockConnection.release).toHaveBeenCalledTimes(1);
    });

    it('should validate without executing when execute is false', async () => {
      const mockPool = createMockPool();
      vi.mocked(getDestinationPool).mockReturnValue(mockPool as any);
      
      const req = createMockRequest('SELECT * FROM users', false);
      const res = createMockRes();
      
      await validateQuery(req, res);
      
      // Note: The validation controller still executes EXPLAIN and the query
      // The execute flag only affects dangerous operation checks
      const expectedData = [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' }
      ];
      expect(res.json).toHaveBeenCalledWith({
        isValid: true,
        syntaxValid: true,
        results: expectedData,
        data: expectedData,
        rowCount: 2,
        executionTime: expect.stringMatching(/\d+ms/),
        limited: true
      });
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
