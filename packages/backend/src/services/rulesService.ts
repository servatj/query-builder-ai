import path from 'path';
import fs from 'fs/promises';
import { databaseService } from './databaseSystemService';

export interface QueryPattern {
  intent: string;
  template: string;
  description: string;
  keywords: string[];
  examples?: string[];
}

export interface Rules {
  schema: Record<string, { columns: string[]; description: string }>;
  query_patterns: QueryPattern[];
}

let cachedRules: Rules | null = null;

export const loadRulesFromFile = async (): Promise<Rules> => {
  if (cachedRules !== null) return cachedRules as Rules;
  
  try {
    const rules = await loadRulesFromDatabase();
    if (rules) {
      cachedRules = rules;
      return cachedRules;
    }
  } catch (error) {
    console.warn('Failed to load rules from database, falling back to file:', error);
  }
  
  const rulesPath = path.join(__dirname, '..', 'rules.json');
  const rulesFile = await fs.readFile(rulesPath, 'utf-8');
  cachedRules = JSON.parse(rulesFile);
  return cachedRules as Rules;
};

export const upsertRulesToFile = async (rules: Rules): Promise<void> => {
  try {
    await upsertRulesToDatabase(rules);
    cachedRules = rules;
  } catch (error) {
    console.warn('Failed to upsert rules to database, falling back to file:', error);
    const rulesPath = path.join(__dirname, '..', 'rules.json');
    await fs.writeFile(rulesPath, JSON.stringify(rules, null, 2), 'utf-8');
    cachedRules = rules;
  }
};

export const getCachedRules = async (): Promise<Rules> => {
  return cachedRules || loadRulesFromFile();
};

export const setCachedRules = (rules: Rules | null) => {
  cachedRules = rules;
};

export const clearCachedRules = () => {
  cachedRules = null;
};

export const loadRulesFromDatabase = async (): Promise<Rules | null> => {
  try {
    const defaultDbConfig = await databaseService.getDefaultDatabaseConfig();
    if (!defaultDbConfig) {
      throw new Error('No default database configuration found');
    }

    const connection = await databaseService['getConnection']();
    try {
      const [rows] = await connection.execute(
        'SELECT rules_json, schema_json FROM database_config_files WHERE database_settings_id = ?',
        [defaultDbConfig.id]
      );
      const configRows = rows as any[];
      
      if (configRows.length > 0 && configRows[0].rules_json) {
        return configRows[0].rules_json as Rules;
      }
      return null;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Failed to load rules from database:', error);
    return null;
  }
};

export const upsertRulesToDatabase = async (rules: Rules): Promise<void> => {
  try {
    const defaultDbConfig = await databaseService.getDefaultDatabaseConfig();
    if (!defaultDbConfig) {
      throw new Error('No default database configuration found');
    }

    const connection = await databaseService['getConnection']();
    try {
      // Save both rules_json and schema_json in a single operation
      await connection.execute(
        `INSERT INTO database_config_files (database_settings_id, rules_json, schema_json) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
           rules_json = VALUES(rules_json),
           schema_json = VALUES(schema_json)`,
        [defaultDbConfig.id, JSON.stringify(rules), JSON.stringify(rules.schema)]
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Failed to upsert rules to database:', error);
    throw error;
  }
};

export const upsertSchemaToDatabase = async (schema: Record<string, { columns: string[]; description: string }>): Promise<void> => {
  try {
    const defaultDbConfig = await databaseService.getDefaultDatabaseConfig();
    if (!defaultDbConfig) {
      throw new Error('No default database configuration found');
    }
    const connection = await databaseService['getConnection']();
    try {
      await connection.execute(
        `INSERT INTO database_config_files (database_settings_id, schema_json) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE schema_json = VALUES(schema_json)`,
        [defaultDbConfig.id, JSON.stringify(schema)]
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Failed to upsert schema to database:', error);
    throw error;
  }
};

export const updateSchemaInDatabase = async (schema: Record<string, { columns: string[]; description: string }>): Promise<void> => {
  try {
    const defaultDbConfig = await databaseService.getDefaultDatabaseConfig();
    if (!defaultDbConfig) {
      throw new Error('No default database configuration found');
    }
    
    const connection = await databaseService['getConnection']();
    try {
      await connection.execute(
        `UPDATE database_config_files SET schema_json = ? WHERE database_settings_id = ?`,
        [JSON.stringify(schema), defaultDbConfig.id]
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Failed to update schema in database:', error);
    throw error;
  }
};

export const loadSchemaFromDatabase = async (): Promise<Record<string, { columns: string[]; description: string }> | null> => {
  try {
    const defaultDbConfig = await databaseService.getDefaultDatabaseConfig();
    if (!defaultDbConfig) {
      throw new Error('No default database configuration found');
    }

    const connection = await databaseService['getConnection']();
    try {
      const [rows] = await connection.execute(
        'SELECT schema_json FROM database_config_files WHERE database_settings_id = ?',
        [defaultDbConfig.id]
      );
      const configRows = rows as any[];
      
      if (configRows.length > 0 && configRows[0].schema_json) {
        return configRows[0].schema_json as Record<string, { columns: string[]; description: string }>;
      }
      return null;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Failed to load schema from database:', error);
    return null;
  }
};
