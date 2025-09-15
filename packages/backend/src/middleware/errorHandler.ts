import { NextFunction, Request, Response } from 'express';
import logger from '../utils/logger';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  logger.error(`HTTP ${status} - ${message}`, { stack: err.stack, path: req.path, method: req.method });
  if (req.path.startsWith('/api/validate-query')) {
    return res.status(status).json({ isValid: false, error: message });
  }
  return res.status(status).json({ error: message });
}
