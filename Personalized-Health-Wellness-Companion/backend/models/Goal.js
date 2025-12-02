const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['weight', 'fitness', 'nutrition', 'mindfulness', 'sleep', 'custom'],
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please add a goal title'],
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: 500
  },
  
  // Goal metrics
  targetValue: {
    type: Number,
    required: [true, 'Please specify a target value']
  },
  currentValue: {
    type: Number,
    required: [true, 'Please specify current value']
  },
  startValue: {
    type: Number
  },
  unit: {
    type: String,
    required: true
  },
  
  // Timeline
  startDate: {
    type: Date,
    default: Date.now
  },
  deadline: {
    type: Date,
    required: [true, 'Please add a deadline']
  },
  completedDate: Date,
  
  // Status
  status: {
    type: String,
    enum: ['active', 'completed', 'paused', 'cancelled'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  
  // Progress tracking
  progressUpdates: [{
    value: Number,
    date: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  
  // Milestones
  milestones: [{
    title: String,
    targetValue: Number,
    achieved: {
      type: Boolean,
      default: false
    },
    achievedDate: Date
  }],
  
  // Reminders
  reminderFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'biweekly', 'monthly', 'none'],
    default: 'weekly'
  },
  lastReminderSent: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for progress percentage
GoalSchema.virtual('progressPercentage').get(function() {
  const total = Math.abs(this.targetValue - this.startValue);
  const current = Math.abs(this.currentValue - this.startValue);
  
  if (total === 0) return 100;
  
  const percentage = (current / total) * 100;
  return Math.min(Math.round(percentage), 100);
});

// Virtual for days remaining
GoalSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const deadline = new Date(this.deadline);
  const diffTime = deadline - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
});

// Method to update progress
GoalSchema.methods.updateProgress = function(newValue, notes = '') {
  this.currentValue = newValue;
  this.progressUpdates.push({
    value: newValue,
    date: new Date(),
    notes
  });
  
  // Check if goal is completed
  if (this.targetValue <= newValue && this.status === 'active') {
    this.status = 'completed';
    this.completedDate = new Date();
  }
  
  return this.save();
};

// Indexes
GoalSchema.index({ userId: 1, status: 1 });
GoalSchema.index({ deadline: 1 });

module.exports = mongoose.model('Goal', GoalSchema);