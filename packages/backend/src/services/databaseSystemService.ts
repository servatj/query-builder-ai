import mysql, { RowDataPacket } from 'mysql2/promise';
import { AIConfig } from './openaiService';

interface DatabaseConfig {
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

interface AISettingsDB extends AIConfig {
  id?: number;
  name: string;
  is_active: boolean;
  is_default: boolean;
}

interface AppSetting {
  id?: number;
  setting_key: string;
  setting_value: string;
  setting_type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  is_system: boolean;
}

class DatabaseSystemService {
  private pool: mysql.Pool | null = null;
  private settingsDbUrl: string;

  constructor() {
    // Connection to the query_builder database for settings storage
    this.settingsDbUrl = process.env.SETTINGS_DATABASE_URL || 
      'mysql://queryuser:querypass@localhost:3306/query_builder';
    
    this.initializePool();
  }

  private async initializePool() {
    try {
      this.pool = mysql.createPool(this.settingsDbUrl);
      console.log('✅ Database service initialized for settings storage');
    } catch (error) {
      console.error('❌ Failed to initialize settings database pool:', error);
      this.pool = null;
    }
  }

  private async getConnection(): Promise<mysql.PoolConnection> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }
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


  async upsertDatabaseConfig(config: Omit<DatabaseConfig, 'id'>): Promise<number> {
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
      
      // Initialize blank schema for new database configurations
      const wasInsert = insertResult.affectedRows === 1 && insertResult.insertId > 0;
      if (wasInsert) {
        await this.initializeBlankSchema(insertResult.insertId);
      }
      
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

  async upsertAISettings(settings: Omit<AISettingsDB, 'id'>): Promise<number> {
    return this.saveAISettings(settings);
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

  // Switch default database configuration
  async switchDefaultDatabase(databaseId: number): Promise<boolean> {
    const connection = await this.getConnection();
    try {
      await connection.beginTransaction();

      // First, verify the target database exists and is active
      const [targetRows] = await connection.execute(
        'SELECT id, name FROM database_settings WHERE id = ? AND is_active = 1',
        [databaseId]
      );
      const targetDbs = targetRows as DatabaseConfig[];
      
      if (targetDbs.length === 0) {
        throw new Error('Target database configuration not found or inactive');
      }

      // Clear all default flags
      await connection.execute(
        'UPDATE database_settings SET is_default = 0 WHERE is_default = 1'
      );

      // Set the target database as default
      await connection.execute(
        'UPDATE database_settings SET is_default = 1 WHERE id = ?',
        [databaseId]
      );

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('Failed to switch default database:', error);
      return false;
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

  // Get schema from the active database
  async getDatabaseSchema(): Promise<Record<string, { columns: string[]; description: string }>> {
    try {
      const defaultConfig = await this.getDefaultDatabaseConfig();
      if (!defaultConfig) {
        throw new Error('No default database configuration found');
      }

      // First check if we have a stored schema configuration
      const settingsConnection = await this.getConnection();
      try {
        const [rows] = await settingsConnection.execute(
          'SELECT schema_json FROM database_config_files WHERE database_settings_id = ?',
          [defaultConfig.id]
        );
        const configRows = rows as any[];
        
        if (configRows.length > 0 && configRows[0].schema_json) {
          const storedSchema = configRows[0].schema_json;
          // If we have a stored schema (including blank {}), use it
          return storedSchema;
        }
      } finally {
        settingsConnection.release();
      }

      // Fallback: introspect database schema only if no stored schema exists
      // Create a temporary connection to the target database
      const poolConfig: any = {
        host: defaultConfig.host,
        port: defaultConfig.port,
        user: defaultConfig.username,
        password: defaultConfig.password,
        database: defaultConfig.database_name,
        waitForConnections: true,
        connectionLimit: 1,
        queueLimit: 0
      };

      // Only add SSL config if enabled
      if (defaultConfig.ssl_enabled) {
        poolConfig.ssl = {};
      }

      const targetPool = mysql.createPool(poolConfig);

      const connection = await targetPool.getConnection();
      
      try {
        // Get all tables in the database
        const [tables] = await connection.query<RowDataPacket[]>(
          'SELECT TABLE_NAME, TABLE_COMMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = "BASE TABLE"',
          [defaultConfig.database_name]
        );

        const schema: Record<string, { columns: string[]; description: string }> = {};

        // Get columns for each table
        for (const table of tables as any[]) {
          const tableName = table.TABLE_NAME as string;
          
          const [columns] = await connection.query<RowDataPacket[]>(
            'SELECT COLUMN_NAME, COLUMN_COMMENT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION',
            [defaultConfig.database_name, tableName]
          );

          const columnNames = (columns as any[]).map((col) => col.COLUMN_NAME as string);
          const tableComment = ((table.TABLE_COMMENT as string) || '').trim();
          
          schema[tableName] = {
            columns: columnNames,
            description: tableComment || `Table ${tableName}`
          };
        }

        return schema;
      } finally {
        connection.release();
        await targetPool.end();
      }
    } catch (error) {
      console.error('Failed to get database schema:', error);
      return {};
    }
  }

  // Get foreign key relationships from the active database
  async getDatabaseRelationships(): Promise<
    Array<{ from: string; fromColumn: string; to: string; toColumn: string }>
  > {
    try {
      const defaultConfig = await this.getDefaultDatabaseConfig();
      if (!defaultConfig) {
        throw new Error('No default database configuration found');
      }

      const poolConfig: any = {
        host: defaultConfig.host,
        port: defaultConfig.port,
        user: defaultConfig.username,
        password: defaultConfig.password,
        database: defaultConfig.database_name,
        waitForConnections: true,
        connectionLimit: 1,
        queueLimit: 0
      };

      if (defaultConfig.ssl_enabled) {
        poolConfig.ssl = {};
      }

      const targetPool = mysql.createPool(poolConfig);
      const connection = await targetPool.getConnection();
      try {
        const [rows] = await connection.query<RowDataPacket[]>(
          `SELECT TABLE_NAME as from_table, COLUMN_NAME as from_column,
                  REFERENCED_TABLE_NAME as to_table, REFERENCED_COLUMN_NAME as to_column
             FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
            ORDER BY TABLE_NAME, COLUMN_NAME`,
          [defaultConfig.database_name]
        );

        const results = (rows as any[]).map((r) => ({
          from: r.from_table as string,
          fromColumn: r.from_column as string,
          to: r.to_table as string,
          toColumn: (r.to_column as string) || 'id'
        }));

        return results;
      } finally {
        connection.release();
        await targetPool.end();
      }
    } catch (error) {
      console.error('Failed to get database relationships:', error);
      return [];
    }
  }

  // Initialize blank schema for newly created database configurations
  private async initializeBlankSchema(databaseSettingsId: number): Promise<void> {
    const connection = await this.getConnection();
    try {
      // Insert blank schema configuration
      await connection.execute(
        `INSERT INTO database_config_files (database_settings_id, schema_json, rules_json) 
         VALUES (?, '{}', '{"schema": {}, "query_patterns": []}')`,
        [databaseSettingsId]
      );
    } catch (error) {
      console.warn('Failed to initialize blank schema for new database:', error);
      // Don't throw error - this is not critical for database config creation
    } finally {
      connection.release();
    }
  }

  // Close the pool
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseSystemService();
export default databaseService;
export type { DatabaseConfig, AISettingsDB, AppSetting };
