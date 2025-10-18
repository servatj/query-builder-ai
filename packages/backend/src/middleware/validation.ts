import { NextFunction, Request, Response } from 'express';
import { promptSchema, sqlQuerySchema } from '../utils/validators';

export const validateGenerateQuery = (req: Request, res: Response, next: NextFunction) => {
  console.log('validateGenerateQuery - Request body:', JSON.stringify(req.body));
  const parse = promptSchema.safeParse(req.body);
  if (!parse.success) {
    const errorDetails = parse.error.errors.map(err => ({
      field: (err.path || []).join('.') || 'unknown',
      message: err.message,
      received: err.code === 'invalid_type' ? (err as any).received : undefined
    }));
    console.error('❌ validateGenerateQuery validation failed:', {
      errors: errorDetails,
      receivedBody: req.body
    });
    const detailedError = `Validation failed: ${errorDetails.map(e => `${e.field} - ${e.message}${e.received ? ` (received: ${e.received})` : ''}`).join(', ')}`;
    return res.status(400).json({ 
      error: detailedError,
      details: errorDetails 
    });
  }
  console.log('✅ validateGenerateQuery passed');
  // Normalize defaults
  req.body = parse.data;
  return next();
};

export const validateSql = (req: Request, res: Response, next: NextFunction) => {
  console.log('validateSql - Request body:', JSON.stringify(req.body));
  const parse = sqlQuerySchema.safeParse(req.body);
  if (!parse.success) {
    const errorDetails = parse.error.errors.map(err => ({
      field: (err.path || []).join('.') || 'unknown',
      message: err.message,
      received: err.code === 'invalid_type' ? (err as any).received : undefined
    }));
    console.error('❌ validateSql validation failed:', {
      errors: errorDetails,
      receivedBody: req.body
    });
    const detailedError = `Validation failed: ${errorDetails.map(e => `${e.field} - ${e.message}${e.received ? ` (received: ${e.received})` : ''}`).join(', ')}`;
    return res.status(400).json({ 
      isValid: false, 
      error: detailedError,
      details: errorDetails 
    });
  }
  console.log('✅ validateSql passed:', req.body);
  req.body = parse.data;
  return next();
};
