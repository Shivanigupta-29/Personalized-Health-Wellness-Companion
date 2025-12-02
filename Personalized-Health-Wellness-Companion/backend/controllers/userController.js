const User = require('../models/User');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const { calculateBMI, calculateDailyCalories } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const {
      name,
      age,
      gender,
      height,
      weight,
      activityLevel,
      fitnessLevel,
      healthGoals,
      dietaryPreferences,
      allergies,
      bio,
      timezone
    } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (age) user.age = age;
    if (gender) user.gender = gender;
    if (height) user.height = height;
    if (weight) user.weight = weight;
    if (activityLevel) user.activityLevel = activityLevel;
    if (fitnessLevel) user.fitnessLevel = fitnessLevel;
    if (healthGoals) user.healthGoals = healthGoals;
    if (dietaryPreferences) user.dietaryPreferences = dietaryPreferences;
    if (allergies) user.allergies = allergies;
    if (bio) user.bio = bio;
    if (timezone) user.timezone = timezone;

    // Recalculate daily calorie target if relevant fields changed
    if (weight || height || age || gender || activityLevel) {
      user.dailyCalorieTarget = calculateDailyCalories(
        user.weight,
        user.height,
        user.age,
        user.gender,
        user.activityLevel
      );
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
        height: user.height,
        weight: user.weight,
        bmi: user.bmi,
        activityLevel: user.activityLevel,
        fitnessLevel: user.fitnessLevel,
        healthGoals: user.healthGoals,
        dietaryPreferences: user.dietaryPreferences,
        allergies: user.allergies,
        dailyCalorieTarget: user.dailyCalorieTarget,
        bio: user.bio,
        timezone: user.timezone,
        profilePicture: user.profilePicture?.url
      }
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    next(error);
  }
};

/**
 * @desc    Upload profile picture
 * @route   POST /api/users/profile-picture
 * @access  Private
 */
const uploadProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const user = await User.findById(req.user.id);

    // Delete old profile picture if exists
    if (user.profilePicture?.publicId) {
      await deleteFromCloudinary(user.profilePicture.publicId);
    }

    // Upload new picture
    const result = await uploadToCloudinary(req.file.path, 'profile-pictures');

    user.profilePicture = {
      url: result.url,
      publicId: result.publicId
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      profilePicture: user.profilePicture.url
    });
  } catch (error) {
    logger.error('Upload profile picture error:', error);
    next(error);
  }
};

/**
 * @desc    Update notification preferences
 * @route   PUT /api/users/notifications
 * @access  Private
 */
const updateNotificationPreferences = async (req, res, next) => {
  try {
    const { workout, meal, water, sleep, email, push } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update notification preferences
    if (typeof workout !== 'undefined') user.notifications.workout = workout;
    if (typeof meal !== 'undefined') user.notifications.meal = meal;
    if (typeof water !== 'undefined') user.notifications.water = water;
    if (typeof sleep !== 'undefined') user.notifications.sleep = sleep;
    if (typeof email !== 'undefined') user.notifications.email = email;
    if (typeof push !== 'undefined') user.notifications.push = push;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Notification preferences updated',
      notifications: user.notifications
    });
  } catch (error) {
    logger.error('Update notification preferences error:', error);
    next(error);
  }
};

/**
 * @desc    Get user's public profile
 * @route   GET /api/users/:id
 * @access  Private
 */
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name profilePicture bio totalPoints currentWorkoutStreak longestWorkoutStreak badges createdAt')
      .populate('badges.badgeId');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        profilePicture: user.profilePicture?.url,
        bio: user.bio,
        totalPoints: user.totalPoints,
        currentStreak: user.currentWorkoutStreak,
        longestStreak: user.longestWorkoutStreak,
        badges: user.badges,
        memberSince: user.createdAt
      }
    });
  } catch (error) {
    logger.error('Get user profile error:', error);
    next(error);
  }
};

/**
 * @desc    Get user dashboard stats
 * @route   GET /api/users/dashboard/stats
 * @access  Private
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('badges.badgeId');
    const Goal = require('../models/Goal');
    const WorkoutPlan = require('../models/WorkoutPlan');
    const MealPlan = require('../models/MealPlan');
    const BiometricData = require('../models/BiometricData');
    const ActivityLog = require('../models/ActivityLog');

    // Get active goals
    const activeGoals = await Goal.find({
      userId: req.user.id,
      status: 'active'
    }).limit(3);

    // Get active workout plan
    const activeWorkoutPlan = await WorkoutPlan.findOne({
      userId: req.user.id,
      status: 'active'
    });

    // Get active meal plan
    const activeMealPlan = await MealPlan.findOne({
      userId: req.user.id,
      status: 'active'
    });

    // Get latest weight
    const latestWeight = await BiometricData.getLatestByType(req.user.id, 'weight');

    // Get today's activities
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayActivities = await ActivityLog.countDocuments({
      userId: req.user.id,
      createdAt: { $gte: today, $lt: tomorrow }
    });

    // Get total workouts
    const totalWorkouts = await ActivityLog.countDocuments({
      userId: req.user.id,
      activityType: 'workout_completed'
    });

    res.status(200).json({
      success: true,
      stats: {
        user: {
          name: user.name,
          profilePicture: user.profilePicture?.url,
          bmi: user.bmi,
          dailyCalorieTarget: user.dailyCalorieTarget,
          totalPoints: user.totalPoints,
          badgeCount: user.badges.length
        },
        streaks: {
          current: user.currentWorkoutStreak,
          longest: user.longestWorkoutStreak
        },
        goals: {
          active: activeGoals.length,
          data: activeGoals
        },
        plans: {
          workout: activeWorkoutPlan,
          meal: activeMealPlan
        },
        biometrics: {
          latestWeight: latestWeight?.value,
          weightUnit: latestWeight?.unit
        },
        activities: {
          today: todayActivities,
          totalWorkouts
        }
      }
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    next(error);
  }
};

/**
 * @desc    Delete user account
 * @route   DELETE /api/users/account
 * @access  Private
 */
const deleteAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete profile picture from cloudinary
    if (user.profilePicture?.publicId) {
      await deleteFromCloudinary(user.profilePicture.publicId);
    }

    // Delete user and all related data
    await user.deleteOne();

    // Note: In production, you might want to anonymize rather than delete
    // Or cascade delete all related data using middleware

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    logger.error('Delete account error:', error);
    next(error);
  }
};

module.exports = {
  updateProfile,
  uploadProfilePicture,
  updateNotificationPreferences,
  getUserProfile,
  getDashboardStats,
  deleteAccount
};