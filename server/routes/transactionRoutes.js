import express from 'express';
import {
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionSummary,
  getMultiMonthAnalysisController,
} from '../controllers/transactionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All transaction operations require authentication
router.use(protect);

router.route('/')
  .get(getTransactions)
  .post(createTransaction);

router.get('/summary', getTransactionSummary);
router.get('/multi-month-analysis', getMultiMonthAnalysisController);

router.route('/:id')
  .get(getTransaction)
  .put(updateTransaction)
  .delete(deleteTransaction);

export default router;
