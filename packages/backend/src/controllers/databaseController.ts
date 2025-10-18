import { Request, Response } from 'express';
import databaseService, { DatabaseConfig } from '../services/databaseSystemService';
import { clearCachedRules } from '../services/rulesService';
import { recreateDestinationPool } from '../index';

export const listDatabases = async (_req: Request, res: Response) => {
  try {
    const databases = await databaseService.getDatabaseConfigs();
    // Mask passwords for security
    const maskedDatabases = databases.map(db => ({
      ...db,
      password: db.password ? '********' : ''
    }));
    return res.json(maskedDatabases);
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

    // Clear cached rules so they reload from the new database
    clearCachedRules();

    // Recreate destination pool to connect to the new database
    const poolRecreated = await recreateDestinationPool();
    if (!poolRecreated) {
      console.warn('Failed to recreate destination pool after database switch');
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
