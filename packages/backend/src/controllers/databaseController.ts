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
    
    // Use the new proper switching method
    const success = await databaseService.switchDefaultDatabase(databaseId);
    
    if (!success) {
      return res.status(404).json({ error: 'Database configuration not found or switching failed' });
    }

    // Get the updated database configuration to return
    const targetDb = await databaseService.getDefaultDatabaseConfig();
    
    return res.json({ 
      success: true, 
      message: `Switched to database: ${targetDb?.name || 'Unknown'}`, 
      database: targetDb 
    });
  } catch (error) {
    console.error('Database switching error:', error);
    return res.status(500).json({ error: 'Failed to switch database' });
  }
};
