import { Request, Response } from 'express';
import aiService, { AIServiceConfig } from '../services/aiService';
import databaseService, { DatabaseConfig, AISettingsDB } from '../services/databaseSystemService';
import { getCachedRules, upsertRulesToDatabase, upsertSchemaToDatabase, updateSchemaInDatabase, loadRulesFromDatabase, loadSchemaFromDatabase, clearCachedRules } from '../services/rulesService';
import { recreateDestinationPool } from '../index';
import { requireNonSandboxMode, getSandboxStatus } from '../utils/sandbox';


export const getSettings = async (_req: Request, res: Response) => {
  try {
    const rules = await getCachedRules();
    const defaultDbConfig = await databaseService.getDefaultDatabaseConfig();
    const defaultAiConfig = await databaseService.getDefaultAISettings();
    const sandboxStatus = getSandboxStatus();
    
    // Transform AI config to include provider field
    const aiConfig = defaultAiConfig || {
      name: 'Default',
      enabled: false,
      apiKey: '',
      model: 'gpt-4-turbo-preview',
      temperature: 0.3,
      maxTokens: 1000,
      is_active: true,
      is_default: true
    };

    // Add provider field based on model or determine from config
    const provider = aiConfig.model?.includes('claude') || aiConfig.model?.includes('anthropic') ? 'anthropic' : 
                    aiConfig.model?.includes('gpt') || aiConfig.model?.includes('openai') ? 'openai' : 'anthropic';

    return res.json({
      rules,
      database: defaultDbConfig || {
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
        ...aiConfig,
        provider,
        enabled: Boolean(aiConfig.enabled)
      },
      ...sandboxStatus
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

export const upsertDatabase = async (req: Request, res: Response) => {
  try {
    requireNonSandboxMode();
    const { name, host, port, database_name, username, password, ssl_enabled } = req.body;
    if (!host || !port || !database_name || !username) {
      return res.status(400).json({ error: 'Missing required fields: host, port, database_name, username are required' });
    }
    const dbConfig: Omit<DatabaseConfig, 'id'> = {
      name: name || 'Custom Configuration',
      host,
      port: parseInt(port),
      database_name,
      username,
      password: password || '',
      ssl_enabled: ssl_enabled || false,
      is_active: true,
      is_default: true
    };
    await databaseService.upsertDatabaseConfig(dbConfig);
    return res.json({ success: true, message: 'Database configuration created successfully' });
  } catch (error) {
    console.error('Failed to upsert database config:', error);
    return res.status(500).json({ error: 'Failed to create database configuration' });
  }
};


export const createSchema = async (req: Request, res: Response) => {
  try {
    requireNonSandboxMode();
    const { schema } = req.body;
    if (!schema || typeof schema !== 'object') {
      return res.status(400).json({ error: 'Schema is required and must be an object' });
    }
    await upsertSchemaToDatabase(schema);
    return res.json({ success: true, message: 'Schema configuration created successfully', tables: Object.keys(schema).length });
  } catch (error) {
    console.error('Failed to create schema config:', error);
    return res.status(500).json({ error: 'Failed to create schema configuration' });
  }
};

export const updateSchema = async (req: Request, res: Response) => {
  try {
    requireNonSandboxMode();
    const { schema } = req.body;
    if (!schema || typeof schema !== 'object') {
      return res.status(400).json({ error: 'Schema is required and must be an object' });
    }
    await updateSchemaInDatabase(schema);
    return res.json({ success: true, message: 'Schema configuration updated successfully', tables: Object.keys(schema).length });
  } catch (error) {
    console.error('Failed to update schema config:', error);
    return res.status(500).json({ error: 'Failed to update schema configuration' });
  }
};

export const createRules = async (req: Request, res: Response) => {
  try {
    requireNonSandboxMode();
    const { schema, query_patterns } = req.body;
    if (!schema || !query_patterns || !Array.isArray(query_patterns)) {
      return res.status(400).json({ error: 'Both schema and query_patterns (array) are required' });
    }
    await upsertRulesToDatabase({ schema, query_patterns });
    return res.json({ success: true, message: 'Rules configuration created successfully', patterns: query_patterns.length, tables: Object.keys(schema).length });
  } catch (error) {
    console.error('Failed to create rules config:', error);
    return res.status(500).json({ error: 'Failed to create rules configuration' });
  }
};

export const updateRules = async (req: Request, res: Response) => {
  try {
    requireNonSandboxMode();
    const { schema, query_patterns } = req.body;
    if (!schema || !query_patterns) return res.status(400).json({ error: 'Both schema and query_patterns are required' });
    if (!Array.isArray(query_patterns)) return res.status(400).json({ error: 'query_patterns must be an array' });
    await upsertRulesToDatabase({ schema, query_patterns });
    return res.json({ success: true, message: 'Rules configuration updated successfully', patterns: query_patterns.length, tables: Object.keys(schema).length });
  } catch (error) {
    console.error('Failed to update rules config:', error);
    return res.status(500).json({ error: 'Failed to update rules configuration' });
  }
};

export const updateDatabase = async (req: Request, res: Response) => {
  try {
    requireNonSandboxMode();
    const { name, host, port, database_name, username, password, ssl_enabled } = req.body;
    if (!host || !port || !database_name || !username) {
      return res.status(400).json({ error: 'Missing required fields: host, port, database_name, username are required' });
    }
    const dbConfig: Omit<DatabaseConfig, 'id'> = {
      name: name || 'Custom Configuration',
      host,
      port: parseInt(port),
      database_name,
      username,
      password: password || '',
      ssl_enabled: ssl_enabled || false,
      is_active: true,
      is_default: true
    };
    await databaseService.upsertDatabaseConfig(dbConfig);
    return res.json({ success: true, message: 'Database configuration updated successfully' });
  } catch (error) {
    console.error('Failed to update database config:', error);
    return res.status(500).json({ error: 'Failed to update database configuration' });
  }
};


export const createDatabase = async (req: Request, res: Response) => {
  try {
    requireNonSandboxMode();
    const { name, host, port, database_name, username, password, ssl_enabled } = req.body;
    if (!host || !port || !database_name || !username) return res.status(400).json({ error: 'Missing required fields: host, port, database_name, username are required' });
    const dbConfig: Omit<DatabaseConfig, 'id'> = {
      name: name || 'Custom Configuration',
      host,
      port: parseInt(port),
      database_name,
      username,
      password: password || '',
      ssl_enabled: ssl_enabled || false,
      is_active: true,
      is_default: true
    };
    await databaseService.upsertDatabaseConfig(dbConfig);
    return res.json({ success: true, message: 'Database configuration created successfully' });
  } catch (error) {
    console.error('Failed to create database config:', error);
    return res.status(500).json({ error: 'Failed to create database configuration' });
  }
};

export const testDatabase = async (req: Request, res: Response) => {
  try {
    const { host, port, database, username, password, ssl } = req.body;
    const connectionUrl = `mysql://${username}:${password || ''}@${host}:${port}/${database}${ssl ? '?ssl=true' : ''}`;
    const mysql = await import('mysql2/promise');
    let testPool: any = null;
    try {
      testPool = mysql.createPool(connectionUrl);
      const connection = await testPool.getConnection();
      await connection.ping();
      connection.release();
      return res.json({ success: true, message: 'Database connection successful' });
    } catch (dbError: any) {
      return res.json({ success: false, error: `Connection failed: ${dbError.message}` });
    } finally {
      if (testPool) await testPool.end();
    }
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to test database connection' });
  }
};

export const updateAI = async (req: Request, res: Response) => {
  try {
    requireNonSandboxMode();
    const { name, enabled, apiKey, model, temperature, maxTokens } = req.body as any;
    if (enabled && !apiKey) return res.status(400).json({ error: 'API Key is required when AI is enabled' });
    if (enabled) {
      if (!model || typeof model !== 'string') return res.status(400).json({ error: 'Model is required and must be a string' });
      if (typeof temperature !== 'number' || temperature < 0 || temperature > 1) return res.status(400).json({ error: 'Temperature must be a number between 0 and 1' });
      if (typeof maxTokens !== 'number' || maxTokens < 1 || maxTokens > 4000) return res.status(400).json({ error: 'Max tokens must be a number between 1 and 4000' });
    }
    const aiSettings: Omit<AISettingsDB, 'id'> = { name: name || 'Custom Configuration', enabled, apiKey, model, temperature, maxTokens, is_active: true, is_default: true };
    await databaseService.saveAISettings(aiSettings);
    // Note: Legacy updateAI endpoint - use updateAIConfig for unified AI service
    return res.json({ success: true, message: 'AI configuration updated successfully' });
  } catch (error) {
    console.error('Failed to update AI config:', error);
    return res.status(500).json({ error: 'Failed to update AI configuration' });
  }
};

export const testAI = async (req: Request, res: Response) => {
  try {
    const { enabled, apiKey, model } = req.body as any;
    if (!enabled) return res.json({ success: false, error: 'AI is disabled in configuration' });
    if (!apiKey) return res.json({ success: false, error: 'API Key is required for testing' });
    try {
      const { OpenAI } = await import('openai');
      const testClient = new OpenAI({ apiKey });
      await testClient.chat.completions.create({ model: model || 'gpt-3.5-turbo', messages: [{ role: 'user', content: 'Test connection' }], max_tokens: 5 });
      return res.json({ success: true, message: 'AI connection successful' });
    } catch (aiError: any) {
      return res.json({ success: false, error: `AI connection failed: ${aiError.message}` });
    }
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to test AI connection' });
  }
};

// Additional CRUD endpoints

export const getAllDatabases = async (_req: Request, res: Response) => {
  try {
    const databases = await databaseService.getDatabaseConfigs();
    // Mask passwords for security
    const maskedDatabases = databases.map(db => ({
      ...db,
      password: db.password ? '********' : ''
    }));
    return res.json({ success: true, data: maskedDatabases });
  } catch (error) {
    console.error('Failed to get databases:', error);
    return res.status(500).json({ error: 'Failed to fetch database configurations' });
  }
};

export const getAllAISettings = async (_req: Request, res: Response) => {
  try {
    const aiSettings = await databaseService.getAISettings();
    return res.json({ success: true, data: aiSettings });
  } catch (error) {
    console.error('Failed to get AI settings:', error);
    return res.status(500).json({ error: 'Failed to fetch AI configurations' });
  }
};

export const getRules = async (_req: Request, res: Response) => {
  try {
    const rules = await loadRulesFromDatabase();
    // Return success with empty rules if none found
    return res.json({ 
      success: true, 
      data: rules || { 
        schema: {}, 
        query_patterns: [] 
      } 
    });
  } catch (error) {
    console.error('Failed to get rules:', error);
    return res.status(500).json({ error: 'Failed to fetch rules configuration' });
  }
};

export const getSchema = async (_req: Request, res: Response) => {
  try {
    // First try to load schema from database config files
    const schema = await loadSchemaFromDatabase();
    if (schema) {
      return res.json({ success: true, data: schema });
    }
    
    // Fallback to database system service if no schema found
    const fallbackSchema = await databaseService.getDatabaseSchema();
    return res.json({ success: true, data: fallbackSchema });
  } catch (error) {
    console.error('Failed to get schema:', error);
    return res.status(500).json({ error: 'Failed to fetch schema configuration' });
  }
};

export const switchDatabase = async (req: Request, res: Response) => {
  try {
    requireNonSandboxMode();
    const { databaseId } = req.params;
    if (!databaseId || isNaN(parseInt(databaseId))) {
      return res.status(400).json({ error: 'Valid database ID is required' });
    }
    
    const success = await databaseService.switchDefaultDatabase(parseInt(databaseId));
    if (success) {
      // Clear cached rules so they reload from the new database
      clearCachedRules();
      
      // Recreate destination pool to connect to the new database
      const poolRecreated = await recreateDestinationPool();
      if (!poolRecreated) {
        console.warn('Failed to recreate destination pool after database switch');
      }
      
      // Get the new database configuration
      const newDbConfig = await databaseService.getDefaultDatabaseConfig();
      
      return res.json({ 
        success: true, 
        message: 'Default database switched successfully',
        database: newDbConfig
      });
    } else {
      return res.status(400).json({ error: 'Failed to switch database - database may not exist or be inactive' });
    }
  } catch (error) {
    console.error('Failed to switch database:', error);
    return res.status(500).json({ error: 'Failed to switch default database' });
  }
};

// AI Provider Management
export const getAIConfig = async (_req: Request, res: Response) => {
  try {
    const config = aiService.getConfig();
    return res.json({ 
      success: true, 
      data: {
        ...config,
        available_models: {
          openai: aiService.getAvailableModels('openai'),
          anthropic: aiService.getAvailableModels('anthropic')
        }
      }
    });
  } catch (error) {
    console.error('Failed to get AI config:', error);
    return res.status(500).json({ error: 'Failed to fetch AI configuration' });
  }
};

export const updateAIProvider = async (req: Request, res: Response) => {
  try {
    requireNonSandboxMode();
    const { provider } = req.body as { provider: 'openai' | 'anthropic' };
    
    if (!provider || (provider !== 'openai' && provider !== 'anthropic')) {
      return res.status(400).json({ error: 'Valid provider is required (openai or anthropic)' });
    }
    
    aiService.setProvider(provider);
    
    return res.json({ 
      success: true, 
      message: `AI provider switched to ${provider}`,
      provider: aiService.getProvider(),
      enabled: aiService.enabled
    });
  } catch (error) {
    console.error('Failed to update AI provider:', error);
    return res.status(500).json({ error: 'Failed to update AI provider' });
  }
};

export const updateAIConfig = async (req: Request, res: Response) => {
  try {
    requireNonSandboxMode();
    const config = req.body as Partial<AIServiceConfig>;
    
    if (!config) {
      return res.status(400).json({ error: 'Configuration is required' });
    }
    
    aiService.updateConfig(config as AIServiceConfig);
    
    return res.json({ 
      success: true, 
      message: 'AI configuration updated successfully',
      provider: aiService.getProvider(),
      enabled: aiService.enabled
    });
  } catch (error) {
    console.error('Failed to update AI config:', error);
    return res.status(500).json({ error: 'Failed to update AI configuration' });
  }
};

export const testAIConnection = async (_req: Request, res: Response) => {
  try {
    const success = await aiService.testConnection();
    
    if (success) {
      return res.json({ 
        success: true, 
        message: `${aiService.getProvider()} connection successful`,
        provider: aiService.getProvider()
      });
    } else {
      return res.json({ 
        success: false, 
        error: `${aiService.getProvider()} connection failed`,
        provider: aiService.getProvider()
      });
    }
  } catch (error: any) {
    console.error('AI connection test failed:', error);
    return res.json({ 
      success: false, 
      error: `Connection test failed: ${error.message}`,
      provider: aiService.getProvider()
    });
  }
};
