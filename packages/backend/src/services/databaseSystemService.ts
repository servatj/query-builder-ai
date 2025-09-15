import mysql from 'mysql2/promise';
import { AIConfig } from './openaiService';

export interface DatabaseConfig {
  id?: number;
  name: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  password: string;
  ssl_enabled: boolean;
  is_active: boolean;
  is_default: boolean;
}

export interface AISettingsDB extends AIConfig {
  id?: number;
  name: string;
  is_active: boolean;
  is_default: boolean;
}

export interface AppSetting {
  id?: number;
  setting_key: string;
  setting_value: string;
  setting_type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  is_system: boolean;
}

class DatabaseSystemService {
  private pool: mysql.Pool;

  constructor(pool: mysql.Pool) {
    if (!pool) {
      throw new Error('Pool is required for DatabaseSystemService');
    }
    this.pool = pool;
    console.log('✅ DatabaseSystemService initialized with provided pool');
  }

  private async getConnection(): Promise<mysql.PoolConnection> {
    return await this.pool.getConnection();
  }

  // Database Configuration Methods
  async getDatabaseConfigs(): Promise<DatabaseConfig[]> {
    const connection = await this.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM database_settings WHERE is_active = 1 ORDER BY is_default DESC, name ASC'
      );
      return rows as DatabaseConfig[];
    } finally {
      connection.release();
    }
  }

  async getDefaultDatabaseConfig(): Promise<DatabaseConfig | null> {
    const connection = await this.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM database_settings WHERE is_default = 1 AND is_active = 1 LIMIT 1'
      );
      const dbRows = rows as DatabaseConfig[];
      
      return dbRows.length > 0 ? dbRows[0] : null;
    } finally {
      connection.release();
    }
  }


  async saveDatabaseConfig(config: Omit<DatabaseConfig, 'id'>): Promise<number> {
    const connection = await this.getConnection();
    try {
      await connection.beginTransaction();

      // If this is set as default, remove default from others
      if (config.is_default) {
        await connection.execute(
          'UPDATE database_settings SET is_default = 0 WHERE name != ?',
          [config.name]
        );
      }

      const [result] = await connection.execute(
        `INSERT INTO database_settings 
         (name, host, port, database_name, username, password, ssl_enabled, is_active, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         host = VALUES(host), port = VALUES(port), database_name = VALUES(database_name),
         username = VALUES(username), password = VALUES(password), ssl_enabled = VALUES(ssl_enabled),
         is_active = VALUES(is_active), is_default = VALUES(is_default)`,
        [
          config.name, config.host, config.port, config.database_name,
          config.username, config.password, config.ssl_enabled, 
          config.is_active, config.is_default
        ]
      );
      const insertResult = result as mysql.ResultSetHeader;

      await connection.commit();
      return insertResult.insertId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // AI Settings Methods
  async getAISettings(): Promise<AISettingsDB[]> {
    const connection = await this.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM ai_settings WHERE is_active = 1 ORDER BY is_default DESC, name ASC'
      );
      return rows as AISettingsDB[];
    } finally {
      connection.release();
    }
  }

  async getDefaultAISettings(): Promise<AISettingsDB | null> {
    const connection = await this.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM ai_settings WHERE is_default = 1 AND is_active = 1 LIMIT 1'
      );
      const aiRows = rows as AISettingsDB[];
      
      return aiRows.length > 0 ? aiRows[0] : null;
    } finally {
      connection.release();
    }
  }

  async saveAISettings(settings: Omit<AISettingsDB, 'id'>): Promise<number> {
    const connection = await this.getConnection();
    try {
      await connection.beginTransaction();

      // If this is set as default, remove default from others
      if (settings.is_default) {
        await connection.execute(
          'UPDATE ai_settings SET is_default = 0 WHERE name != ?',
          [settings.name]
        );
      }

      const [result] = await connection.execute(
        `INSERT INTO ai_settings 
         (name, enabled, api_key, model, temperature, max_tokens, is_active, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         enabled = VALUES(enabled), api_key = VALUES(api_key), model = VALUES(model),
         temperature = VALUES(temperature), max_tokens = VALUES(max_tokens),
         is_active = VALUES(is_active), is_default = VALUES(is_default)`,
        [
          settings.name, settings.enabled, settings.apiKey, settings.model,
          settings.temperature, settings.maxTokens, settings.is_active, settings.is_default
        ]
      );
      const insertResult = result as mysql.ResultSetHeader;

      await connection.commit();
      return insertResult.insertId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // App Settings Methods
  async getAppSetting(key: string): Promise<string | null> {
    const connection = await this.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1',
        [key]
      );
      const settingRows = rows as AppSetting[];
      
      return settingRows.length > 0 ? settingRows[0].setting_value : null;
    } finally {
      connection.release();
    }
  }

  async setAppSetting(key: string, value: string, type: AppSetting['setting_type'] = 'string', description?: string): Promise<void> {
    const connection = await this.getConnection();
    try {
      await connection.execute(
        `INSERT INTO app_settings (setting_key, setting_value, setting_type, description, is_system)
         VALUES (?, ?, ?, ?, 0)
         ON DUPLICATE KEY UPDATE
         setting_value = VALUES(setting_value), setting_type = VALUES(setting_type),
         description = VALUES(description)`,
        [key, value, type, description || null]
      );
    } finally {
      connection.release();
    }
  }

  async getAllAppSettings(): Promise<AppSetting[]> {
    const connection = await this.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM app_settings ORDER BY is_system DESC, setting_key ASC'
      );
      return rows as AppSetting[];
    } finally {
      connection.release();
    }
  }

  // Query Logging (optional)
  async logQuery(data: {
    natural_language_query: string;
    generated_sql?: string;
    execution_status: 'success' | 'validation_error' | 'execution_error';
    confidence_score?: number;
    execution_time_ms?: number;
    error_message?: string;
    user_session?: string;
    ip_address?: string;
  }): Promise<void> {
    // Only log if logging is enabled
    const loggingEnabled = await this.getAppSetting('enable_query_logging');
    if (loggingEnabled !== 'true') {
      return;
    }

    const connection = await this.getConnection();
    try {
      await connection.execute(
        `INSERT INTO query_logs 
         (natural_language_query, generated_sql, execution_status, confidence_score, 
          execution_time_ms, error_message, user_session, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.natural_language_query, data.generated_sql, data.execution_status,
          data.confidence_score, data.execution_time_ms, data.error_message,
          data.user_session, data.ip_address
        ]
      );
    } catch (error) {
      // Don't throw errors for logging failures
      console.warn('Failed to log query:', error);
    } finally {
      connection.release();
    }
  }

  // Test database connection
  async testConnection(): Promise<boolean> {
    try {
      const connection = await this.getConnection();
      await connection.ping();
      connection.release();
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

}

export default DatabaseSystemService;
