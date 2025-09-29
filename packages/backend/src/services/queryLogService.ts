import mysql from 'mysql2/promise';

interface QueryLogEntry {
  natural_language_query: string;
  generated_sql?: string;
  execution_status: 'success' | 'validation_error' | 'execution_error';
  confidence_score?: number;
  execution_time_ms?: number;
  error_message?: string;
  user_session?: string;
  ip_address?: string;
}

class QueryLogService {
  private pool: mysql.Pool | null = null;

  constructor() {
    this.initializePool();
  }

  private async initializePool() {
    try {
      // Use the query_builder database for logging
      const connectionString = process.env.DATABASE_URL || 
        'mysql://queryuser:querypass@localhost:3306/query_builder';
      
      this.pool = mysql.createPool(connectionString);
      console.log('✅ Query log service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize query log database pool:', error);
      this.pool = null;
    }
  }

  async logQuery(entry: QueryLogEntry): Promise<void> {
    if (!this.pool) {
      console.warn('Query log pool not initialized, skipping log entry');
      return;
    }

    try {
      const connection = await this.pool.getConnection();
      try {
        await connection.execute(
          `INSERT INTO query_logs (
            natural_language_query, 
            generated_sql, 
            execution_status, 
            confidence_score, 
            execution_time_ms, 
            error_message, 
            user_session, 
            ip_address
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            entry.natural_language_query,
            entry.generated_sql || null,
            entry.execution_status,
            entry.confidence_score || null,
            entry.execution_time_ms || null,
            entry.error_message || null,
            entry.user_session || null,
            entry.ip_address || null
          ]
        );
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Failed to log query:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  async getQueryLogs(limit = 100, offset = 0): Promise<any[]> {
    if (!this.pool) {
      return [];
    }

    try {
      const connection = await this.pool.getConnection();
      try {
        const [rows] = await connection.execute(
          `SELECT * FROM query_logs 
           ORDER BY created_at DESC 
           LIMIT ? OFFSET ?`,
          [limit, offset]
        );
        return rows as any[];
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Failed to retrieve query logs:', error);
      return [];
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

// Export singleton instance
export const queryLogService = new QueryLogService();
export default queryLogService;