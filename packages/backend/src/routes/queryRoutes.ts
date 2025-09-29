import { Router } from 'express';
import { generateQuery, getPatterns, getQueryLogs } from '../controllers/queryController';
import { validateGenerateQuery } from '../middleware/validation';

const router = Router();

router.post('/generate-query', validateGenerateQuery, generateQuery);
router.get('/patterns', getPatterns);
router.get('/logs', getQueryLogs);

export default router;
