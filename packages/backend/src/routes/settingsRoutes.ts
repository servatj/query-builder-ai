import { Router } from 'express';
import { getSettings, testAI, testDatabase, updateAI, updateDatabase, updateRules } from '../controllers/settingsController';

const router = Router();

router.get('/settings', getSettings);
router.post('/settings/rules', updateRules);
router.post('/settings/database', updateDatabase);
router.post('/settings/database/test', testDatabase);
router.post('/settings/ai', updateAI);
router.post('/settings/ai/test', testAI);

export default router;
