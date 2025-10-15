import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

// Mock the database service BEFORE any imports
vi.mock('../../../src/services/databaseSystemService', () => ({
  __esModule: true,
  default: {
    getDatabaseConfigs: vi.fn(),
    saveDatabaseConfig: vi.fn(),
    switchDefaultDatabase: vi.fn(),
    getDefaultDatabaseConfig: vi.fn()
  }
}));

// Don't mock the controller functions - we want to test them

// Mock other dependencies that might be imported by routes
vi.mock('../../../src/services/rulesService', () => ({
  clearCachedRules: vi.fn()
}));

vi.mock('../../../src/index', () => ({
  recreateDestinationPool: vi.fn()
}));

import { listDatabases, switchDatabase } from '../../../src/controllers/databaseController';
import { DatabaseConfig } from '../../../src/services/databaseSystemService';
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
      const switchedDatabase = { ...mockDatabases[0], is_default: true };
      vi.mocked(databaseService.switchDefaultDatabase).mockResolvedValue(true);
      vi.mocked(databaseService.getDefaultDatabaseConfig).mockResolvedValue(switchedDatabase);
      
      const req = { params: { id: '1' } } as any as Request;
      const res = createMockRes();
      
      await switchDatabase(req, res);
      
      expect(databaseService.switchDefaultDatabase).toHaveBeenCalledWith(1);
      expect(databaseService.getDefaultDatabaseConfig).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Switched to database: Production DB',
        database: switchedDatabase
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
      vi.mocked(databaseService.switchDefaultDatabase).mockResolvedValue(false);
      
      const req = { params: { id: '999' } } as any as Request;
      const res = createMockRes();
      
      await switchDatabase(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database configuration not found or switching failed' });
      expect(databaseService.getDefaultDatabaseConfig).not.toHaveBeenCalled();
    });

    it('should return 500 error when database service fails', async () => {
      vi.mocked(databaseService.switchDefaultDatabase).mockRejectedValue(new Error('Database error'));
      
      const req = { params: { id: '1' } } as any as Request;
      const res = createMockRes();
      
      await switchDatabase(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to switch database' });
    });

    it('should return 500 error when switching operation fails', async () => {
      vi.mocked(databaseService.switchDefaultDatabase).mockResolvedValue(true);
      vi.mocked(databaseService.getDefaultDatabaseConfig).mockRejectedValue(new Error('Get config error'));
      
      const req = { params: { id: '1' } } as any as Request;
      const res = createMockRes();
      
      await switchDatabase(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to switch database' });
    });
  });
});
