const express = require('express');
const router = express.Router();
const {
  generateWorkout,
  getWorkoutPlans,
  getWorkoutPlanById,
  completeWorkoutDay,
  updateWorkoutStatus,
  rateWorkoutPlan,
  generateMeal,
  getMealPlans,
  getMealPlanById,
  completeMeal,
  updateMealStatus,
  getMindfulnessExercises,
  provideFeedback
} = require('../controllers/recommendationController');
const { protect } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');

// All routes are protected
router.use(protect);

// Workout routes
router.post('/workouts/generate', aiLimiter, generateWorkout);
router.get('/workouts', getWorkoutPlans);
router.get('/workouts/:id', getWorkoutPlanById);
router.put('/workouts/:id/complete-day', completeWorkoutDay);
router.put('/workouts/:id/status', updateWorkoutStatus);
router.put('/workouts/:id/rate', rateWorkoutPlan);

// Meal routes
router.post('/meals/generate', aiLimiter, generateMeal);
router.get('/meals', getMealPlans);
router.get('/meals/:id', getMealPlanById);
router.put('/meals/:id/complete-meal', completeMeal);
router.put('/meals/:id/status', updateMealStatus);

// Mindfulness routes
router.get('/mindfulness', getMindfulnessExercises);

// Feedback
router.post('/feedback', provideFeedback);

module.exports = router;