const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'expert', 'admin'],
    default: 'user'
  },
  
  // Physical Attributes
  age: {
    type: Number,
    required: [true, 'Please add your age'],
    min: [13, 'You must be at least 13 years old'],
    max: [120, 'Please enter a valid age']
  },
  gender: {
    type: String,
    required: [true, 'Please specify your gender'],
    enum: ['male', 'female', 'other']
  },
  height: {
    type: Number,
    required: [true, 'Please add your height in cm'],
    min: [50, 'Please enter a valid height'],
    max: [300, 'Please enter a valid height']
  },
  weight: {
    type: Number,
    required: [true, 'Please add your weight in kg'],
    min: [20, 'Please enter a valid weight'],
    max: [500, 'Please enter a valid weight']
  },
  
  // Health & Fitness
  activityLevel: {
    type: String,
    enum: ['sedentary', 'light', 'moderate', 'active', 'veryActive'],
    default: 'moderate'
  },
  fitnessLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  healthGoals: [{
    type: String,
    enum: ['weight_loss', 'muscle_gain', 'maintain_weight', 'improve_fitness', 'better_sleep', 'stress_management', 'increase_energy']
  }],
  
  // Dietary Information
  dietaryPreferences: [{
    type: String,
    enum: ['vegetarian', 'vegan', 'keto', 'paleo', 'mediterranean', 'gluten_free', 'dairy_free', 'none']
  }],
  allergies: [{
    type: String
  }],
  dailyCalorieTarget: {
    type: Number,
    default: 2000
  },
  
  // Profile & Preferences
  profilePicture: {
    url: String,
    publicId: String
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters']
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  
  // Notification Preferences
  notifications: {
    workout: { type: Boolean, default: true },
    meal: { type: Boolean, default: true },
    water: { type: Boolean, default: true },
    sleep: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true }
  },
  
  // Gamification
  currentWorkoutStreak: {
    type: Number,
    default: 0
  },
  longestWorkoutStreak: {
    type: Number,
    default: 0
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  badges: [{
    badgeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Badge'
    },
    earnedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Tracking
  lastWorkoutDate: Date,
  lastLoginDate: Date,
  accountStatus: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  
  // Password Reset
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  
  // Email Verification
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpire: Date

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for BMI
UserSchema.virtual('bmi').get(function() {
  const heightInMeters = this.height / 100;
  return (this.weight / (heightInMeters * heightInMeters)).toFixed(1);
});

// Encrypt password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate password reset token
UserSchema.methods.getResetPasswordToken = function() {
  const resetToken = require('crypto').randomBytes(20).toString('hex');
  
  this.resetPasswordToken = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Create indexes
UserSchema.index({ email: 1 });
UserSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', UserSchema);