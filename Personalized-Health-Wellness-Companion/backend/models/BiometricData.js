const mongoose = require('mongoose');

const BiometricDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'weight',
      'heart_rate',
      'sleep_duration',
      'blood_pressure',
      'steps',
      'calories_consumed',
      'calories_burned',
      'water_intake',
      'body_fat',
      'muscle_mass',
      'mood',
      'stress_level',
      'exercise_duration'
    ],
    required: [true, 'Please specify the biometric type']
  },
  value: {
    type: Number,
    required: [true, 'Please add a value']
  },
  unit: {
    type: String,
    required: [true, 'Please specify the unit']
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Additional context
  notes: {
    type: String,
    maxlength: 500
  },
  source: {
    type: String,
    enum: ['manual', 'fitbit', 'google_fit', 'apple_health', 'api'],
    default: 'manual'
  },
  
  // For blood pressure (systolic/diastolic)
  additionalData: {
    systolic: Number,
    diastolic: Number
  },
  
  // Metadata
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
BiometricDataSchema.index({ userId: 1, type: 1, date: -1 });
BiometricDataSchema.index({ userId: 1, date: -1 });

// Static method to get user's latest data by type
BiometricDataSchema.statics.getLatestByType = function(userId, type) {
  return this.findOne({ userId, type }).sort({ date: -1 });
};

// Static method to get data for a date range
BiometricDataSchema.statics.getByDateRange = function(userId, type, startDate, endDate) {
  return this.find({
    userId,
    type,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });
};

module.exports = mongoose.model('BiometricData', BiometricDataSchema);