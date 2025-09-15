import mysql from 'mysql2/promise';
import { AIConfig } from './openaiService';

class DatabaseDestinationService {
  private pool: mysql.Pool;

  constructor(pool: mysql.Pool) {
    if (!pool) {
      throw new Error('Pool is required for DatabaseDestinationService');
    }
    this.pool = pool;
    console.log('✅ DatabaseDestinationService initialized with provided pool');
  }

  private async getConnection(): Promise<mysql.PoolConnection> {
    return await this.pool.getConnection();
  }

  async testDestinationConnection(): Promise<boolean> {
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

  async runQuery(query: string): Promise<any> {
    // Enforce read-only, single-statement SELECT queries
    const sanitized = query.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '').replace(/#.*/g, '').trim();
    const lower = sanitized.toLowerCase();
    if (!lower.startsWith('select')) {
      throw new Error('Only SELECT queries are allowed');
    }
    if (sanitized.indexOf(';') !== -1 && sanitized.indexOf(';') < sanitized.length - 1) {
      throw new Error('Multiple statements are not allowed');
    }

    const forbidden = [
      /\b(drop|delete|truncate|alter|create|grant|revoke|insert|update|call|exec|execute)\b/i,
      /union\s+all?\s+select/i,
      /into\s+outfile/i,
      /load_file\s*\(/i,
      /sleep\s*\(/i,
      /benchmark\s*\(/i,
      /information_schema\./i,
    ];
    for (const p of forbidden) {
      if (p.test(sanitized)) {
        throw new Error('Query contains disallowed operations');
      }
    }

    const connection = await this.getConnection();
    try {
      const [rows] = await connection.execute(sanitized);
      return rows;
    } finally {
      connection.release();
    }
  }

}

export default DatabaseDestinationService;
