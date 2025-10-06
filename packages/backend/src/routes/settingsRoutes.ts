import { Router } from 'express';
import { getSettings, testAI, testDatabase, updateAI, updateDatabase, updateRules,
  createRules, createSchema, createDatabase, updateSchema, getAllDatabases, switchDatabase, getRules, getSchema,
  getAIConfig, updateAIProvider, updateAIConfig, testAIConnection } from '../controllers/settingsController';

const router = Router();

router.get('/settings', getSettings);
router.get('/settings/rules', getRules);
router.post('/settings/rules', createRules);
router.put('/settings/rules/save', updateRules);
router.get('/settings/schema', getSchema);
router.post('/settings/schema', createSchema);
router.put('/settings/schema/save', updateSchema);
router.post('/settings/database', createDatabase);
router.post('/settings/database/create', createDatabase);
router.put('/settings/database/save', updateDatabase);
router.post('/settings/database/test', testDatabase);
router.get('/settings/databases', getAllDatabases);
router.post('/settings/databases/:databaseId/switch', switchDatabase);
router.post('/settings/ai', updateAI);
router.post('/settings/ai/test', testAI);

// New AI provider endpoints
router.get('/settings/ai/config', getAIConfig);
router.post('/settings/ai/provider', updateAIProvider);
router.put('/settings/ai/config', updateAIConfig);
router.post('/settings/ai/test-connection', testAIConnection);

export default router;
