import mysql from 'mysql2/promise';
import { RowDataPacket, FieldPacket, OkPacket } from 'mysql2';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration interface
interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  charset: string;
  timezone: string;
  connectionLimit: number;
  acquireTimeout: number;
  timeout: number;
}

// DDL Result interfaces
interface DDLResult {
  type: 'table' | 'view' | 'procedure' | 'function' | 'trigger';
  schema: string;
  name: string;
  ddl: string;
  dependencies?: string[];
}

interface SchemaExport {
  schema: string;
  timestamp: Date;
  version: string;
  tables: DDLResult[];
  views: DDLResult[];
  procedures: DDLResult[];
  functions: DDLResult[];
  triggers: DDLResult[];
  summary: {
    totalObjects: number;
    tableCount: number;
    viewCount: number;
    procedureCount: number;
    functionCount: number;
    triggerCount: number;
  };
}

interface TableInfo extends RowDataPacket {
  TABLE_NAME: string;
  TABLE_TYPE: string;
  ENGINE: string;
  TABLE_COLLATION: string;
  CREATE_TIME: Date;
  TABLE_COMMENT: string;
}

interface ShowCreateResult extends RowDataPacket {
  Table?: string;
  'Create Table'?: string;
  View?: string;
  'Create View'?: string;
  Procedure?: string;
  'Create Procedure'?: string;
  Function?: string;
  'Create Function'?: string;
  Trigger?: string;
  'Create Trigger'?: string;
}

interface RoutineInfo extends RowDataPacket {
  ROUTINE_NAME: string;
  ROUTINE_TYPE: 'PROCEDURE' | 'FUNCTION';
  CREATED: Date;
  LAST_ALTERED: Date;
}

interface TriggerInfo extends RowDataPacket {
  TRIGGER_NAME: string;
  EVENT_OBJECT_TABLE: string;
  ACTION_TIMING: string;
  EVENT_MANIPULATION: string;
}

interface ForeignKeyInfo extends RowDataPacket {
  CONSTRAINT_NAME: string;
  TABLE_NAME: string;
  COLUMN_NAME: string;
  REFERENCED_TABLE_NAME: string;
  REFERENCED_COLUMN_NAME: string;
  UPDATE_RULE: string;
  DELETE_RULE: string;
}

// Database Error handling
class DDLExtractionError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'DDLExtractionError';
  }
}

// Main DDL Extraction Service
export class SakilaDDLExtractor {
  private pool: mysql.Pool;
  private config: DatabaseConfig;

  constructor() {
    this.config = this.createDatabaseConfig();
    this.pool = this.createConnectionPool();
  }

  private createDatabaseConfig(): DatabaseConfig {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3310'),
      user: process.env.DB_USER || 'queryuser',
      password: process.env.DB_PASSWORD || 'querypass',
      database: process.env.DB_NAME || 'sakila',
      charset: 'utf8mb4',
      timezone: '+00:00',
      connectionLimit: 10,
      acquireTimeout: 60000,  // This will be filtered out
      timeout: 60000          // This will be filtered out
    };
  }

  private createConnectionPool(): mysql.Pool {
    console.log(`🔌 Connecting to MySQL: ${this.config.host}:${this.config.port}/${this.config.database}`);
    
    // Filter out invalid pool options
    const { acquireTimeout, timeout, ...validConfig } = this.config;
    
    return mysql.createPool({
      ...validConfig,
      waitForConnections: true,
      maxIdle: 10,
      idleTimeout: 60000,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      multipleStatements: false, // Security: prevent SQL injection
      dateStrings: true,
      supportBigNumbers: true,
      bigNumberStrings: true
    });
  }

  // Test database connection
  async testConnection(): Promise<void> {
    try {
      const connection = await this.pool.getConnection();
      const [rows] = await connection.execute<RowDataPacket[]>('SELECT VERSION() as version');
      console.log(`✅ Connected successfully to MySQL ${rows[0].version}`);
      connection.release();
    } catch (error) {
      throw new DDLExtractionError('Failed to connect to database', error);
    }
  }

  // Verify Sakila database structure
  async verifySakilaDatabase(): Promise<void> {
    try {
      const [tables] = await this.pool.execute<TableInfo[]>(
        'SELECT TABLE_NAME, TABLE_TYPE FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',
        [this.config.database]
      );

      const tableCount = tables.filter(t => t.TABLE_TYPE === 'BASE TABLE').length;
      const viewCount = tables.filter(t => t.TABLE_TYPE === 'VIEW').length;

      console.log(`📊 Database verification: ${tableCount} tables, ${viewCount} views found`);

      if (tableCount < 15 || viewCount < 5) {
        console.warn('⚠️  Warning: Expected structure differs from standard Sakila database');
      }
    } catch (error) {
      throw new DDLExtractionError('Failed to verify database structure', error);
    }
  }

  // Extract all tables DDL
  async extractTablesDDL(): Promise<DDLResult[]> {
    console.log('📋 Extracting table DDL statements...');
    
    const results: DDLResult[] = [];
    
    try {
      // Get all base tables
      const [tables] = await this.pool.execute<TableInfo[]>(
        `SELECT TABLE_NAME, ENGINE, TABLE_COLLATION, CREATE_TIME, TABLE_COMMENT
         FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
         ORDER BY TABLE_NAME`,
        [this.config.database]
      );

      console.log(`   Found ${tables.length} tables to extract`);

      for (const table of tables) {
        try {
          const [ddlRows] = await this.pool.execute<ShowCreateResult[]>(
            `SHOW CREATE TABLE \`${table.TABLE_NAME}\``
          );

          if (ddlRows.length > 0 && ddlRows[0]['Create Table']) {
            results.push({
              type: 'table',
              schema: this.config.database,
              name: table.TABLE_NAME,
              ddl: ddlRows[0]['Create Table']
            });
            console.log(`   ✓ ${table.TABLE_NAME}`);
          }
        } catch (error) {
          console.error(`   ✗ Failed to extract table ${table.TABLE_NAME}:`, error);
        }
      }

      return results;
    } catch (error) {
      throw new DDLExtractionError('Failed to extract table DDL', error);
    }
  }

  // Extract all views DDL
  async extractViewsDDL(): Promise<DDLResult[]> {
    console.log('👁️  Extracting view DDL statements...');
    
    const results: DDLResult[] = [];
    
    try {
      // Get all views
      const [views] = await this.pool.execute<TableInfo[]>(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'VIEW'
         ORDER BY TABLE_NAME`,
        [this.config.database]
      );

      console.log(`   Found ${views.length} views to extract`);

      for (const view of views) {
        try {
          const [ddlRows] = await this.pool.execute<ShowCreateResult[]>(
            `SHOW CREATE VIEW \`${view.TABLE_NAME}\``
          );

          if (ddlRows.length > 0 && ddlRows[0]['Create View']) {
            results.push({
              type: 'view',
              schema: this.config.database,
              name: view.TABLE_NAME,
              ddl: ddlRows[0]['Create View']
            });
            console.log(`   ✓ ${view.TABLE_NAME}`);
          }
        } catch (error) {
          console.error(`   ✗ Failed to extract view ${view.TABLE_NAME}:`, error);
        }
      }

      return results;
    } catch (error) {
      throw new DDLExtractionError('Failed to extract view DDL', error);
    }
  }

  // Extract stored procedures DDL
  async extractProceduresDDL(): Promise<DDLResult[]> {
    console.log('⚙️  Extracting stored procedures DDL...');
    
    const results: DDLResult[] = [];
    
    try {
      // Get all stored procedures
      const [procedures] = await this.pool.execute<RoutineInfo[]>(
        `SELECT ROUTINE_NAME, CREATED, LAST_ALTERED 
         FROM INFORMATION_SCHEMA.ROUTINES 
         WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE'
         ORDER BY ROUTINE_NAME`,
        [this.config.database]
      );

      console.log(`   Found ${procedures.length} procedures to extract`);

      for (const procedure of procedures) {
        try {
          const [ddlRows] = await this.pool.execute<ShowCreateResult[]>(
            `SHOW CREATE PROCEDURE \`${procedure.ROUTINE_NAME}\``
          );

          if (ddlRows.length > 0 && ddlRows[0]['Create Procedure']) {
            results.push({
              type: 'procedure',
              schema: this.config.database,
              name: procedure.ROUTINE_NAME,
              ddl: ddlRows[0]['Create Procedure']
            });
            console.log(`   ✓ ${procedure.ROUTINE_NAME}`);
          }
        } catch (error) {
          console.error(`   ✗ Failed to extract procedure ${procedure.ROUTINE_NAME}:`, error);
        }
      }

      return results;
    } catch (error) {
      throw new DDLExtractionError('Failed to extract procedures DDL', error);
    }
  }

  // Extract functions DDL
  async extractFunctionsDDL(): Promise<DDLResult[]> {
    console.log('🔧 Extracting functions DDL...');
    
    const results: DDLResult[] = [];
    
    try {
      // Get all functions
      const [functions] = await this.pool.execute<RoutineInfo[]>(
        `SELECT ROUTINE_NAME, CREATED, LAST_ALTERED 
         FROM INFORMATION_SCHEMA.ROUTINES 
         WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'FUNCTION'
         ORDER BY ROUTINE_NAME`,
        [this.config.database]
      );

      console.log(`   Found ${functions.length} functions to extract`);

      for (const func of functions) {
        try {
          const [ddlRows] = await this.pool.execute<ShowCreateResult[]>(
            `SHOW CREATE FUNCTION \`${func.ROUTINE_NAME}\``
          );

          if (ddlRows.length > 0 && ddlRows[0]['Create Function']) {
            results.push({
              type: 'function',
              schema: this.config.database,
              name: func.ROUTINE_NAME,
              ddl: ddlRows[0]['Create Function']
            });
            console.log(`   ✓ ${func.ROUTINE_NAME}`);
          }
        } catch (error) {
          console.error(`   ✗ Failed to extract function ${func.ROUTINE_NAME}:`, error);
        }
      }

      return results;
    } catch (error) {
      throw new DDLExtractionError('Failed to extract functions DDL', error);
    }
  }

  // Extract triggers DDL
  async extractTriggersDDL(): Promise<DDLResult[]> {
    console.log('⚡ Extracting triggers DDL...');
    
    const results: DDLResult[] = [];
    
    try {
      // Get all triggers
      const [triggers] = await this.pool.execute<TriggerInfo[]>(
        `SELECT TRIGGER_NAME, EVENT_OBJECT_TABLE, ACTION_TIMING, EVENT_MANIPULATION
         FROM INFORMATION_SCHEMA.TRIGGERS 
         WHERE TRIGGER_SCHEMA = ?
         ORDER BY EVENT_OBJECT_TABLE, ACTION_TIMING, TRIGGER_NAME`,
        [this.config.database]
      );

      console.log(`   Found ${triggers.length} triggers to extract`);

      for (const trigger of triggers) {
        try {
          const [ddlRows] = await this.pool.execute<ShowCreateResult[]>(
            `SHOW CREATE TRIGGER \`${trigger.TRIGGER_NAME}\``
          );

          if (ddlRows.length > 0 && ddlRows[0]['Create Trigger']) {
            results.push({
              type: 'trigger',
              schema: this.config.database,
              name: trigger.TRIGGER_NAME,
              ddl: ddlRows[0]['Create Trigger'],
              dependencies: [trigger.EVENT_OBJECT_TABLE]
            });
            console.log(`   ✓ ${trigger.TRIGGER_NAME} (on ${trigger.EVENT_OBJECT_TABLE})`);
          }
        } catch (error) {
          console.error(`   ✗ Failed to extract trigger ${trigger.TRIGGER_NAME}:`, error);
        }
      }

      return results;
    } catch (error) {
      throw new DDLExtractionError('Failed to extract triggers DDL', error);
    }
  }

  // Extract foreign key relationships for documentation
  async extractForeignKeyInfo(): Promise<ForeignKeyInfo[]> {
    try {
      const [fks] = await this.pool.execute<ForeignKeyInfo[]>(
        `SELECT 
           kcu.CONSTRAINT_NAME,
           kcu.TABLE_NAME,
           kcu.COLUMN_NAME,
           kcu.REFERENCED_TABLE_NAME,
           kcu.REFERENCED_COLUMN_NAME,
           rc.UPDATE_RULE,
           rc.DELETE_RULE
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
         JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc 
           ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME 
           AND kcu.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
         WHERE kcu.CONSTRAINT_SCHEMA = ? 
           AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
         ORDER BY kcu.TABLE_NAME, kcu.CONSTRAINT_NAME`,
        [this.config.database]
      );

      return fks;
    } catch (error) {
      throw new DDLExtractionError('Failed to extract foreign key information', error);
    }
  }

  // Extract complete schema DDL
  async extractCompleteSchema(): Promise<SchemaExport> {
    console.log(`🚀 Starting complete DDL extraction for ${this.config.database} database...`);
    
    try {
      await this.testConnection();
      await this.verifySakilaDatabase();

      // Extract all database objects
      const tables = await this.extractTablesDDL();
      const views = await this.extractViewsDDL();
      const procedures = await this.extractProceduresDDL();
      const functions = await this.extractFunctionsDDL();
      const triggers = await this.extractTriggersDDL();

      // Get MySQL version
      const [versionRows] = await this.pool.execute<RowDataPacket[]>('SELECT VERSION() as version');
      
      const schemaExport: SchemaExport = {
        schema: this.config.database,
        timestamp: new Date(),
        version: versionRows[0].version,
        tables,
        views,
        procedures,
        functions,
        triggers,
        summary: {
          totalObjects: tables.length + views.length + procedures.length + functions.length + triggers.length,
          tableCount: tables.length,
          viewCount: views.length,
          procedureCount: procedures.length,
          functionCount: functions.length,
          triggerCount: triggers.length
        }
      };

      console.log(`✅ Extraction complete: ${schemaExport.summary.totalObjects} objects extracted`);
      
      return schemaExport;
    } catch (error) {
      throw new DDLExtractionError('Failed to extract complete schema', error);
    }
  }

  // Format DDL output with proper SQL structure
  private formatDDLOutput(schemaExport: SchemaExport, foreignKeys: ForeignKeyInfo[]): string {
    const lines: string[] = [];
    
    // Header
    lines.push('-- =====================================================');
    lines.push(`-- Sakila Database DDL Export`);
    lines.push(`-- Schema: ${schemaExport.schema}`);
    lines.push(`-- Generated: ${schemaExport.timestamp.toISOString()}`);
    lines.push(`-- MySQL Version: ${schemaExport.version}`);
    lines.push(`-- Total Objects: ${schemaExport.summary.totalObjects}`);
    lines.push('-- =====================================================');
    lines.push('');
    
    // Database creation
    lines.push(`-- Create database (if not exists)`);
    lines.push(`CREATE DATABASE IF NOT EXISTS \`${schemaExport.schema}\`;`);
    lines.push(`USE \`${schemaExport.schema}\`;`);
    lines.push('');
    
    // Set session variables for compatibility
    lines.push('-- Set session variables');
    lines.push('SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;');
    lines.push('SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;');
    lines.push('SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE=\'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION\';');
    lines.push('');

    // Tables section
    if (schemaExport.tables.length > 0) {
      lines.push('-- =====================================================');
      lines.push(`-- TABLES (${schemaExport.tables.length})`);
      lines.push('-- =====================================================');
      lines.push('');
      
      schemaExport.tables.forEach((table, index) => {
        lines.push(`-- Table ${index + 1}: ${table.name}`);
        lines.push(table.ddl + ';');
        lines.push('');
      });
    }

    // Views section
    if (schemaExport.views.length > 0) {
      lines.push('-- =====================================================');
      lines.push(`-- VIEWS (${schemaExport.views.length})`);
      lines.push('-- =====================================================');
      lines.push('');
      
      schemaExport.views.forEach((view, index) => {
        lines.push(`-- View ${index + 1}: ${view.name}`);
        lines.push(view.ddl + ';');
        lines.push('');
      });
    }

    // Stored procedures section
    if (schemaExport.procedures.length > 0) {
      lines.push('-- =====================================================');
      lines.push(`-- STORED PROCEDURES (${schemaExport.procedures.length})`);
      lines.push('-- =====================================================');
      lines.push('');
      
      lines.push('DELIMITER $$');
      lines.push('');
      
      schemaExport.procedures.forEach((procedure, index) => {
        lines.push(`-- Procedure ${index + 1}: ${procedure.name}`);
        lines.push(procedure.ddl + '$$');
        lines.push('');
      });
      
      lines.push('DELIMITER ;');
      lines.push('');
    }

    // Functions section
    if (schemaExport.functions.length > 0) {
      lines.push('-- =====================================================');
      lines.push(`-- FUNCTIONS (${schemaExport.functions.length})`);
      lines.push('-- =====================================================');
      lines.push('');
      
      lines.push('DELIMITER $$');
      lines.push('');
      
      schemaExport.functions.forEach((func, index) => {
        lines.push(`-- Function ${index + 1}: ${func.name}`);
        lines.push(func.ddl + '$$');
        lines.push('');
      });
      
      lines.push('DELIMITER ;');
      lines.push('');
    }

    // Triggers section
    if (schemaExport.triggers.length > 0) {
      lines.push('-- =====================================================');
      lines.push(`-- TRIGGERS (${schemaExport.triggers.length})`);
      lines.push('-- =====================================================');
      lines.push('');
      
      lines.push('DELIMITER $$');
      lines.push('');
      
      schemaExport.triggers.forEach((trigger, index) => {
        lines.push(`-- Trigger ${index + 1}: ${trigger.name}`);
        if (trigger.dependencies && trigger.dependencies.length > 0) {
          lines.push(`-- Dependencies: ${trigger.dependencies.join(', ')}`);
        }
        lines.push(trigger.ddl + '$$');
        lines.push('');
      });
      
      lines.push('DELIMITER ;');
      lines.push('');
    }

    // Foreign key relationships documentation
    if (foreignKeys.length > 0) {
      lines.push('-- =====================================================');
      lines.push(`-- FOREIGN KEY RELATIONSHIPS (${foreignKeys.length})`);
      lines.push('-- =====================================================');
      lines.push('-- The following foreign key relationships are defined:');
      lines.push('');
      
      const fksByTable = foreignKeys.reduce((acc, fk) => {
        if (!acc[fk.TABLE_NAME]) acc[fk.TABLE_NAME] = [];
        acc[fk.TABLE_NAME].push(fk);
        return acc;
      }, {} as Record<string, ForeignKeyInfo[]>);

      Object.entries(fksByTable).forEach(([tableName, fks]) => {
        lines.push(`-- ${tableName}:`);
        fks.forEach(fk => {
          lines.push(`--   ${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME} (${fk.UPDATE_RULE}/${fk.DELETE_RULE})`);
        });
        lines.push('');
      });
    }

    // Footer
    lines.push('-- Restore session variables');
    lines.push('SET SQL_MODE=@OLD_SQL_MODE;');
    lines.push('SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;');
    lines.push('SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;');
    lines.push('');
    lines.push('-- =====================================================');
    lines.push('-- DDL Export Complete');
    lines.push(`-- Generated: ${schemaExport.timestamp.toISOString()}`);
    lines.push('-- =====================================================');

    return lines.join('\n');
  }

  // Export DDL to file
  async exportToFile(outputPath?: string): Promise<string> {
    const filePath = outputPath || process.env.OUTPUT_FILE || './sakila_ddl_export.sql';
    
    try {
      console.log(`📄 Preparing to export DDL to: ${filePath}`);
      
      // Extract complete schema
      const schemaExport = await this.extractCompleteSchema();
      
      // Get foreign key information
      const foreignKeys = await this.extractForeignKeyInfo();
      
      // Format output
      const ddlContent = this.formatDDLOutput(schemaExport, foreignKeys);
      
      // Ensure output directory exists
      const outputDir = path.dirname(filePath);
      await fs.mkdir(outputDir, { recursive: true });
      
      // Write file
      await fs.writeFile(filePath, ddlContent, { encoding: 'utf8' });
      
      // Get file stats
      const stats = await fs.stat(filePath);
      const fileSize = (stats.size / 1024).toFixed(2);
      
      console.log(`✅ DDL exported successfully!`);
      console.log(`   📁 File: ${filePath}`);
      console.log(`   📏 Size: ${fileSize} KB`);
      console.log(`   📊 Objects: ${schemaExport.summary.totalObjects} (${schemaExport.summary.tableCount} tables, ${schemaExport.summary.viewCount} views, ${schemaExport.summary.procedureCount} procedures, ${schemaExport.summary.functionCount} functions, ${schemaExport.summary.triggerCount} triggers)`);
      
      return filePath;
    } catch (error) {
      throw new DDLExtractionError(`Failed to export DDL to file: ${filePath}`, error);
    }
  }

  // Close database connections
  async close(): Promise<void> {
    try {
      await this.pool.end();
      console.log('🔌 Database connections closed');
    } catch (error) {
      console.error('Error closing database connections:', error);
    }
  }
}

// Main execution function
async function main(): Promise<void> {
  const extractor = new SakilaDDLExtractor();
  
  try {
    const outputFile = await extractor.exportToFile();
    console.log(`\n🎉 Success! DDL exported to: ${outputFile}`);
    
    // Optional: Show first few lines of output
    const content = await fs.readFile(outputFile, 'utf8');
    const lines = content.split('\n');
    console.log('\n📋 Preview (first 10 lines):');
    console.log(lines.slice(0, 10).join('\n'));
    
    if (lines.length > 10) {
      console.log(`... (${lines.length - 10} more lines)`);
    }
    
  } catch (error) {
    if (error instanceof DDLExtractionError) {
      console.error(`❌ DDL Extraction Error: ${error.message}`);
      if (error.cause) {
        console.error('   Caused by:', error.cause);
      }
    } else {
      console.error('❌ Unexpected error:', error);
    }
    process.exit(1);
  } finally {
    await extractor.close();
  }
}

// Export the main class and run if called directly
// export { SakilaDDLExtractor };

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
