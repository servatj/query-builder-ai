import { Request, Response } from 'express';
import openaiService, { AIConfig } from '../services/openaiService';
import databaseService, { DatabaseConfig, AISettingsDB } from '../services/databaseSystemService';
import { getCachedRules, upsertRulesToDatabase, upsertSchemaToDatabase, updateSchemaInDatabase, loadRulesFromDatabase, loadSchemaFromDatabase, clearCachedRules } from '../services/rulesService';
import { recreateDestinationPool } from '../index';


export const getSettings = async (_req: Request, res: Response) => {
  try {
    const rules = await getCachedRules();
    const defaultDbConfig = await databaseService.getDefaultDatabaseConfig();
    const defaultAiConfig = await databaseService.getDefaultAISettings();
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
      ai: defaultAiConfig || {
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
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

export const upsertDatabase = async (req: Request, res: Response) => {
  try {
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
    const { name, enabled, apiKey, model, temperature, maxTokens } = req.body as any;
    if (enabled && !apiKey) return res.status(400).json({ error: 'API Key is required when AI is enabled' });
    if (enabled) {
      if (!model || typeof model !== 'string') return res.status(400).json({ error: 'Model is required and must be a string' });
      if (typeof temperature !== 'number' || temperature < 0 || temperature > 1) return res.status(400).json({ error: 'Temperature must be a number between 0 and 1' });
      if (typeof maxTokens !== 'number' || maxTokens < 1 || maxTokens > 4000) return res.status(400).json({ error: 'Max tokens must be a number between 1 and 4000' });
    }
    const aiSettings: Omit<AISettingsDB, 'id'> = { name: name || 'Custom Configuration', enabled, apiKey, model, temperature, maxTokens, is_active: true, is_default: true };
    await databaseService.saveAISettings(aiSettings);
    if (enabled && apiKey) {
      try {
        const aiConfig: AIConfig = { enabled, apiKey, model, temperature, maxTokens };
        openaiService.updateConfig(aiConfig);
      } catch {
        // ignore update failures
      }
    }
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
    return res.json({ success: true, data: databases });
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
    if (!rules) {
      return res.status(404).json({ error: 'No rules configuration found' });
    }
    return res.json({ success: true, data: rules });
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
