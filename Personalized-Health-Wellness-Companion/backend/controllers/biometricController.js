const BiometricData = require('../models/BiometricData');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { getDateRange } = require('../utils/helpers');
const { checkAndAwardBadges, awardPoints } = require('../services/gamificationService');
const logger = require('../utils/logger');

/**
 * @desc    Log new biometric data
 * @route   POST /api/biometrics
 * @access  Private
 */
const logBiometricData = async (req, res, next) => {
  try {
    const { type, value, unit, date, notes, additionalData } = req.body;

    // Create biometric data
    const biometricData = await BiometricData.create({
      userId: req.user.id,
      type,
      value,
      unit,
      date: date || new Date(),
      notes,
      additionalData,
      source: 'manual'
    });

    // Update user's weight if weight is logged
    if (type === 'weight') {
      await User.findByIdAndUpdate(req.user.id, { weight: value });
    }

    // Award points
    await awardPoints(req.user.id, 5, 'Logged biometric data');

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      activityType: 'biometric_logged',
      description: `Logged ${type}: ${value}${unit}`,
      relatedId: biometricData._id,
      relatedModel: 'BiometricData',
      pointsEarned: 5
    });

    // Check for badges
    await checkAndAwardBadges(req.user.id);

    res.status(201).json({
      success: true,
      message: 'Biometric data logged successfully',
      data: biometricData
    });
  } catch (error) {
    logger.error('Log biometric error:', error);
    next(error);
  }
};

/**
 * @desc    Get biometric data by type
 * @route   GET /api/biometrics/:type
 * @access  Private
 */
const getBiometricByType = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { days = 30, limit = 100 } = req.query;

    const { start, end } = getDateRange(parseInt(days));

    const data = await BiometricData.find({
      userId: req.user.id,
      type,
      date: { $gte: start, $lte: end }
    })
      .sort({ date: 1 })
      .limit(parseInt(limit));

    // Calculate statistics
    const values = data.map(d => d.value);
    const stats = {
      latest: data.length > 0 ? data[data.length - 1].value : null,
      average: values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : null,
      min: values.length > 0 ? Math.min(...values) : null,
      max: values.length > 0 ? Math.max(...values) : null,
      count: data.length
    };

    res.status(200).json({
      success: true,
      count: data.length,
      stats,
      data
    });
  } catch (error) {
    logger.error('Get biometric by type error:', error);
    next(error);
  }
};

/**
 * @desc    Get biometric summary
 * @route   GET /api/biometrics/summary
 * @access  Private
 */
const getBiometricSummary = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get latest data for each type
    const types = [
      'weight',
      'heart_rate',
      'sleep_duration',
      'blood_pressure',
      'steps',
      'calories_consumed',
      'calories_burned',
      'water_intake',
      'mood'
    ];

    const summary = {};

    for (const type of types) {
      const latest = await BiometricData.getLatestByType(userId, type);
      if (latest) {
        summary[type] = {
          value: latest.value,
          unit: latest.unit,
          date: latest.date,
          additionalData: latest.additionalData
        };
      }
    }

    // Get today's totals
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStats = await BiometricData.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$value' },
          count: { $sum: 1 }
        }
      }
    ]);

    const todayData = {};
    todayStats.forEach(stat => {
      todayData[stat._id] = {
        total: stat.total,
        count: stat.count
      };
    });

    res.status(200).json({
      success: true,
      summary,
      today: todayData
    });
  } catch (error) {
    logger.error('Get biometric summary error:', error);
    next(error);
  }
};

/**
 * @desc    Update biometric data
 * @route   PUT /api/biometrics/:id
 * @access  Private
 */
const updateBiometricData = async (req, res, next) => {
  try {
    let biometricData = await BiometricData.findById(req.params.id);

    if (!biometricData) {
      return res.status(404).json({
        success: false,
        message: 'Biometric data not found'
      });
    }

    // Make sure user owns the data
    if (biometricData.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this data'
      });
    }

    biometricData = await BiometricData.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'Biometric data updated successfully',
      data: biometricData
    });
  } catch (error) {
    logger.error('Update biometric error:', error);
    next(error);
  }
};

/**
 * @desc    Delete biometric data
 * @route   DELETE /api/biometrics/:id
 * @access  Private
 */
const deleteBiometricData = async (req, res, next) => {
  try {
    const biometricData = await BiometricData.findById(req.params.id);

    if (!biometricData) {
      return res.status(404).json({
        success: false,
        message: 'Biometric data not found'
      });
    }

    // Make sure user owns the data
    if (biometricData.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this data'
      });
    }

    await biometricData.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Biometric data deleted successfully'
    });
  } catch (error) {
    logger.error('Delete biometric error:', error);
    next(error);
  }
};

/**
 * @desc    Get progress dashboard data
 * @route   GET /api/biometrics/progress/dashboard
 * @access  Private
 */
const getProgressDashboard = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const { start, end } = getDateRange(parseInt(days));

    // Get weight progress
    const weightData = await BiometricData.find({
      userId: req.user.id,
      type: 'weight',
      date: { $gte: start, $lte: end }
    }).sort({ date: 1 });

    // Get steps data
    const stepsData = await BiometricData.find({
      userId: req.user.id,
      type: 'steps',
      date: { $gte: start, $lte: end }
    }).sort({ date: 1 });

    // Get sleep data
    const sleepData = await BiometricData.find({
      userId: req.user.id,
      type: 'sleep_duration',
      date: { $gte: start, $lte: end }
    }).sort({ date: 1 });

    // Get calorie data
    const caloriesConsumed = await BiometricData.find({
      userId: req.user.id,
      type: 'calories_consumed',
      date: { $gte: start, $lte: end }
    }).sort({ date: 1 });

    const caloriesBurned = await BiometricData.find({
      userId: req.user.id,
      type: 'calories_burned',
      date: { $gte: start, $lte: end }
    }).sort({ date: 1 });

    res.status(200).json({
      success: true,
      data: {
        weight: weightData,
        steps: stepsData,
        sleep: sleepData,
        calories: {
          consumed: caloriesConsumed,
          burned: caloriesBurned
        }
      }
    });
  } catch (error) {
    logger.error('Get progress dashboard error:', error);
    next(error);
  }
};

module.exports = {
  logBiometricData,
  getBiometricByType,
  getBiometricSummary,
  updateBiometricData,
  deleteBiometricData,
  getProgressDashboard
};