import { Router } from 'express';
import { listDatabases, switchDatabase } from '../controllers/databaseController';

const router = Router();

router.get('/databases', listDatabases);
router.post('/databases/:id/switch', switchDatabase);

export default router;
