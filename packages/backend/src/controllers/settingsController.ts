import { Request, Response } from 'express';
import openaiService, { AIConfig } from '../services/openaiService';
import databaseService, { DatabaseConfig, AISettingsDB } from '../services/databaseSystemService';
import { getCachedRules, saveRulesToFile } from '../services/rulesService';

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

export const updateRules = async (req: Request, res: Response) => {
  try {
    const { schema, query_patterns } = req.body;
    if (!schema || !query_patterns) return res.status(400).json({ error: 'Both schema and query_patterns are required' });
    if (!Array.isArray(query_patterns)) return res.status(400).json({ error: 'query_patterns must be an array' });
    await saveRulesToFile({ schema, query_patterns });
    return res.json({ success: true, message: 'Rules configuration updated successfully', patterns: query_patterns.length, tables: Object.keys(schema).length });
  } catch {
    return res.status(500).json({ error: 'Failed to update rules configuration' });
  }
};

export const updateDatabase = async (req: Request, res: Response) => {
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
    await databaseService.saveDatabaseConfig(dbConfig);
    return res.json({ success: true, message: 'Database configuration updated successfully' });
  } catch {
    return res.status(500).json({ error: 'Failed to update database configuration' });
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
  } catch {
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
