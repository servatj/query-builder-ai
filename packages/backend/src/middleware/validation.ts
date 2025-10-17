import { NextFunction, Request, Response } from 'express';
import { promptSchema, sqlQuerySchema } from '../utils/validators';

export const validateGenerateQuery = (req: Request, res: Response, next: NextFunction) => {
  const parse = promptSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.errors[0]?.message || 'Invalid request body' });
  }
  // Normalize defaults
  req.body = parse.data;
  return next();
};

export const validateSql = (req: Request, res: Response, next: NextFunction) => {
  const parse = sqlQuerySchema.safeParse(req.body);
  if (!parse.success) {
    console.log('validateSql error', parse.error.errors);
    return res.status(400).json({ isValid: false, error: parse.error.errors[0]?.message || 'Invalid query' });
  }
  req.body = parse.data;
  return next();
};
