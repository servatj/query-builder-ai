import { Router } from 'express';
import { validateQuery } from '../controllers/validationController';
import { validateSql } from '../middleware/validation';

const router = Router();

router.post('/validate-query', validateSql, validateQuery);

export default router;
