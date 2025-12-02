const User = require('../models/User');
const WorkoutPlan = require('../models/WorkoutPlan');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const { startOfDay, endOfDay, subDays } = require('date-fns');
const logger = require('../utils/logger');

/**
 * Update workout streak
 */
const updateWorkoutStreak = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const today = startOfDay(new Date());
    const yesterday = startOfDay(subDays(today, 1));

    // Check if workout was logged today
    const todayWorkout = await ActivityLog.findOne({
      userId,
      activityType: 'workout_completed',
      createdAt: {
        $gte: today,
        $lte: endOfDay(new Date())
      }
    });

    // If already logged today, don't update
    if (user.lastWorkoutDate && 
        startOfDay(user.lastWorkoutDate).getTime() === today.getTime()) {
      return user.currentWorkoutStreak;
    }

    // Check if there was a workout yesterday
    const yesterdayWorkout = await ActivityLog.findOne({
      userId,
      activityType: 'workout_completed',
      createdAt: {
        $gte: yesterday,
        $lte: endOfDay(yesterday)
      }
    });

    if (todayWorkout) {
      if (yesterdayWorkout || !user.lastWorkoutDate) {
        // Continue streak
        user.currentWorkoutStreak += 1;
      } else {
        // Start new streak
        user.currentWorkoutStreak = 1;
      }

      // Update longest streak
      if (user.currentWorkoutStreak > user.longestWorkoutStreak) {
        user.longestWorkoutStreak = user.currentWorkoutStreak;
      }

      user.lastWorkoutDate = new Date();

      // Check for streak milestones
      await checkStreakMilestones(user);

      await user.save();
      logger.info(`✅ Updated streak for user ${userId}: ${user.currentWorkoutStreak} days`);
    }

    return user.currentWorkoutStreak;
  } catch (error) {
    logger.error('Update workout streak error:', error);
    throw error;
  }
};

/**
 * Check streak milestones and notify
 */
const checkStreakMilestones = async (user) => {
  const milestones = [3, 7, 14, 21, 30, 50, 100, 365];
  
  if (milestones.includes(user.currentWorkoutStreak)) {
    await Notification.create({
      userId: user._id,
      type: 'streak_milestone',
      title: `🔥 ${user.currentWorkoutStreak}-Day Streak!`,
      message: `Amazing! You've maintained a ${user.currentWorkoutStreak}-day workout streak. Keep it up!`,
      priority: 'high'
    });

    // Award bonus points for major milestones
    if ([7, 30, 100].includes(user.currentWorkoutStreak)) {
      const bonusPoints = user.currentWorkoutStreak === 7 ? 50 : 
                         user.currentWorkoutStreak === 30 ? 200 : 500;
      user.totalPoints += bonusPoints;

      await ActivityLog.create({
        userId: user._id,
        activityType: 'streak_milestone',
        description: `Reached ${user.currentWorkoutStreak}-day streak`,
        pointsEarned: bonusPoints
      });
    }
  }
};

/**
 * Reset streak if missed workout
 */
const checkAndResetStreak = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.lastWorkoutDate) return;

    const today = startOfDay(new Date());
    const lastWorkout = startOfDay(user.lastWorkoutDate);
    
    // Calculate days since last workout
    const daysSinceLastWorkout = Math.floor(
      (today - lastWorkout) / (1000 * 60 * 60 * 24)
    );

    // If more than 1 day gap, reset streak
    if (daysSinceLastWorkout > 1 && user.currentWorkoutStreak > 0) {
      const oldStreak = user.currentWorkoutStreak;
      user.currentWorkoutStreak = 0;
      await user.save();

      // Notify user about broken streak
      await Notification.create({
        userId,
        type: 'streak_milestone',
        title: '😔 Streak Broken',
        message: `Your ${oldStreak}-day workout streak has ended. Start a new one today!`,
        priority: 'medium'
      });

      logger.info(`⚠️ Reset streak for user ${userId} (was ${oldStreak} days)`);
    }
  } catch (error) {
    logger.error('Check and reset streak error:', error);
  }
};

/**
 * Get streak statistics
 */
const getStreakStats = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Calculate total workout days
    const totalWorkoutDays = await ActivityLog.countDocuments({
      userId,
      activityType: 'workout_completed'
    });

    // Get workout frequency (last 30 days)
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentWorkouts = await ActivityLog.countDocuments({
      userId,
      activityType: 'workout_completed',
      createdAt: { $gte: thirtyDaysAgo }
    });

    const frequency = ((recentWorkouts / 30) * 100).toFixed(1);

    // Days until next milestone
    const milestones = [3, 7, 14, 21, 30, 50, 100, 365];
    const nextMilestone = milestones.find(m => m > user.currentWorkoutStreak) || null;
    const daysToMilestone = nextMilestone ? nextMilestone - user.currentWorkoutStreak : null;

    return {
      currentStreak: user.currentWorkoutStreak,
      longestStreak: user.longestWorkoutStreak,
      totalWorkoutDays,
      lastWorkoutDate: user.lastWorkoutDate,
      workoutFrequency: `${frequency}%`,
      nextMilestone,
      daysToMilestone,
      streakStatus: user.currentWorkoutStreak > 0 ? 'active' : 'inactive'
    };
  } catch (error) {
    logger.error('Get streak stats error:', error);
    throw error;
  }
};

/**
 * Get streak history (for chart)
 */
const getStreakHistory = async (userId, days = 30) => {
  try {
    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    const workouts = await ActivityLog.find({
      userId,
      activityType: 'workout_completed',
      createdAt: { $gte: startDate, $lte: endDate }
    }).sort({ createdAt: 1 });

    // Create array of all dates
    const history = [];
    for (let i = 0; i < days; i++) {
      const date = subDays(new Date(), days - 1 - i);
      const dateStr = startOfDay(date).toISOString();
      
      const hasWorkout = workouts.some(w => 
        startOfDay(w.createdAt).getTime() === startOfDay(date).getTime()
      );

      history.push({
        date: dateStr,
        hasWorkout,
        dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' })
      });
    }

    return history;
  } catch (error) {
    logger.error('Get streak history error:', error);
    throw error;
  }
};

module.exports = {
  updateWorkoutStreak,
  checkAndResetStreak,
  getStreakStats,
  getStreakHistory
};