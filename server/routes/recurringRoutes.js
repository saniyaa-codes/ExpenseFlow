import express from 'express';
import {
  getRecurringPlan,
  setRecurringPlan,
  toggleRecurringPlan,
  deleteRecurringPlan,
  triggerRecurringNow,
} from '../controllers/recurringController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All recurring routes require authentication
router.use(protect);

router.route('/')
  .get(getRecurringPlan)
  .post(setRecurringPlan)
  .delete(deleteRecurringPlan);

router.patch('/toggle', toggleRecurringPlan);
router.post('/trigger-now', triggerRecurringNow);

export default router;
