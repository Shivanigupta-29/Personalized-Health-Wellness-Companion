const {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications
} = require('../services/notificationService');
const logger = require('../utils/logger');

/**
 * @desc    Get user notifications
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res, next) => {
  try {
    const { limit = 20, skip = 0, unreadOnly = false } = req.query;

    const result = await getUserNotifications(req.user.id, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      unreadOnly: unreadOnly === 'true'
    });

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Get notifications error:', error);
    next(error);
  }
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markNotificationAsRead = async (req, res, next) => {
  try {
    const notification = await markAsRead(req.params.id, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    logger.error('Mark notification as read error:', error);
    next(error);
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    await markAllAsRead(req.user.id);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    logger.error('Mark all as read error:', error);
    next(error);
  }
};

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotificationById = async (req, res, next) => {
  try {
    const deleted = await deleteNotification(req.params.id, req.user.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    logger.error('Delete notification error:', error);
    next(error);
  }
};

/**
 * @desc    Delete all read notifications
 * @route   DELETE /api/notifications/read
 * @access  Private
 */
const deleteAllReadNotifications = async (req, res, next) => {
  try {
    const deletedCount = await deleteReadNotifications(req.user.id);

    res.status(200).json({
      success: true,
      message: `${deletedCount} notification(s) deleted`
    });
  } catch (error) {
    logger.error('Delete read notifications error:', error);
    next(error);
  }
};

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotificationById,
  deleteAllReadNotifications
};