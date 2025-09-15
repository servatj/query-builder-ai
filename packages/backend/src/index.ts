import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mysql from 'mysql2/promise';
import openaiService from './services/openaiService';
import databaseService from './services/databaseSystemService';
import { setDestinationPool, setPool } from './services/pools';
import queryRoutes from './routes/queryRoutes';
import validationRoutes from './routes/validationRoutes';
import settingsRoutes from './routes/settingsRoutes';
import databaseRoutes from './routes/databaseRoutes';
import healthRoutes from './routes/healthRoutes';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

// Create a MySQL connection pool with error handling
const createPool = () => {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    logger.warn('⚠️  DATABASE_URL not configured. Query validation will not work.');
    return null;
  }

  try {
    return mysql.createPool(databaseUrl);
  } catch (error: unknown) {
    logger.error('Failed to create database pool:', { error });
    return null;
  }
};

const createDestinationPool = async () => {
  const databaseConfig = await databaseService.getDefaultDatabaseConfig();
  if (!databaseConfig) {
    logger.warn('⚠️  Default database configuration not found. Query validation will not work.');
    return null;
  }
  
  const databaseUrl = `mysql://${databaseConfig.username}:${databaseConfig.password}@${databaseConfig.host}:${databaseConfig.port}/${databaseConfig.database_name}`;

  try {
    return mysql.createPool(databaseUrl);
  } catch (error: unknown) {
    logger.error('Failed to create destination database pool:', { error });
    return null;
  }
};

const bootStrap = async () => {
  const pool = await createPool();
  const destinationPool = await createDestinationPool();
  setPool(pool);
  setDestinationPool(destinationPool);
};

bootStrap();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Mount routers
app.use('/api', queryRoutes);
app.use('/api', validationRoutes);
app.use('/api', settingsRoutes);
app.use('/api', databaseRoutes);
app.use('/api', healthRoutes);

// Error handler (must be after routes)
app.use(errorHandler);

// Root info endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'AI Query Builder Backend is running!',
    version: '1.0.0',
    endpoints: [
      'POST /api/generate-query',
      'POST /api/validate-query',
      'GET /api/health',
      'GET /api/patterns',
      'GET /api/settings',
      'POST /api/settings/rules',
      'POST /api/settings/database',
      'POST /api/settings/database/test',
      'POST /api/settings/ai',
      'POST /api/settings/ai/test',
      'GET /api/databases',
      'POST /api/databases/:id/switch'
    ],
    database: 'unknown'
  });
});

app.listen(port, () => {
  logger.info(`[server]: Server is running at http://localhost:${port}`);
});

export default app;
