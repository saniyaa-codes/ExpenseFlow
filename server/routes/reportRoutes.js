import express from 'express';
import { getMonthlyReport, exportTransactionsCSV } from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/monthly', getMonthlyReport);
router.get('/export-csv', exportTransactionsCSV);

export default router;
