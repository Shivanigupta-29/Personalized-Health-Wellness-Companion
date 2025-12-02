const Goal = require('../models/Goal');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const { awardPoints, checkAndAwardBadges } = require('../services/gamificationService');
const logger = require('../utils/logger');

/**
 * @desc    Create new goal
 * @route   POST /api/goals
 * @access  Private
 */
const createGoal = async (req, res, next) => {
  try {
    const goalData = {
      ...req.body,
      userId: req.user.id,
      startValue: req.body.currentValue
    };

    const goal = await Goal.create(goalData);

    // Award points
    await awardPoints(req.user.id, 10, 'Created new goal');

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      activityType: 'goal_created',
      description: `Created goal: ${goal.title}`,
      relatedId: goal._id,
      relatedModel: 'Goal',
      pointsEarned: 10
    });

    res.status(201).json({
      success: true,
      message: 'Goal created successfully',
      data: goal
    });
  } catch (error) {
    logger.error('Create goal error:', error);
    next(error);
  }
};

/**
 * @desc    Get all user goals
 * @route   GET /api/goals
 * @access  Private
 */
const getGoals = async (req, res, next) => {
  try {
    const { status = 'active', type } = req.query;

    const query = { userId: req.user.id };
    
    if (status !== 'all') {
      query.status = status;
    }
    
    if (type) {
      query.type = type;
    }

    const goals = await Goal.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: goals.length,
      data: goals
    });
  } catch (error) {
    logger.error('Get goals error:', error);
    next(error);
  }
};

/**
 * @desc    Get goal by ID
 * @route   GET /api/goals/:id
 * @access  Private
 */
const getGoalById = async (req, res, next) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Make sure user owns the goal
    if (goal.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this goal'
      });
    }

    res.status(200).json({
      success: true,
      data: goal
    });
  } catch (error) {
    logger.error('Get goal by ID error:', error);
    next(error);
  }
};

/**
 * @desc    Update goal progress
 * @route   PUT /api/goals/:id/progress
 * @access  Private
 */
const updateGoalProgress = async (req, res, next) => {
  try {
    const { currentValue, notes } = req.body;

    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Make sure user owns the goal
    if (goal.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this goal'
      });
    }

    // Update progress
    await goal.updateProgress(currentValue, notes);

    // Award points
    await awardPoints(req.user.id, 5, 'Updated goal progress');

    // Check if goal was just completed
    if (goal.status === 'completed') {
      // Award bonus points for completion
      await awardPoints(req.user.id, 50, `Completed goal: ${goal.title}`);

      // Create notification
      await Notification.create({
        userId: req.user.id,
        type: 'goal_milestone',
        title: '🎉 Goal Completed!',
        message: `Congratulations! You've achieved your goal: ${goal.title}`,
        relatedId: goal._id,
        relatedModel: 'Goal',
        priority: 'high'
      });

      // Log activity
      await ActivityLog.create({
        userId: req.user.id,
        activityType: 'goal_completed',
        description: `Completed goal: ${goal.title}`,
        relatedId: goal._id,
        relatedModel: 'Goal',
        pointsEarned: 50
      });

      // Check for badges
      await checkAndAwardBadges(req.user.id);
    }

    res.status(200).json({
      success: true,
      message: goal.status === 'completed' ? 'Goal completed! 🎉' : 'Progress updated successfully',
      data: goal
    });
  } catch (error) {
    logger.error('Update goal progress error:', error);
    next(error);
  }
};

/**
 * @desc    Update goal
 * @route   PUT /api/goals/:id
 * @access  Private
 */
const updateGoal = async (req, res, next) => {
  try {
    let goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Make sure user owns the goal
    if (goal.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this goal'
      });
    }

    goal = await Goal.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'Goal updated successfully',
      data: goal
    });
  } catch (error) {
    logger.error('Update goal error:', error);
    next(error);
  }
};

/**
 * @desc    Delete goal
 * @route   DELETE /api/goals/:id
 * @access  Private
 */
const deleteGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Make sure user owns the goal
    if (goal.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this goal'
      });
    }

    await goal.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Goal deleted successfully'
    });
  } catch (error) {
    logger.error('Delete goal error:', error);
    next(error);
  }
};

/**
 * @desc    Get goal statistics
 * @route   GET /api/goals/stats
 * @access  Private
 */
const getGoalStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const totalGoals = await Goal.countDocuments({ userId });
    const activeGoals = await Goal.countDocuments({ userId, status: 'active' });
    const completedGoals = await Goal.countDocuments({ userId, status: 'completed' });
    const pausedGoals = await Goal.countDocuments({ userId, status: 'paused' });

    // Calculate completion rate
    const completionRate = totalGoals > 0 
      ? ((completedGoals / totalGoals) * 100).toFixed(1) 
      : 0;

    // Get goals by type
    const goalsByType = await Goal.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get upcoming deadlines
    const upcomingDeadlines = await Goal.find({
      userId,
      status: 'active',
      deadline: { $gte: new Date() }
    })
      .sort({ deadline: 1 })
      .limit(5)
      .select('title deadline type progressPercentage');

    res.status(200).json({
      success: true,
      stats: {
        total: totalGoals,
        active: activeGoals,
        completed: completedGoals,
        paused: pausedGoals,
        completionRate: `${completionRate}%`,
        byType: goalsByType,
        upcomingDeadlines
      }
    });
  } catch (error) {
    logger.error('Get goal stats error:', error);
    next(error);
  }
};

module.exports = {
  createGoal,
  getGoals,
  getGoalById,
  updateGoalProgress,
  updateGoal,
  deleteGoal,
  getGoalStats
};