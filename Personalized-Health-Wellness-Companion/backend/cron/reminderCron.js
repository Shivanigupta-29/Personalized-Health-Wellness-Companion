const cron = require('node-cron');
const User = require('../models/User');
const { 
  sendWorkoutReminder, 
  sendMealReminder, 
  sendWaterReminder 
} = require('../services/notificationService');
const { checkAndResetStreak } = require('../services/streakService');
const logger = require('../utils/logger');

/**
 * Schedule workout reminders - Every day at 6 PM
 */
const scheduleWorkoutReminders = () => {
  cron.schedule('0 18 * * *', async () => {
    try {
      logger.info('⏰ Running workout reminder cron job...');
      
      const users = await User.find({
        accountStatus: 'active',
        'notifications.workout': true
      }).select('_id');

      for (const user of users) {
        await sendWorkoutReminder(user._id);
      }

      logger.info(`✅ Sent workout reminders to ${users.length} users`);
    } catch (error) {
      logger.error('Workout reminder cron error:', error);
    }
  });
};

/**
 * Schedule meal reminders
 */
const scheduleMealReminders = () => {
  // Breakfast reminder - 8 AM
  cron.schedule('0 8 * * *', async () => {
    try {
      logger.info('⏰ Running breakfast reminder cron job...');
      
      const users = await User.find({
        accountStatus: 'active',
        'notifications.meal': true
      }).select('_id');

      for (const user of users) {
        await sendMealReminder(user._id, 'breakfast');
      }

      logger.info(`✅ Sent breakfast reminders to ${users.length} users`);
    } catch (error) {
      logger.error('Breakfast reminder cron error:', error);
    }
  });

  // Lunch reminder - 1 PM
  cron.schedule('0 13 * * *', async () => {
    try {
      const users = await User.find({
        accountStatus: 'active',
        'notifications.meal': true
      }).select('_id');

      for (const user of users) {
        await sendMealReminder(user._id, 'lunch');
      }
    } catch (error) {
      logger.error('Lunch reminder cron error:', error);
    }
  });

  // Dinner reminder - 7 PM
  cron.schedule('0 19 * * *', async () => {
    try {
      const users = await User.find({
        accountStatus: 'active',
        'notifications.meal': true
      }).select('_id');

      for (const user of users) {
        await sendMealReminder(user._id, 'dinner');
      }
    } catch (error) {
      logger.error('Dinner reminder cron error:', error);
    }
  });
};

/**
 * Schedule water reminders - Every 2 hours from 8 AM to 8 PM
 */
const scheduleWaterReminders = () => {
  cron.schedule('0 8,10,12,14,16,18,20 * * *', async () => {
    try {
      logger.info('⏰ Running water reminder cron job...');
      
      const users = await User.find({
        accountStatus: 'active',
        'notifications.water': true
      }).select('_id');

      for (const user of users) {
        await sendWaterReminder(user._id);
      }

      logger.info(`✅ Sent water reminders to ${users.length} users`);
    } catch (error) {
      logger.error('Water reminder cron error:', error);
    }
  });
};

/**
 * Check and reset streaks - Every day at midnight
 */
const scheduleStreakCheck = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      logger.info('⏰ Running streak check cron job...');
      
      const users = await User.find({
        accountStatus: 'active',
        currentWorkoutStreak: { $gt: 0 }
      }).select('_id');

      for (const user of users) {
        await checkAndResetStreak(user._id);
      }

      logger.info(`✅ Checked streaks for ${users.length} users`);
    } catch (error) {
      logger.error('Streak check cron error:', error);
    }
  });
};

/**
 * Initialize all cron jobs
 */
const initializeCronJobs = () => {
  logger.info('🕐 Initializing cron jobs...');
  
  scheduleWorkoutReminders();
  scheduleMealReminders();
  scheduleWaterReminders();
  scheduleStreakCheck();
  
  logger.info('✅ All cron jobs initialized');
};

module.exports = { initializeCronJobs };