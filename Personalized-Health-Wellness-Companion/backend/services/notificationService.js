const Notification = require('../models/Notification');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const logger = require('../utils/logger');

/**
 * Create notification
 */
const createNotification = async (notificationData) => {
  try {
    const notification = await Notification.create(notificationData);
    
    // Send based on delivery method and user preferences
    const user = await User.findById(notificationData.userId);
    
    if (user && notificationData.deliveryMethod === 'email' && user.notifications.email) {
      await sendNotificationEmail(user, notification);
    }

    logger.info(`✅ Notification created for user ${notificationData.userId}`);
    return notification;
  } catch (error) {
    logger.error('Create notification error:', error);
    throw error;
  }
};

/**
 * Send notification email
 */
const sendNotificationEmail = async (user, notification) => {
  try {
    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Health & Wellness Companion</h1>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333;">${notification.title}</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">${notification.message}</p>
          
          ${notification.actionUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${notification.actionUrl}" 
                 style="background: #667eea; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                ${notification.actionText || 'View Details'}
              </a>
            </div>
          ` : ''}
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            You're receiving this email because you enabled email notifications in your account settings.
            <a href="${process.env.FRONTEND_URL}/settings/notifications" style="color: #667eea;">
              Manage notification preferences
            </a>
          </p>
        </div>
      </div>
    `;

    await sendEmail({
      email: user.email,
      subject: notification.title,
      html: emailHTML
    });

    notification.isSent = true;
    notification.sentAt = new Date();
    await notification.save();

    logger.info(`📧 Email notification sent to ${user.email}`);
  } catch (error) {
    logger.error('Send notification email error:', error);
  }
};

/**
 * Get user notifications
 */
const getUserNotifications = async (userId, options = {}) => {
  try {
    const {
      limit = 20,
      skip = 0,
      unreadOnly = false
    } = options;

    const query = { userId };
    if (unreadOnly) {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    return {
      notifications,
      total,
      unreadCount,
      hasMore: total > skip + limit
    };
  } catch (error) {
    logger.error('Get user notifications error:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOne({
      _id: notificationId,
      userId
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return notification;
  } catch (error) {
    logger.error('Mark as read error:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (userId) => {
  try {
    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    logger.info(`✅ Marked all notifications as read for user ${userId}`);
    return true;
  } catch (error) {
    logger.error('Mark all as read error:', error);
    throw error;
  }
};

/**
 * Delete notification
 */
const deleteNotification = async (notificationId, userId) => {
  try {
    const result = await Notification.deleteOne({
      _id: notificationId,
      userId
    });

    return result.deletedCount > 0;
  } catch (error) {
    logger.error('Delete notification error:', error);
    throw error;
  }
};

/**
 * Delete all read notifications
 */
const deleteReadNotifications = async (userId) => {
  try {
    const result = await Notification.deleteMany({
      userId,
      isRead: true
    });

    logger.info(`🗑️ Deleted ${result.deletedCount} read notifications for user ${userId}`);
    return result.deletedCount;
  } catch (error) {
    logger.error('Delete read notifications error:', error);
    throw error;
  }
};

/**
 * Send workout reminder
 */
const sendWorkoutReminder = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.notifications.workout) return;

    await createNotification({
      userId,
      type: 'workout_reminder',
      title: '💪 Time for Your Workout!',
      message: "Don't break your streak! It's time for today's workout session.",
      actionUrl: `${process.env.FRONTEND_URL}/workouts`,
      actionText: 'Start Workout',
      priority: 'medium',
      deliveryMethod: 'in_app'
    });
  } catch (error) {
    logger.error('Send workout reminder error:', error);
  }
};

/**
 * Send meal reminder
 */
const sendMealReminder = async (userId, mealType) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.notifications.meal) return;

    const mealEmojis = {
      breakfast: '🍳',
      lunch: '🥗',
      dinner: '🍽️',
      snack: '🍎'
    };

    await createNotification({
      userId,
      type: 'meal_reminder',
      title: `${mealEmojis[mealType]} Time for ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}!`,
      message: `It's ${mealType} time! Check your meal plan for today's nutritious meal.`,
      actionUrl: `${process.env.FRONTEND_URL}/meals`,
      actionText: 'View Meal Plan',
      priority: 'low',
      deliveryMethod: 'in_app'
    });
  } catch (error) {
    logger.error('Send meal reminder error:', error);
  }
};

/**
 * Send water reminder
 */
const sendWaterReminder = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.notifications.water) return;

    await createNotification({
      userId,
      type: 'water_reminder',
      title: '💧 Stay Hydrated!',
      message: "Time to drink some water. Staying hydrated is crucial for your health!",
      priority: 'low',
      deliveryMethod: 'in_app'
    });
  } catch (error) {
    logger.error('Send water reminder error:', error);
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
  sendWorkoutReminder,
  sendMealReminder,
  sendWaterReminder
};