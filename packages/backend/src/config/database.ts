import mysql from 'mysql2/promise';
import DatabaseSystemService from '../services/databaseSystemService';

export interface DatabaseConfig {
  id?: number;
  name: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  password: string;
  ssl_enabled: boolean;
  is_active: boolean;
  is_default: boolean;
}

let systemPool: mysql.Pool | null = null;
let destinationPool: mysql.Pool | null = null;
let systemService: DatabaseSystemService | null = null;

export const getSystemPool = (): mysql.Pool | null => systemPool;
export const getDestinationPool = (): mysql.Pool | null => destinationPool;
export const getSystemService = (): DatabaseSystemService | null => systemService;

export const createSystemPool = async (): Promise<mysql.Pool | null> => {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.warn('⚠️  DATABASE_URL not configured. Settings storage will not work.');
    return null;
  }

  try {
    const pool = mysql.createPool(databaseUrl);
    systemPool = pool;
    systemService = new DatabaseSystemService(pool);
    return pool;
  } catch (error: unknown) {
    console.error('Failed to create system database pool:', error);
    return null;
  }
};

export const createDestinationPool = async (): Promise<mysql.Pool | null> => {
  const systemServiceInstance = getSystemService();
  if (!systemServiceInstance) {
    console.warn('⚠️  System service not initialized. Cannot create destination pool.');
    return null;
  }

  const databaseConfig = await systemServiceInstance.getDefaultDatabaseConfig();
  console.log('databaseConfig', databaseConfig);
  
  if (!databaseConfig) {
    console.warn('⚠️  Default database configuration not found. Query execution will not work.');
    return null;
  }
  
  let databaseUrl = `mysql://${databaseConfig.username}:${databaseConfig.password}@${databaseConfig.host}:${databaseConfig.port}/${databaseConfig.database_name}`;
  
  if (databaseConfig.ssl_enabled) {
    databaseUrl += '?ssl=true';
  }

  console.log('databaseUrl', databaseUrl);

  try {
    const pool = mysql.createPool(databaseUrl);
    destinationPool = pool;
    return pool;
  } catch (error: unknown) {
    console.error('Failed to create destination database pool:', error);
    return null;
  }
};

export const initPools = async (): Promise<void> => {
  // Initialize system pool first (for settings)
  await createSystemPool();
  
  // Then destination pool (depends on system for config)
  await createDestinationPool();
};

export const closePools = async (): Promise<void> => {
  if (systemService) {
    systemService = null;
  }
  if (systemPool) {
    await systemPool.end();
    systemPool = null;
  }
  if (destinationPool) {
    await destinationPool.end();
    destinationPool = null;
  }
};