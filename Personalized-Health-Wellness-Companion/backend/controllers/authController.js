const User = require('../models/User');
const { calculateDailyCalories, calculateBMI } = require('../utils/helpers');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      age,
      gender,
      height,
      weight,
      activityLevel,
      healthGoals,
      dietaryPreferences,
      allergies
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Calculate daily calorie target
    const dailyCalorieTarget = calculateDailyCalories(
      weight,
      height,
      age,
      gender,
      activityLevel || 'moderate'
    );

    // Determine fitness level based on activity level
    const fitnessLevelMap = {
      sedentary: 'beginner',
      light: 'beginner',
      moderate: 'intermediate',
      active: 'intermediate',
      veryActive: 'advanced'
    };
    const fitnessLevel = fitnessLevelMap[activityLevel] || 'beginner';

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      age,
      gender,
      height,
      weight,
      activityLevel: activityLevel || 'moderate',
      fitnessLevel,
      healthGoals: healthGoals || [],
      dietaryPreferences: dietaryPreferences || [],
      allergies: allergies || [],
      dailyCalorieTarget
    });

    // Send welcome email
    try {
      await sendEmail({
        email: user.email,
        subject: 'Welcome to Health & Wellness Companion! 🎉',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Welcome to Health & Wellness!</h1>
            </div>
            <div style="padding: 30px; background: #f8f9fa;">
              <h2 style="color: #333;">Hi ${user.name}! 👋</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                We're excited to have you on your wellness journey! Here's what you can do:
              </p>
              <ul style="color: #666; font-size: 16px; line-height: 1.8;">
                <li>📊 Track your biometric data</li>
                <li>💪 Get personalized workout plans</li>
                <li>🥗 Receive customized meal plans</li>
                <li>🏆 Earn badges and maintain streaks</li>
                <li>👥 Connect with our community</li>
              </ul>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/dashboard" 
                   style="background: #667eea; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 5px; display: inline-block;">
                  Get Started
                </a>
              </div>
            </div>
          </div>
        `
      });
    } catch (emailError) {
      logger.error('Welcome email error:', emailError);
      // Don't fail registration if email fails
    }

    // Generate token
    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture?.url,
        bmi: user.bmi,
        dailyCalorieTarget: user.dailyCalorieTarget
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for user (include password for comparison)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check account status
    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.'
      });
    }

    // Update last login
    user.lastLoginDate = new Date();
    await user.save();

    // Generate token
    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture?.url,
        bmi: user.bmi,
        currentStreak: user.currentWorkoutStreak,
        totalPoints: user.totalPoints
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('badges.badgeId');

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
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
        profilePicture: user.profilePicture?.url,
        bio: user.bio,
        notifications: user.notifications,
        currentWorkoutStreak: user.currentWorkoutStreak,
        longestWorkoutStreak: user.longestWorkoutStreak,
        totalPoints: user.totalPoints,
        badges: user.badges,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    logger.error('Get me error:', error);
    next(error);
  }
};

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email'
      });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Create reset url
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Request',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Password Reset</h1>
            </div>
            <div style="padding: 30px; background: #f8f9fa;">
              <h2 style="color: #333;">Hi ${user.name},</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                You requested a password reset. Click the button below to reset your password:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background: #667eea; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 5px; display: inline-block;">
                  Reset Password
                </a>
              </div>
              <p style="color: #999; font-size: 14px;">
                This link will expire in 10 minutes. If you didn't request this, please ignore this email.
              </p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                Or copy this link: ${resetUrl}
              </p>
            </div>
          </div>
        `
      });

      res.status(200).json({
        success: true,
        message: 'Password reset email sent'
      });
    } catch (err) {
      logger.error('Email send error:', err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Email could not be sent'
      });
    }
  } catch (error) {
    logger.error('Forgot password error:', error);
    next(error);
  }
};

/**
 * @desc    Reset password
 * @route   PUT /api/auth/reset-password/:resetToken
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resetToken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Generate token
    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      token
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    next(error);
  }
};

/**
 * @desc    Update password
 * @route   PUT /api/auth/update-password
 * @access  Private
 */
const updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      token
    });
  } catch (error) {
    logger.error('Update password error:', error);
    next(error);
  }
};

/**
 * @desc    Logout user / clear cookie
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  updatePassword,
  logout
};