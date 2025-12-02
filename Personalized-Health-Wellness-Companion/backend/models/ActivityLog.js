const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  activityType: {
    type: String,
    enum: [
      'workout_completed',
      'meal_logged',
      'biometric_logged',
      'goal_created',
      'goal_completed',
      'badge_earned',
      'streak_updated',
      'community_post',
      'expert_booking',
      'profile_updated',
      'points_earned',
      'workout_plan_generated',
      'meal_plan_generated',
      'feedback_provided',
      'streak_milestone'
    ],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  
  relatedId: mongoose.Schema.Types.ObjectId,
  relatedModel: String,
  
  metadata: mongoose.Schema.Types.Mixed,
  
  pointsEarned: {
    type: Number,
    default: 0
  },
  
  deviceInfo: {
    platform: String,
    browser: String,
    ipAddress: String
  }
}, {
  timestamps: true
});

ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ activityType: 1, createdAt: -1 });
ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);