import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { listDatabases, switchDatabase } from '../../../src/controllers/databaseController';
import { DatabaseConfig } from '../../../src/services/databaseSystemService';

// Mock the database service
vi.mock('../../../src/services/databaseSystemService', () => ({
  __esModule: true,
  default: {
    getDatabaseConfigs: vi.fn(),
    saveDatabaseConfig: vi.fn()
  }
}));

import databaseService from '../../../src/services/databaseSystemService';

const createMockRes = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  } as any as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  return res;
};

const mockDatabases: DatabaseConfig[] = [
  {
    id: 1,
    name: 'Production DB',
    host: 'prod.example.com',
    port: 3306,
    database_name: 'production',
    username: 'prod_user',
    password: 'prod_pass',
    ssl_enabled: true,
    is_active: true,
    is_default: false
  },
  {
    id: 2,
    name: 'Development DB',
    host: 'dev.example.com',
    port: 3306,
    database_name: 'development',
    username: 'dev_user',
    password: 'dev_pass',
    ssl_enabled: false,
    is_active: true,
    is_default: true
  }
];

describe('databaseController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listDatabases', () => {
    it('should return list of database configurations', async () => {
      vi.mocked(databaseService.getDatabaseConfigs).mockResolvedValue(mockDatabases);
      
      const req = {} as Request;
      const res = createMockRes();
      
      await listDatabases(req, res);
      
      expect(databaseService.getDatabaseConfigs).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith(mockDatabases);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 500 error when database service fails', async () => {
      vi.mocked(databaseService.getDatabaseConfigs).mockRejectedValue(new Error('Database error'));
      
      const req = {} as Request;
      const res = createMockRes();
      
      await listDatabases(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch database configurations' });
    });
  });

  describe('switchDatabase', () => {
    it('should successfully switch to an existing database', async () => {
      vi.mocked(databaseService.getDatabaseConfigs).mockResolvedValue(mockDatabases);
      vi.mocked(databaseService.saveDatabaseConfig).mockResolvedValue();
      
      const req = { params: { id: '1' } } as any as Request;
      const res = createMockRes();
      
      await switchDatabase(req, res);
      
      expect(databaseService.getDatabaseConfigs).toHaveBeenCalledTimes(1);
      expect(databaseService.saveDatabaseConfig).toHaveBeenCalledWith({
        name: 'Production DB',
        host: 'prod.example.com',
        port: 3306,
        database_name: 'production',
        username: 'prod_user',
        password: 'prod_pass',
        ssl_enabled: true,
        is_active: true,
        is_default: true
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Switched to database: Production DB',
        database: expect.objectContaining({
          name: 'Production DB',
          is_default: true
        })
      });
    });

    it('should return 400 error for invalid database ID', async () => {
      const req = { params: { id: 'invalid' } } as any as Request;
      const res = createMockRes();
      
      await switchDatabase(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid database ID' });
      expect(databaseService.getDatabaseConfigs).not.toHaveBeenCalled();
    });

    it('should return 404 error when database not found', async () => {
      vi.mocked(databaseService.getDatabaseConfigs).mockResolvedValue(mockDatabases);
      
      const req = { params: { id: '999' } } as any as Request;
      const res = createMockRes();
      
      await switchDatabase(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database configuration not found' });
      expect(databaseService.saveDatabaseConfig).not.toHaveBeenCalled();
    });

    it('should return 500 error when database service fails', async () => {
      vi.mocked(databaseService.getDatabaseConfigs).mockRejectedValue(new Error('Database error'));
      
      const req = { params: { id: '1' } } as any as Request;
      const res = createMockRes();
      
      await switchDatabase(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to switch database' });
    });

    it('should return 500 error when save operation fails', async () => {
      vi.mocked(databaseService.getDatabaseConfigs).mockResolvedValue(mockDatabases);
      vi.mocked(databaseService.saveDatabaseConfig).mockRejectedValue(new Error('Save error'));
      
      const req = { params: { id: '1' } } as any as Request;
      const res = createMockRes();
      
      await switchDatabase(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to switch database' });
    });
  });
});
