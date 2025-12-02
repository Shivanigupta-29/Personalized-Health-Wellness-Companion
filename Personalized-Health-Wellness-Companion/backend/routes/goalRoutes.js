const express = require('express');
const router = express.Router();
const {
  createGoal,
  getGoals,
  getGoalById,
  updateGoalProgress,
  updateGoal,
  deleteGoal,
  getGoalStats
} = require('../controllers/goalController');
const { protect } = require('../middleware/auth');
const { validate, validationSchemas } = require('../middleware/validator');

// All routes are protected
router.use(protect);

// Goal routes
router.post('/', validate(validationSchemas.goal), createGoal);
router.get('/', getGoals);
router.get('/stats', getGoalStats);
router.get('/:id', getGoalById);
router.put('/:id/progress', updateGoalProgress);
router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);

module.exports = router;