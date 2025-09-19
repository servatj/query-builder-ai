import { Request, Response } from 'express';
import openaiService from '../services/openaiService';
import { getPool } from '../services/pools';
import { databaseService } from '../services/databaseSystemService';

export const getHealth = async (_req: Request, res: Response) => {
  try {
    const health: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      openai: openaiService.enabled ? 'enabled' : 'disabled',
      services: { database: 'disconnected', openai: openaiService.enabled ? 'enabled' : 'disabled' }
    };

    // Get current database info
    try {
      const currentDb = await databaseService.getDefaultDatabaseConfig();
      if (currentDb) {
        health.database_name = currentDb.database_name;
        health.database_host = `${currentDb.host}:${currentDb.port}`;
      }
    } catch {
      // Continue without database info
    }

    const pool = getPool();
    if (pool) {
      let connection: any;
      try {
        connection = await pool.getConnection();
        await connection.ping();
        health.database = 'connected';
        health.services.database = 'connected';
      } catch {
        health.database = 'error';
        health.services.database = 'error';
      } finally {
        if (connection) {
          connection.release();
        }
      }
    }
    return res.json(health);
  } catch {
    return res.status(500).json({ status: 'unhealthy', error: 'Health check failed' });
  }
};
