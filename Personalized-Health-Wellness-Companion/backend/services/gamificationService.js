const User = require('../models/User');
const Badge = require('../models/Badge');
const ActivityLog = require('../models/ActivityLog');
const BiometricData = require('../models/BiometricData');
const WorkoutPlan = require('../models/WorkoutPlan');
const Goal = require('../models/Goal');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

/**
 * Award points to user
 */
const awardPoints = async (userId, points, reason) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    user.totalPoints += points;
    await user.save();

    // Log activity
    await ActivityLog.create({
      userId,
      activityType: 'points_earned',
      description: `Earned ${points} points: ${reason}`,
      pointsEarned: points
    });

    logger.info(`✅ Awarded ${points} points to user ${userId}`);
    return user.totalPoints;
  } catch (error) {
    logger.error('Award points error:', error);
    throw error;
  }
};

/**
 * Check and award badges based on achievements
 */
const checkAndAwardBadges = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const allBadges = await Badge.find({ isActive: true });
    const earnedBadgeIds = user.badges.map(b => b.badgeId.toString());
    const newBadgesEarned = [];

    for (const badge of allBadges) {
      // Skip if already earned
      if (earnedBadgeIds.includes(badge._id.toString())) continue;

      let hasEarned = false;

      switch (badge.criteria.type) {
        case 'streak':
          hasEarned = await checkStreakBadge(userId, badge);
          break;
        case 'count':
          hasEarned = await checkCountBadge(userId, badge);
          break;
        case 'value':
          hasEarned = await checkValueBadge(userId, badge);
          break;
        case 'custom':
          hasEarned = await checkCustomBadge(userId, badge);
          break;
      }

      if (hasEarned) {
        // Award badge
        user.badges.push({
          badgeId: badge._id,
          earnedAt: new Date()
        });

        // Award points
        user.totalPoints += badge.points;

        newBadgesEarned.push(badge);

        // Create notification
        await Notification.create({
          userId,
          type: 'badge_earned',
          title: '🎉 New Badge Earned!',
          message: `Congratulations! You've earned the "${badge.name}" badge!`,
          relatedId: badge._id,
          relatedModel: 'Badge',
          priority: 'high'
        });

        // Log activity
        await ActivityLog.create({
          userId,
          activityType: 'badge_earned',
          description: `Earned badge: ${badge.name}`,
          relatedId: badge._id,
          relatedModel: 'Badge',
          pointsEarned: badge.points
        });

        logger.info(`🏆 User ${userId} earned badge: ${badge.name}`);
      }
    }

    if (newBadgesEarned.length > 0) {
      await user.save();
    }

    return newBadgesEarned;
  } catch (error) {
    logger.error('Check badges error:', error);
    return [];
  }
};

/**
 * Check streak-based badge
 */
const checkStreakBadge = async (userId, badge) => {
  const user = await User.findById(userId);
  
  switch (badge.criteria.metric) {
    case 'workout_streak':
      return user.currentWorkoutStreak >= badge.criteria.target;
    case 'water_goal_streak':
      // Check water intake streak from biometric data
      const waterStreak = await calculateWaterStreak(userId);
      return waterStreak >= badge.criteria.target;
    default:
      return false;
  }
};

/**
 * Check count-based badge
 */
const checkCountBadge = async (userId, badge) => {
  switch (badge.criteria.metric) {
    case 'workouts_completed':
      const totalWorkouts = await ActivityLog.countDocuments({
        userId,
        activityType: 'workout_completed'
      });
      return totalWorkouts >= badge.criteria.target;

    case 'meal_plans_completed':
      const completedMealPlans = await ActivityLog.countDocuments({
        userId,
        activityType: 'meal_logged'
      });
      return completedMealPlans >= badge.criteria.target;

    case 'goals_completed':
      const completedGoals = await Goal.countDocuments({
        userId,
        status: 'completed'
      });
      return completedGoals >= badge.criteria.target;

    case 'encouragements_given':
      const encouragements = await ActivityLog.countDocuments({
        userId,
        activityType: 'community_post',
        'metadata.postType': 'motivation'
      });
      return encouragements >= badge.criteria.target;

    default:
      return false;
  }
};

/**
 * Check value-based badge (e.g., weight lost)
 */
const checkValueBadge = async (userId, badge) => {
  const user = await User.findById(userId);
  
  switch (badge.criteria.metric) {
    case 'weight_lost':
      // Get first weight entry
      const firstWeight = await BiometricData.findOne({
        userId,
        type: 'weight'
      }).sort({ date: 1 });

      // Get latest weight
      const latestWeight = await BiometricData.getLatestByType(userId, 'weight');

      if (firstWeight && latestWeight) {
        const weightLost = firstWeight.value - latestWeight.value;
        return weightLost >= badge.criteria.target;
      }
      return false;

    default:
      return false;
  }
};

/**
 * Check custom badge criteria
 */
const checkCustomBadge = async (userId, badge) => {
  const user = await User.findById(userId);
  
  switch (badge.criteria.metric) {
    case 'goal_weight_reached':
      const weightGoal = await Goal.findOne({
        userId,
        type: 'weight',
        status: 'completed'
      });
      return !!weightGoal;

    case 'community_joined':
      // Check if user has made any community post
      const hasPosted = await ActivityLog.findOne({
        userId,
        activityType: 'community_post'
      });
      return !!hasPosted;

    default:
      return false;
  }
};

/**
 * Calculate water intake streak
 */
const calculateWaterStreak = async (userId) => {
  const user = await User.findById(userId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let checkDate = new Date(today);

  // Check backwards from today
  for (let i = 0; i < 365; i++) {
    const nextDay = new Date(checkDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const waterIntake = await BiometricData.findOne({
      userId,
      type: 'water_intake',
      date: {
        $gte: checkDate,
        $lt: nextDay
      }
    });

    // Assuming goal is 2000ml
    if (waterIntake && waterIntake.value >= 2000) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
};

/**
 * Get user's leaderboard position
 */
const getLeaderboard = async (limit = 10, metric = 'totalPoints') => {
  try {
    let sortCriteria = {};
    
    switch (metric) {
      case 'totalPoints':
        sortCriteria = { totalPoints: -1 };
        break;
      case 'currentWorkoutStreak':
        sortCriteria = { currentWorkoutStreak: -1 };
        break;
      case 'longestWorkoutStreak':
        sortCriteria = { longestWorkoutStreak: -1 };
        break;
      default:
        sortCriteria = { totalPoints: -1 };
    }

    const leaderboard = await User.find({
      accountStatus: 'active'
    })
      .select('name profilePicture totalPoints currentWorkoutStreak longestWorkoutStreak')
      .sort(sortCriteria)
      .limit(limit);

    return leaderboard.map((user, index) => ({
      rank: index + 1,
      userId: user._id,
      name: user.name,
      profilePicture: user.profilePicture?.url,
      totalPoints: user.totalPoints,
      currentStreak: user.currentWorkoutStreak,
      longestStreak: user.longestWorkoutStreak
    }));
  } catch (error) {
    logger.error('Leaderboard error:', error);
    throw error;
  }
};

/**
 * Get user's rank
 */
const getUserRank = async (userId, metric = 'totalPoints') => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    let higherRankedCount;
    
    switch (metric) {
      case 'totalPoints':
        higherRankedCount = await User.countDocuments({
          accountStatus: 'active',
          totalPoints: { $gt: user.totalPoints }
        });
        break;
      case 'currentWorkoutStreak':
        higherRankedCount = await User.countDocuments({
          accountStatus: 'active',
          currentWorkoutStreak: { $gt: user.currentWorkoutStreak }
        });
        break;
      default:
        higherRankedCount = await User.countDocuments({
          accountStatus: 'active',
          totalPoints: { $gt: user.totalPoints }
        });
    }

    return higherRankedCount + 1;
  } catch (error) {
    logger.error('Get user rank error:', error);
    throw error;
  }
};

/**
 * Get user's achievements summary
 */
const getUserAchievements = async (userId) => {
  try {
    const user = await User.findById(userId).populate('badges.badgeId');
    
    const totalWorkouts = await ActivityLog.countDocuments({
      userId,
      activityType: 'workout_completed'
    });

    const completedGoals = await Goal.countDocuments({
      userId,
      status: 'completed'
    });

    const totalActivities = await ActivityLog.countDocuments({ userId });

    return {
      totalPoints: user.totalPoints,
      badges: user.badges.map(b => ({
        badge: b.badgeId,
        earnedAt: b.earnedAt
      })),
      currentStreak: user.currentWorkoutStreak,
      longestStreak: user.longestWorkoutStreak,
      totalWorkouts,
      completedGoals,
      totalActivities,
      rank: await getUserRank(userId)
    };
  } catch (error) {
    logger.error('Get achievements error:', error);
    throw error;
  }
};

module.exports = {
  awardPoints,
  checkAndAwardBadges,
  getLeaderboard,
  getUserRank,
  getUserAchievements
};