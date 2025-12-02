const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'workout_reminder',
      'meal_reminder',
      'water_reminder',
      'sleep_reminder',
      'goal_milestone',
      'badge_earned',
      'streak_milestone',
      'community_like',
      'community_comment',
      'expert_booking_confirmed',
      'expert_booking_reminder',
      'system_announcement'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  
  // Related data
  relatedId: mongoose.Schema.Types.ObjectId,
  relatedModel: {
    type: String,
    enum: ['WorkoutPlan', 'MealPlan', 'Goal', 'Badge', 'CommunityPost', 'ExpertProfile']
  },
  
  // Action
  actionUrl: String,
  actionText: String,
  
  // Status
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  
  // Delivery
  deliveryMethod: {
    type: String,
    enum: ['in_app', 'email', 'push'],
    default: 'in_app'
  },
  isSent: {
    type: Boolean,
    default: false
  },
  sentAt: Date,
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  
  // Expiry
  expiresAt: Date
}, {
  timestamps: true
});

// Mark as read
NotificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Indexes
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', NotificationSchema);