import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { 
  getSettings, 
  updateRules, 
  updateDatabase, 
  testDatabase, 
  updateAI, 
  testAI,
  createDatabase,
  createRules,
  createSchema,
  updateSchema,
  upsertDatabase,
  getAllDatabases,
  getAllAISettings,
  getRules,
  getSchema,
  switchDatabase
} from '../../../src/controllers/settingsController';

// Mock the services
vi.mock('../../../src/services/rulesService', () => ({
  getCachedRules: vi.fn(),
  upsertRulesToFile: vi.fn(),
  loadRulesFromDatabase: vi.fn(),
  upsertRulesToDatabase: vi.fn(),
  upsertSchemaToDatabase: vi.fn(),
  updateSchemaInDatabase: vi.fn()
}));

vi.mock('../../../src/services/databaseSystemService', () => ({
  __esModule: true,
  default: {
    getDefaultDatabaseConfig: vi.fn(),
    getDefaultAISettings: vi.fn(),
    upsertDatabaseConfig: vi.fn(),
    saveAISettings: vi.fn(),
    upsertAISettings: vi.fn(),
    getDatabaseConfigs: vi.fn(),
    getAISettings: vi.fn(),
    getDatabaseSchema: vi.fn(),
    switchDefaultDatabase: vi.fn()
  },
  databaseService: {
    getDefaultDatabaseConfig: vi.fn(),
    getDefaultAISettings: vi.fn(),
    upsertDatabaseConfig: vi.fn(),
    saveAISettings: vi.fn(),
    upsertAISettings: vi.fn(),
    getDatabaseConfigs: vi.fn(),
    getAISettings: vi.fn(),
    getDatabaseSchema: vi.fn(),
    switchDefaultDatabase: vi.fn()
  }
}));

vi.mock('../../../src/services/openaiService', () => ({
  __esModule: true,
  default: {
    updateConfig: vi.fn()
  }
}));

vi.mock('mysql2/promise', () => ({
  createPool: vi.fn()
}));

vi.mock('openai', () => ({
  OpenAI: vi.fn()
}));

import { getCachedRules, upsertRulesToFile, loadRulesFromDatabase, upsertRulesToDatabase, upsertSchemaToDatabase, updateSchemaInDatabase } from '../../../src/services/rulesService';
import databaseService from '../../../src/services/databaseSystemService';
import openaiService from '../../../src/services/openaiService';

const createMockRes = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  } as any as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  return res;
};

const mockRules = {
  schema: {
    users: { columns: ['id', 'name', 'email'], description: 'Users table' },
    products: { columns: ['id', 'name', 'price'], description: 'Products table' }
  },
  query_patterns: [
    {
      intent: 'find_users',
      template: 'SELECT * FROM users',
      description: 'Find all users',
      keywords: ['users', 'find']
    }
  ]
};

const mockDatabaseConfig = {
  id: 1,
  name: 'Test DB',
  host: 'localhost',
  port: 3306,
  database_name: 'testdb',
  username: 'testuser',
  password: 'testpass',
  ssl_enabled: false,
  is_active: true,
  is_default: true
};

const mockAIConfig = {
  id: 1,
  name: 'Test AI',
  enabled: true,
  apiKey: 'test-key',
  model: 'gpt-4',
  temperature: 0.3,
  maxTokens: 1000,
  is_active: true,
  is_default: true
};

describe('settingsController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should return settings with cached rules and configurations', async () => {
      vi.mocked(getCachedRules).mockResolvedValue(mockRules);
      vi.mocked(databaseService.getDefaultDatabaseConfig).mockResolvedValue(mockDatabaseConfig);
      vi.mocked(databaseService.getDefaultAISettings).mockResolvedValue(mockAIConfig);
      
      const req = {} as Request;
      const res = createMockRes();
      
      await getSettings(req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        rules: mockRules,
        database: mockDatabaseConfig,
        ai: mockAIConfig
      });
    });

    it('should return default configurations when none exist', async () => {
      vi.mocked(getCachedRules).mockResolvedValue(mockRules);
      vi.mocked(databaseService.getDefaultDatabaseConfig).mockResolvedValue(null);
      vi.mocked(databaseService.getDefaultAISettings).mockResolvedValue(null);
      
      const req = {} as Request;
      const res = createMockRes();
      
      await getSettings(req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        rules: mockRules,
        database: {
          name: 'Default',
          host: 'localhost',
          port: 3306,
          database_name: 'sakila',
          username: 'queryuser',
          password: 'querypass',
          ssl_enabled: false,
          is_active: true,
          is_default: true
        },
        ai: {
          name: 'Default',
          enabled: false,
          apiKey: '',
          model: 'gpt-4-turbo-preview',
          temperature: 0.3,
          maxTokens: 1000,
          is_active: true,
          is_default: true
        }
      });
    });

    it('should return 500 error when service fails', async () => {
      vi.mocked(getCachedRules).mockRejectedValue(new Error('Service error'));
      
      const req = {} as Request;
      const res = createMockRes();
      
      await getSettings(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch settings' });
    });
  });

  describe('updateRules', () => {
    it('should successfully update rules', async () => {
      vi.mocked(upsertRulesToDatabase).mockResolvedValue();
      
      const req = {
        body: {
          schema: mockRules.schema,
          query_patterns: mockRules.query_patterns
        }
      } as Request;
      const res = createMockRes();
      
      await updateRules(req, res);
      
      expect(upsertRulesToDatabase).toHaveBeenCalledWith({
        schema: mockRules.schema,
        query_patterns: mockRules.query_patterns
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Rules configuration updated successfully',
        patterns: 1,
        tables: 2
      });
    });

    it('should return 400 error when schema is missing', async () => {
      const req = {
        body: { query_patterns: mockRules.query_patterns }
      } as Request;
      const res = createMockRes();
      
      await updateRules(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Both schema and query_patterns are required' });
    });

    it('should return 400 error when query_patterns is not an array', async () => {
      const req = {
        body: {
          schema: mockRules.schema,
          query_patterns: 'not-an-array'
        }
      } as Request;
      const res = createMockRes();
      
      await updateRules(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'query_patterns must be an array' });
    });

    it('should return 500 error when save fails', async () => {
      vi.mocked(upsertRulesToDatabase).mockRejectedValue(new Error('Save error'));
      
      const req = {
        body: {
          schema: mockRules.schema,
          query_patterns: mockRules.query_patterns
        }
      } as Request;
      const res = createMockRes();
      
      await updateRules(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update rules configuration' });
    });
  });

  describe('updateDatabase', () => {
    it('should successfully update database configuration', async () => {
      vi.mocked(databaseService.upsertDatabaseConfig).mockResolvedValue(1);
      
      const req = {
        body: {
          name: 'New DB',
          host: 'newhost.com',
          port: '3306',
          database_name: 'newdb',
          username: 'newuser',
          password: 'newpass',
          ssl_enabled: true
        }
      } as Request;
      const res = createMockRes();
      
      await updateDatabase(req, res);
      
      expect(databaseService.upsertDatabaseConfig).toHaveBeenCalledWith({
        name: 'New DB',
        host: 'newhost.com',
        port: 3306,
        database_name: 'newdb',
        username: 'newuser',
        password: 'newpass',
        ssl_enabled: true,
        is_active: true,
        is_default: true
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Database configuration updated successfully'
      });
    });

    it('should use default values for optional fields', async () => {
      vi.mocked(databaseService.upsertDatabaseConfig).mockResolvedValue(1);
      
      const req = {
        body: {
          host: 'localhost',
          port: '3306',
          database_name: 'testdb',
          username: 'testuser'
        }
      } as Request;
      const res = createMockRes();
      
      await updateDatabase(req, res);
      
      expect(databaseService.upsertDatabaseConfig).toHaveBeenCalledWith({
        name: 'Custom Configuration',
        host: 'localhost',
        port: 3306,
        database_name: 'testdb',
        username: 'testuser',
        password: '',
        ssl_enabled: false,
        is_active: true,
        is_default: true
      });
    });

    it('should return 400 error when required fields are missing', async () => {
      const req = {
        body: { name: 'Test DB' }
      } as Request;
      const res = createMockRes();
      
      await updateDatabase(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required fields: host, port, database_name, username are required'
      });
    });

    it('should return 500 error when save fails', async () => {
      vi.mocked(databaseService.upsertDatabaseConfig).mockRejectedValue(new Error('Save error'));
      
      const req = {
        body: {
          host: 'localhost',
          port: '3306',
          database_name: 'testdb',
          username: 'testuser'
        }
      } as Request;
      const res = createMockRes();
      
      await updateDatabase(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update database configuration' });
    });
  });

  describe('testDatabase', () => {
    it('should successfully test database connection', async () => {
      const mockConnection = {
        ping: vi.fn().mockResolvedValue(undefined),
        release: vi.fn()
      };
      const mockPool = {
        getConnection: vi.fn().mockResolvedValue(mockConnection),
        end: vi.fn().mockResolvedValue(undefined)
      };
      
      vi.doMock('mysql2/promise', () => ({
        createPool: vi.fn().mockReturnValue(mockPool)
      }));
      
      const req = {
        body: {
          host: 'localhost',
          port: 3306,
          database: 'testdb',
          username: 'testuser',
          password: 'testpass',
          ssl: false
        }
      } as Request;
      const res = createMockRes();
      
      await testDatabase(req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Database connection successful'
      });
      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle connection failure', async () => {
      const mockPool = {
        getConnection: vi.fn().mockRejectedValue(new Error('Connection failed')),
        end: vi.fn().mockResolvedValue(undefined)
      };
      
      vi.doMock('mysql2/promise', () => ({
        createPool: vi.fn().mockReturnValue(mockPool)
      }));
      
      const req = {
        body: {
          host: 'localhost',
          port: 3306,
          database: 'testdb',
          username: 'testuser',
          password: 'testpass',
          ssl: false
        }
      } as Request;
      const res = createMockRes();
      
      await testDatabase(req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Connection failed: Connection failed'
      });
    });

    it('should return 500 error for unexpected errors', async () => {
      vi.doMock('mysql2/promise', () => {
        throw new Error('Module load error');
      });
      
      const req = {
        body: {
          host: 'localhost',
          port: 3306,
          database: 'testdb',
          username: 'testuser'
        }
      } as Request;
      const res = createMockRes();
      
      await testDatabase(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to test database connection'
      });
    });
  });

  describe('updateAI', () => {
    it('should successfully update AI configuration', async () => {
      vi.mocked(databaseService.saveAISettings).mockResolvedValue(1);
      vi.mocked(openaiService.updateConfig).mockImplementation(() => {});
      
      const req = {
        body: {
          name: 'Test AI',
          enabled: true,
          apiKey: 'test-key',
          model: 'gpt-4',
          temperature: 0.5,
          maxTokens: 2000
        }
      } as Request;
      const res = createMockRes();
      
      await updateAI(req, res);
      
      expect(databaseService.saveAISettings).toHaveBeenCalledWith({
        name: 'Test AI',
        enabled: true,
        apiKey: 'test-key',
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 2000,
        is_active: true,
        is_default: true
      });
      expect(openaiService.updateConfig).toHaveBeenCalledWith({
        enabled: true,
        apiKey: 'test-key',
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 2000
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'AI configuration updated successfully'
      });
    });

    it('should return 400 error when API key is missing but AI is enabled', async () => {
      const req = {
        body: {
          enabled: true,
          model: 'gpt-4',
          temperature: 0.5,
          maxTokens: 2000
        }
      } as Request;
      const res = createMockRes();
      
      await updateAI(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'API Key is required when AI is enabled' });
    });

    it('should return 400 error for invalid temperature', async () => {
      const req = {
        body: {
          enabled: true,
          apiKey: 'test-key',
          model: 'gpt-4',
          temperature: 2.0,
          maxTokens: 2000
        }
      } as Request;
      const res = createMockRes();
      
      await updateAI(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Temperature must be a number between 0 and 1' });
    });

    it('should return 400 error for invalid maxTokens', async () => {
      const req = {
        body: {
          enabled: true,
          apiKey: 'test-key',
          model: 'gpt-4',
          temperature: 0.5,
          maxTokens: 5000
        }
      } as Request;
      const res = createMockRes();
      
      await updateAI(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Max tokens must be a number between 1 and 4000' });
    });

    it('should handle disabled AI configuration', async () => {
      vi.mocked(databaseService.saveAISettings).mockResolvedValue(1);
      
      const req = {
        body: {
          enabled: false
        }
      } as Request;
      const res = createMockRes();
      
      await updateAI(req, res);
      
      expect(databaseService.saveAISettings).toHaveBeenCalledWith({
        name: 'Custom Configuration',
        enabled: false,
        apiKey: undefined,
        model: undefined,
        temperature: undefined,
        maxTokens: undefined,
        is_active: true,
        is_default: true
      });
      expect(openaiService.updateConfig).not.toHaveBeenCalled();
    });
  });

  describe('testAI', () => {
    it('should successfully test AI connection', async () => {
      const mockOpenAI = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({ choices: [{ message: { content: 'Test' } }] })
          }
        }
      };
      
      vi.doMock('openai', () => ({
        OpenAI: vi.fn().mockImplementation(() => mockOpenAI)
      }));
      
      const req = {
        body: {
          enabled: true,
          apiKey: 'test-key',
          model: 'gpt-4'
        }
      } as Request;
      const res = createMockRes();
      
      await testAI(req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'AI connection successful'
      });
    });

    it('should return error when AI is disabled', async () => {
      const req = {
        body: { enabled: false }
      } as Request;
      const res = createMockRes();
      
      await testAI(req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'AI is disabled in configuration'
      });
    });

    it('should return error when API key is missing', async () => {
      const req = {
        body: { enabled: true }
      } as Request;
      const res = createMockRes();
      
      await testAI(req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'API Key is required for testing'
      });
    });

    it('should handle AI connection failure', async () => {
      const mockOpenAI = {
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error('Invalid API key'))
          }
        }
      };
      
      vi.doMock('openai', () => ({
        OpenAI: vi.fn().mockImplementation(() => mockOpenAI)
      }));
      
      const req = {
        body: {
          enabled: true,
          apiKey: 'invalid-key',
          model: 'gpt-4'
        }
      } as Request;
      const res = createMockRes();
      
      await testAI(req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'AI connection failed: Invalid API key'
      });
    });
  });

  describe('New CRUD endpoints', () => {
    describe('createDatabase', () => {
      it('should successfully create database configuration', async () => {
        vi.mocked(databaseService.upsertDatabaseConfig).mockResolvedValue(1);
        
        const req = {
          body: {
            name: 'New DB',
            host: 'localhost',
            port: '3306',
            database_name: 'newdb',
            username: 'user'
          }
        } as Request;
        const res = createMockRes();
        
        await createDatabase(req, res);
        
        expect(databaseService.upsertDatabaseConfig).toHaveBeenCalledWith({
          name: 'New DB',
          host: 'localhost',
          port: 3306,
          database_name: 'newdb',
          username: 'user',
          password: '',
          ssl_enabled: false,
          is_active: true,
          is_default: true
        });
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: 'Database configuration created successfully'
        });
      });
    });

    describe('getAllDatabases', () => {
      it('should return all database configurations', async () => {
        const mockDatabases = [mockDatabaseConfig, { ...mockDatabaseConfig, id: 2, name: 'DB2' }];
        vi.mocked(databaseService.getDatabaseConfigs).mockResolvedValue(mockDatabases);
        
        const req = {} as Request;
        const res = createMockRes();
        
        await getAllDatabases(req, res);
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          data: mockDatabases
        });
      });
    });

    describe('getRules', () => {
      it('should return rules from database', async () => {
        vi.mocked(loadRulesFromDatabase).mockResolvedValue(mockRules);
        
        const req = {} as Request;
        const res = createMockRes();
        
        await getRules(req, res);
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          data: mockRules
        });
      });

      it('should return 404 when no rules found', async () => {
        vi.mocked(loadRulesFromDatabase).mockResolvedValue(null);
        
        const req = {} as Request;
        const res = createMockRes();
        
        await getRules(req, res);
        
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'No rules configuration found' });
      });
    });

    describe('createSchema', () => {
      it('should successfully create schema', async () => {
        vi.mocked(upsertSchemaToDatabase).mockResolvedValue();
        
        const req = {
          body: {
            schema: mockRules.schema
          }
        } as Request;
        const res = createMockRes();
        
        await createSchema(req, res);
        
        expect(upsertSchemaToDatabase).toHaveBeenCalledWith(mockRules.schema);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: 'Schema configuration created successfully',
          tables: 2
        });
      });

      it('should return 400 when schema is missing', async () => {
        const req = { body: {} } as Request;
        const res = createMockRes();
        
        await createSchema(req, res);
        
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Schema is required and must be an object' });
      });
    });

    describe('switchDatabase', () => {
      it('should successfully switch default database', async () => {
        vi.mocked(databaseService.switchDefaultDatabase).mockResolvedValue(true);
        
        const req = {
          params: { databaseId: '2' }
        } as any as Request;
        const res = createMockRes();
        
        await switchDatabase(req, res);
        
        expect(databaseService.switchDefaultDatabase).toHaveBeenCalledWith(2);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: 'Default database switched successfully'
        });
      });

      it('should return 400 for invalid database ID', async () => {
        const req = {
          params: { databaseId: 'invalid' }
        } as any as Request;
        const res = createMockRes();
        
        await switchDatabase(req, res);
        
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Valid database ID is required' });
      });
    });
  });
});
