import { Request, Response } from 'express';
import { getDestinationPool } from '../services/pools';
import { normalizeLimitClause } from '../utils/validators';
import { queryLogService } from '../services/queryLogService';

export const validateQuery = async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { sql, execute = false } = req.body as { sql: string; execute?: boolean };
    const destinationPool = getDestinationPool();
    
    // Extract user session and IP for logging
    const userSession = req.headers['x-session-id'] as string || 'anonymous';
    const ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';

    if (!destinationPool) {
      // Log database configuration error
      await queryLogService.logQuery({
        natural_language_query: `Database configuration error for query: ${sql}`,
        generated_sql: sql,
        execution_status: 'execution_error',
        execution_time_ms: Date.now() - startTime,
        error_message: 'Database not configured. Please set DATABASE_URL environment variable.',
        user_session: userSession,
        ip_address: ipAddress
      });
      
      return res.status(503).json({
        isValid: false,
        error: 'Database not configured. Please set DATABASE_URL environment variable.',
        syntaxValid: true
      });
    }

    let connection: any;
    try {
      connection = await destinationPool.getConnection();
      const explainQuery = `EXPLAIN ${sql.trim()}`;
      await connection.query(explainQuery);

      let safeQuery = sql.trim();
      if (!safeQuery.toLowerCase().includes('limit')) {
        safeQuery = `${safeQuery} LIMIT 50`;
      }
      // Normalize malformed LIMIT clauses that can appear from NL prompts (e.g., "LIMIT give")
      safeQuery = normalizeLimitClause(safeQuery, 50, 500);

      const queryPromise = destinationPool.execute(safeQuery);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout (30s)')), 30000));
      const [rows] = (await Promise.race([queryPromise, timeoutPromise])) as any;

      const data = Array.isArray(rows) ? rows : [rows];
      const rowCount = data.length;
      const executionTime = Date.now() - startTime;
      
      // Log successful query execution
      await queryLogService.logQuery({
        natural_language_query: `Query validation and execution: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`,
        generated_sql: sql,
        execution_status: 'success',
        execution_time_ms: executionTime,
        user_session: userSession,
        ip_address: ipAddress
      });
      
      return res.json({ isValid: true, syntaxValid: true, results: execute ? data : undefined, rowCount: execute ? rowCount : undefined, executionTime: `${executionTime}ms`, limited: !sql.toLowerCase().includes('limit') });
    } catch (error: any) {
      const isSyntaxError = error.code === 'ER_PARSE_ERROR' || error.message.includes('syntax') || error.message.includes('SQL syntax');
      const executionTime = Date.now() - startTime;
      
      // Log query execution error
      await queryLogService.logQuery({
        natural_language_query: `Query validation failed: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`,
        generated_sql: sql,
        execution_status: isSyntaxError ? 'validation_error' : 'execution_error',
        execution_time_ms: executionTime,
        error_message: error.message,
        user_session: userSession,
        ip_address: ipAddress
      });
      
      return res.status(400).json({
        isValid: false,
        syntaxValid: !isSyntaxError,
        error: error.message,
        errorCode: error.code,
        sqlState: error.sqlState,
        suggestion: isSyntaxError ? 'Check your SQL syntax for typos or missing keywords' : 'The query is syntactically correct but failed to execute. Check table/column names.'
      });
    } finally {
      if (connection) connection.release();
    }
  } catch (error: any) {
    const userSession = req.headers['x-session-id'] as string || 'anonymous';
    const ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';
    
    // Log internal server error
    await queryLogService.logQuery({
      natural_language_query: `Server error during validation: ${req.body?.sql || 'unknown'}`,
      generated_sql: req.body?.sql,
      execution_status: 'execution_error',
      execution_time_ms: Date.now() - startTime,
      error_message: error.message,
      user_session: userSession,
      ip_address: ipAddress
    });
    
    return res.status(500).json({ isValid: false, error: 'Internal server error during validation', message: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};
