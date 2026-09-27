import express from 'express';
import {
  createGoal,
  getGoals,
  contributeToGoal,
  deleteGoal,
} from '../controllers/goalController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getGoals)
  .post(createGoal);

router.post('/:id/contribute', contributeToGoal);
router.delete('/:id', deleteGoal);

export default router;
