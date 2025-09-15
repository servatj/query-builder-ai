import { Request, Response } from 'express';
import databaseService, { DatabaseConfig } from '../services/databaseSystemService';

export const listDatabases = async (_req: Request, res: Response) => {
  try {
    const databases = await databaseService.getDatabaseConfigs();
    return res.json(databases);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch database configurations' });
  }
};

export const switchDatabase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const databaseId = parseInt(id);
    if (isNaN(databaseId)) return res.status(400).json({ error: 'Invalid database ID' });
    const databases = await databaseService.getDatabaseConfigs();
    const targetDb = databases.find((db: DatabaseConfig) => db.id === databaseId);
    if (!targetDb) return res.status(404).json({ error: 'Database configuration not found' });
    const { id: _, ...updatedConfig } = targetDb;
    updatedConfig.is_default = true;
    await databaseService.saveDatabaseConfig(updatedConfig as any);
    return res.json({ success: true, message: `Switched to database: ${targetDb.name}`, database: updatedConfig });
  } catch {
    return res.status(500).json({ error: 'Failed to switch database' });
  }
};
