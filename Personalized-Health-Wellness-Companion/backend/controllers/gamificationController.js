const Badge = require('../models/Badge');
const User = require('../models/User');
const {
  getLeaderboard,
  getUserRank,
  getUserAchievements
} = require('../services/gamificationService');
const { getStreakStats, getStreakHistory } = require('../services/streakService');
const logger = require('../utils/logger');

/**
 * @desc    Get all available badges
 * @route   GET /api/gamification/badges
 * @access  Private
 */
const getAllBadges = async (req, res, next) => {
  try {
    const badges = await Badge.find({ isActive: true }).sort({ order: 1, rarity: 1 });

    // Get user's earned badges
    const user = await User.findById(req.user.id).select('badges');
    const earnedBadgeIds = user.badges.map(b => b.badgeId.toString());

    // Mark which badges are earned
    const badgesWithStatus = badges.map(badge => ({
      ...badge.toObject(),
      isEarned: earnedBadgeIds.includes(badge._id.toString()),
      earnedAt: user.badges.find(b => b.badgeId.toString() === badge._id.toString())?.earnedAt
    }));

    res.status(200).json({
      success: true,
      count: badges.length,
      earnedCount: earnedBadgeIds.length,
      data: badgesWithStatus
    });
  } catch (error) {
    logger.error('Get all badges error:', error);
    next(error);
  }
};

/**
 * @desc    Get user's earned badges
 * @route   GET /api/gamification/badges/earned
 * @access  Private
 */
const getEarnedBadges = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('badges.badgeId')
      .select('badges totalPoints');

    const earnedBadges = user.badges
      .filter(b => b.badgeId) // Filter out any null references
      .sort((a, b) => b.earnedAt - a.earnedAt);

    res.status(200).json({
      success: true,
      count: earnedBadges.length,
      totalPoints: user.totalPoints,
      data: earnedBadges
    });
  } catch (error) {
    logger.error('Get earned badges error:', error);
    next(error);
  }
};

/**
 * @desc    Get user's streak information
 * @route   GET /api/gamification/streaks
 * @access  Private
 */
const getStreaks = async (req, res, next) => {
  try {
    const streakStats = await getStreakStats(req.user.id);

    res.status(200).json({
      success: true,
      data: streakStats
    });
  } catch (error) {
    logger.error('Get streaks error:', error);
    next(error);
  }
};

/**
 * @desc    Get streak history for visualization
 * @route   GET /api/gamification/streaks/history
 * @access  Private
 */
const getStreakHistoryData = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    
    const history = await getStreakHistory(req.user.id, parseInt(days));

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Get streak history error:', error);
    next(error);
  }
};

/**
 * @desc    Get leaderboard
 * @route   GET /api/gamification/leaderboard
 * @access  Private
 */
const getLeaderboardData = async (req, res, next) => {
  try {
    const { limit = 10, metric = 'totalPoints' } = req.query;

    const leaderboard = await getLeaderboard(parseInt(limit), metric);

    // Get current user's rank
    const userRank = await getUserRank(req.user.id, metric);

    res.status(200).json({
      success: true,
      leaderboard,
      userRank
    });
  } catch (error) {
    logger.error('Get leaderboard error:', error);
    next(error);
  }
};

/**
 * @desc    Get user's rank
 * @route   GET /api/gamification/rank
 * @access  Private
 */
const getUserRankData = async (req, res, next) => {
  try {
    const { metric ='totalPoints' } = req.query;

    const rank = await getUserRank(req.user.id, metric);
    const user = await User.findById(req.user.id).select('totalPoints currentWorkoutStreak longestWorkoutStreak');

    res.status(200).json({
      success: true,
      data: {
        rank,
        totalPoints: user.totalPoints,
        currentStreak: user.currentWorkoutStreak,
        longestStreak: user.longestWorkoutStreak
      }
    });
  } catch (error) {
    logger.error('Get user rank error:', error);
    next(error);
  }
};

/**
 * @desc    Get user's achievements summary
 * @route   GET /api/gamification/achievements
 * @access  Private
 */
const getAchievements = async (req, res, next) => {
  try {
    const achievements = await getUserAchievements(req.user.id);

    res.status(200).json({
      success: true,
      data: achievements
    });
  } catch (error) {
    logger.error('Get achievements error:', error);
    next(error);
  }
};

/**
 * @desc    Get points history
 * @route   GET /api/gamification/points/history
 * @access  Private
 */
const getPointsHistory = async (req, res, next) => {
  try {
    const { limit = 20, skip = 0 } = req.query;

    const ActivityLog = require('../models/ActivityLog');
    
    const pointsHistory = await ActivityLog.find({
      userId: req.user.id,
      pointsEarned: { $gt: 0 }
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('activityType description pointsEarned createdAt');

    const total = await ActivityLog.countDocuments({
      userId: req.user.id,
      pointsEarned: { $gt: 0 }
    });

    res.status(200).json({
      success: true,
      count: pointsHistory.length,
      total,
      data: pointsHistory
    });
  } catch (error) {
    logger.error('Get points history error:', error);
    next(error);
  }
};

module.exports = {
  getAllBadges,
  getEarnedBadges,
  getStreaks,
  getStreakHistoryData,
  getLeaderboardData,
  getUserRankData,
  getAchievements,
  getPointsHistory
};