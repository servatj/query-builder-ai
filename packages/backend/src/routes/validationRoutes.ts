import { Router } from 'express';
import { validateSql } from '../middleware/validation';
import { validateQuery } from '../controllers/validationController';

const router = Router();

router.post('/validate-query', validateSql, validateQuery);

export default router;
