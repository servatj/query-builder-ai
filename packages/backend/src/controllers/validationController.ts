import { Request, Response } from 'express';
import { getDestinationPool } from '../services/pools';

export const validateQuery = async (req: Request, res: Response) => {
  try {
    const { query } = req.body as { query: string };
    const destinationPool = getDestinationPool();

    if (!destinationPool) {
      return res.status(503).json({
        isValid: false,
        error: 'Database not configured. Please set DATABASE_URL environment variable.',
        syntaxValid: true
      });
    }

    let connection: any;
    try {
      connection = await destinationPool.getConnection();
      const explainQuery = `EXPLAIN ${query.trim()}`;
      await connection.query(explainQuery);

      let safeQuery = query.trim();
      if (!safeQuery.toLowerCase().includes('limit')) {
        safeQuery = `${safeQuery} LIMIT 50`;
      }

      const queryPromise = destinationPool.execute(safeQuery);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout (30s)')), 30000));
      const [rows] = (await Promise.race([queryPromise, timeoutPromise])) as any;

      const data = Array.isArray(rows) ? rows : [rows];
      const rowCount = data.length;
      return res.json({ isValid: true, syntaxValid: true, data, rowCount, executionTime: new Date().toISOString(), limited: !query.toLowerCase().includes('limit') });
    } catch (error: any) {
      const isSyntaxError = error.code === 'ER_PARSE_ERROR' || error.message.includes('syntax') || error.message.includes('SQL syntax');
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
    return res.status(500).json({ isValid: false, error: 'Internal server error during validation', message: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};
