import { Router } from 'express';
import { generateQuery, getPatterns } from '../controllers/queryController';
import { validateGenerateQuery } from '../middleware/validation';

const router = Router();

router.post('/generate-query', validateGenerateQuery, generateQuery);
router.get('/patterns', getPatterns);

export default router;
