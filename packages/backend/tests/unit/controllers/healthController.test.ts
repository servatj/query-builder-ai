import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';
import { getHealth } from '../../../src/controllers/healthController';

// Mock the services
vi.mock('../../../src/services/openaiService', () => ({
  __esModule: true,
  default: {
    enabled: false
  }
}));

vi.mock('../../../src/services/pools', () => ({
  getPool: vi.fn()
}));

import openaiService from '../../../src/services/openaiService';
import { getPool } from '../../../src/services/pools';

const createMockRes = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  } as any as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  return res;
};

const createMockPool = (shouldFail = false) => ({
  getConnection: vi.fn().mockResolvedValue({
    ping: vi.fn().mockImplementation(() => {
      if (shouldFail) throw new Error('Connection failed');
      return Promise.resolve();
    }),
    release: vi.fn()
  })
});

describe('healthController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getHealth', () => {
    it('should return healthy status with database connected and OpenAI enabled', async () => {
      const mockPool = createMockPool();
      vi.mocked(getPool).mockReturnValue(mockPool as any);
      (openaiService as any).enabled = true;
      
      const req = {} as Request;
      const res = createMockRes();
      
      await getHealth(req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        status: 'healthy',
        timestamp: '2023-01-01T12:00:00.000Z',
        database: 'connected',
        openai: 'enabled',
        services: {
          database: 'connected',
          openai: 'enabled'
        }
      });
      expect(mockPool.getConnection).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return healthy status with database connected and OpenAI disabled', async () => {
      const mockPool = createMockPool();
      vi.mocked(getPool).mockReturnValue(mockPool as any);
      (openaiService as any).enabled = false;
      
      const req = {} as Request;
      const res = createMockRes();
      
      await getHealth(req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        status: 'healthy',
        timestamp: '2023-01-01T12:00:00.000Z',
        database: 'connected',
        openai: 'disabled',
        services: {
          database: 'connected',
          openai: 'disabled'
        }
      });
    });

    it('should return healthy status with database disconnected when pool is null', async () => {
      vi.mocked(getPool).mockReturnValue(null);
      (openaiService as any).enabled = true;
      
      const req = {} as Request;
      const res = createMockRes();
      
      await getHealth(req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        status: 'healthy',
        timestamp: '2023-01-01T12:00:00.000Z',
        database: 'disconnected',
        openai: 'enabled',
        services: {
          database: 'disconnected',
          openai: 'enabled'
        }
      });
    });

    it('should return healthy status with database error when connection fails', async () => {
      const mockPool = createMockPool(true);
      vi.mocked(getPool).mockReturnValue(mockPool as any);
      (openaiService as any).enabled = true;
      
      const req = {} as Request;
      const res = createMockRes();
      
      await getHealth(req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        status: 'healthy',
        timestamp: '2023-01-01T12:00:00.000Z',
        database: 'error',
        openai: 'enabled',
        services: {
          database: 'error',
          openai: 'enabled'
        }
      });
      expect(mockPool.getConnection).toHaveBeenCalledTimes(1);
    });

    it('should return 500 error when health check fails completely', async () => {
      vi.mocked(getPool).mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      
      const req = {} as Request;
      const res = createMockRes();
      
      await getHealth(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'unhealthy',
        error: 'Health check failed'
      });
    });

    it('should release connection even when ping fails', async () => {
      const mockConnection = {
        ping: vi.fn().mockRejectedValue(new Error('Ping failed')),
        release: vi.fn()
      };
      const mockPool = {
        getConnection: vi.fn().mockResolvedValue(mockConnection)
      };
      vi.mocked(getPool).mockReturnValue(mockPool as any);
      (openaiService as any).enabled = true;
      
      const req = {} as Request;
      const res = createMockRes();
      
      await getHealth(req, res);
      
      expect(mockConnection.release).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        database: 'error',
        services: expect.objectContaining({
          database: 'error'
        })
      }));
    });
  });
});
