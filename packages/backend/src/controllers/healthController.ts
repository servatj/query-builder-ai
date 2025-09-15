import { Request, Response } from 'express';
import openaiService from '../services/openaiService';
import { getPool } from '../services/pools';

export const getHealth = async (_req: Request, res: Response) => {
  try {
    const health: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      openai: openaiService.enabled ? 'enabled' : 'disabled',
      services: { database: 'disconnected', openai: openaiService.enabled ? 'enabled' : 'disabled' }
    };

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
