const express = require('express');
const router = express.Router();
const {
  getAllBadges,
  getEarnedBadges,
  getStreaks,
  getStreakHistoryData,
  getLeaderboardData,
  getUserRankData,
  getAchievements,
  getPointsHistory
} = require('../controllers/gamificationController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// Badge routes
router.get('/badges', getAllBadges);
router.get('/badges/earned', getEarnedBadges);

// Streak routes
router.get('/streaks', getStreaks);
router.get('/streaks/history', getStreakHistoryData);

// Leaderboard and ranking
router.get('/leaderboard', getLeaderboardData);
router.get('/rank', getUserRankData);

// Achievements
router.get('/achievements', getAchievements);

// Points history
router.get('/points/history', getPointsHistory);

module.exports = router;