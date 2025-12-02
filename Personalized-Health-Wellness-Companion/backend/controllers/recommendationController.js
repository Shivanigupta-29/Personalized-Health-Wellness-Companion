const WorkoutPlan = require('../models/WorkoutPlan');
const MealPlan = require('../models/MealPlan');
const ActivityLog = require('../models/ActivityLog');
const {
  generateWorkoutPlan,
  generateMealPlan,
  generateMindfulnessExercises
} = require('../services/aiRecommendationService');
const { awardPoints, checkAndAwardBadges } = require('../services/gamificationService');
const logger = require('../utils/logger');

/**
 * @desc    Generate personalized workout plan
 * @route   POST /api/recommendations/workouts/generate
 * @access  Private
 */
const generateWorkout = async (req, res, next) => {
  try {
    const { duration = 7 } = req.body;

    // Check if user has an active workout plan
    const existingPlan = await WorkoutPlan.findOne({
      userId: req.user.id,
      status: 'active'
    });

    if (existingPlan) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active workout plan. Please complete or pause it first.',
        existingPlan
      });
    }

    // Generate workout plan
    const planData = await generateWorkoutPlan(req.user.id, duration);

    // Save to database
    const workoutPlan = await WorkoutPlan.create(planData);

    // Award points
    await awardPoints(req.user.id, 20, 'Generated workout plan');

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      activityType: 'workout_plan_generated',
      description: `Generated ${duration}-day workout plan`,
      relatedId: workoutPlan._id,
      relatedModel: 'WorkoutPlan',
      pointsEarned: 20
    });

    res.status(201).json({
      success: true,
      message: 'Workout plan generated successfully',
      data: workoutPlan
    });
  } catch (error) {
    logger.error('Generate workout error:', error);
    next(error);
  }
};

/**
 * @desc    Get user's workout plans
 * @route   GET /api/recommendations/workouts
 * @access  Private
 */
const getWorkoutPlans = async (req, res, next) => {
  try {
    const { status = 'active' } = req.query;

    const query = { userId: req.user.id };
    if (status !== 'all') {
      query.status = status;
    }

    const workoutPlans = await WorkoutPlan.find(query)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: workoutPlans.length,
      data: workoutPlans
    });
  } catch (error) {
    logger.error('Get workout plans error:', error);
    next(error);
  }
};

/**
 * @desc    Get workout plan by ID
 * @route   GET /api/recommendations/workouts/:id
 * @access  Private
 */
const getWorkoutPlanById = async (req, res, next) => {
  try {
    const workoutPlan = await WorkoutPlan.findById(req.params.id);

    if (!workoutPlan) {
      return res.status(404).json({
        success: false,
        message: 'Workout plan not found'
      });
    }

    // Make sure user owns the plan
    if (workoutPlan.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this workout plan'
      });
    }

    res.status(200).json({
      success: true,
      data: workoutPlan
    });
  } catch (error) {
    logger.error('Get workout plan by ID error:', error);
    next(error);
  }
};

/**
 * @desc    Complete workout day
 * @route   PUT /api/recommendations/workouts/:id/complete-day
 * @access  Private
 */
const completeWorkoutDay = async (req, res, next) => {
  try {
    const { dayNumber, notes } = req.body;

    const workoutPlan = await WorkoutPlan.findById(req.params.id);

    if (!workoutPlan) {
      return res.status(404).json({
        success: false,
        message: 'Workout plan not found'
      });
    }

    // Make sure user owns the plan
    if (workoutPlan.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this workout plan'
      });
    }

    // Mark day as completed
    await workoutPlan.completeDay(dayNumber);

    // Award points
    await awardPoints(req.user.id, 15, 'Completed workout day');

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      activityType: 'workout_completed',
      description: `Completed day ${dayNumber} of workout plan`,
      relatedId: workoutPlan._id,
      relatedModel: 'WorkoutPlan',
      metadata: { dayNumber, notes },
      pointsEarned: 15
    });

    // Update streak
    const { updateWorkoutStreak } = require('../services/streakService');
    await updateWorkoutStreak(req.user.id);

    // Check for badges
    await checkAndAwardBadges(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Workout day completed successfully',
      data: workoutPlan
    });
  } catch (error) {
    logger.error('Complete workout day error:', error);
    next(error);
  }
};

/**
 * @desc    Update workout plan status
 * @route   PUT /api/recommendations/workouts/:id/status
 * @access  Private
 */
const updateWorkoutStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const workoutPlan = await WorkoutPlan.findById(req.params.id);

    if (!workoutPlan) {
      return res.status(404).json({
        success: false,
        message: 'Workout plan not found'
      });
    }

    // Make sure user owns the plan
    if (workoutPlan.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this workout plan'
      });
    }

    workoutPlan.status = status;
    await workoutPlan.save();

    res.status(200).json({
      success: true,
      message: 'Workout plan status updated',
      data: workoutPlan
    });
  } catch (error) {
    logger.error('Update workout status error:', error);
    next(error);
  }
};

/**
 * @desc    Rate workout plan
 * @route   PUT /api/recommendations/workouts/:id/rate
 * @access  Private
 */
const rateWorkoutPlan = async (req, res, next) => {
  try {
    const { rating, feedback } = req.body;

    const workoutPlan = await WorkoutPlan.findById(req.params.id);

    if (!workoutPlan) {
      return res.status(404).json({
        success: false,
        message: 'Workout plan not found'
      });
    }

    // Make sure user owns the plan
    if (workoutPlan.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to rate this workout plan'
      });
    }

    workoutPlan.rating = rating;
    workoutPlan.feedback = feedback;
    await workoutPlan.save();

    res.status(200).json({
      success: true,
      message: 'Thank you for your feedback!',
      data: workoutPlan
    });
  } catch (error) {
    logger.error('Rate workout plan error:', error);
    next(error);
  }
};

/**
 * @desc    Generate personalized meal plan
 * @route   POST /api/recommendations/meals/generate
 * @access  Private
 */
const generateMeal = async (req, res, next) => {
  try {
    const { duration = 7 } = req.body;

    // Check if user has an active meal plan
    const existingPlan = await MealPlan.findOne({
      userId: req.user.id,
      status: 'active'
    });

    if (existingPlan) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active meal plan. Please complete or pause it first.',
        existingPlan
      });
    }

    // Generate meal plan
    const planData = await generateMealPlan(req.user.id, duration);

    // Save to database
    const mealPlan = await MealPlan.create(planData);

    // Award points
    await awardPoints(req.user.id, 20, 'Generated meal plan');

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      activityType: 'meal_plan_generated',
      description: `Generated ${duration}-day meal plan`,
      relatedId: mealPlan._id,
      relatedModel: 'MealPlan',
      pointsEarned: 20
    });

    res.status(201).json({
      success: true,
      message: 'Meal plan generated successfully',
      data: mealPlan
    });
  } catch (error) {
    logger.error('Generate meal error:', error);
    next(error);
  }
};

/**
 * @desc    Get user's meal plans
 * @route   GET /api/recommendations/meals
 * @access  Private
 */
const getMealPlans = async (req, res, next) => {
  try {
    const { status = 'active' } = req.query;

    const query = { userId: req.user.id };
    if (status !== 'all') {
      query.status = status;
    }

    const mealPlans = await MealPlan.find(query)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: mealPlans.length,
      data: mealPlans
    });
  } catch (error) {
    logger.error('Get meal plans error:', error);
    next(error);
  }
};

/**
 * @desc    Get meal plan by ID
 * @route   GET /api/recommendations/meals/:id
 * @access  Private
 */
const getMealPlanById = async (req, res, next) => {
  try {
    const mealPlan = await MealPlan.findById(req.params.id);

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: 'Meal plan not found'
      });
    }

    // Make sure user owns the plan
    if (mealPlan.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this meal plan'
      });
    }

    res.status(200).json({
      success: true,
      data: mealPlan
    });
  } catch (error) {
    logger.error('Get meal plan by ID error:', error);
    next(error);
  }
};

/**
 * @desc    Complete meal
 * @route   PUT /api/recommendations/meals/:id/complete-meal
 * @access  Private
 */
const completeMeal = async (req, res, next) => {
  try {
    const { dayNumber, mealIndex, rating } = req.body;

    const mealPlan = await MealPlan.findById(req.params.id);

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: 'Meal plan not found'
      });
    }

    // Make sure user owns the plan
    if (mealPlan.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this meal plan'
      });
    }

    // Mark meal as completed
    await mealPlan.completeMeal(dayNumber, mealIndex);

    // If rating provided, update it
    if (rating && mealPlan.days[dayNumber - 1]?.meals[mealIndex]) {
      mealPlan.days[dayNumber - 1].meals[mealIndex].rating = rating;
      await mealPlan.save();
    }

    // Award points
    await awardPoints(req.user.id, 5, 'Completed meal');

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      activityType: 'meal_logged',
      description: 'Completed a meal',
      relatedId: mealPlan._id,
      relatedModel: 'MealPlan',
      metadata: { dayNumber, mealIndex },
      pointsEarned: 5
    });

    res.status(200).json({
      success: true,
      message: 'Meal completed successfully',
      data: mealPlan
    });
  } catch (error) {
    logger.error('Complete meal error:', error);
    next(error);
  }
};

/**
 * @desc    Update meal plan status
 * @route   PUT /api/recommendations/meals/:id/status
 * @access  Private
 */
const updateMealStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const mealPlan = await MealPlan.findById(req.params.id);

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: 'Meal plan not found'
      });
    }

    // Make sure user owns the plan
    if (mealPlan.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this meal plan'
      });
    }

    mealPlan.status = status;
    await mealPlan.save();

    res.status(200).json({
      success: true,
      message: 'Meal plan status updated',
      data: mealPlan
    });
  } catch (error) {
    logger.error('Update meal status error:', error);
    next(error);
  }
};

/**
 * @desc    Get mindfulness exercises
 * @route   GET /api/recommendations/mindfulness
 * @access  Private
 */
const getMindfulnessExercises = async (req, res, next) => {
  try {
    const exercises = await generateMindfulnessExercises(req.user.id);

    res.status(200).json({
      success: true,
      count: exercises.length,
      data: exercises
    });
  } catch (error) {
    logger.error('Get mindfulness exercises error:', error);
    next(error);
  }
};

/**
 * @desc    Provide feedback on recommendations
 * @route   POST /api/recommendations/feedback
 * @access  Private
 */
const provideFeedback = async (req, res, next) => {
  try {
    const { planType, planId, rating, feedback, helpful } = req.body;

    let plan;
    if (planType === 'workout') {
      plan = await WorkoutPlan.findById(planId);
    } else if (planType === 'meal') {
      plan = await MealPlan.findById(planId);
    }

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // Make sure user owns the plan
    if (plan.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to provide feedback for this plan'
      });
    }

    plan.rating = rating;
    plan.feedback = feedback;
    await plan.save();

    // Log feedback
    await ActivityLog.create({
      userId: req.user.id,
      activityType: 'feedback_provided',
      description: `Provided feedback for ${planType} plan`,
      metadata: { planType, rating, helpful }
    });

    res.status(200).json({
      success: true,
      message: 'Thank you for your feedback!'
    });
  } catch (error) {
    logger.error('Provide feedback error:', error);
    next(error);
  }
};

module.exports = {
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
};