const mongoose = require('mongoose');

const ExerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  sets: Number,
  reps: String, // Can be "10-12" or "30 seconds"
  duration: Number, // in minutes
  restTime: Number, // in seconds
  instructions: String,
  videoUrl: String,
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard']
  },
  muscleGroups: [String],
  equipment: [String],
  caloriesBurned: Number
});

const DayPlanSchema = new mongoose.Schema({
  dayNumber: {
    type: Number,
    required: true
  },
  dayName: String, // e.g., "Monday", "Day 1"
  restDay: {
    type: Boolean,
    default: false
  },
  focus: String, // e.g., "Upper Body", "Cardio", "Full Body"
  exercises: [ExerciseSchema],
  totalDuration: Number, // in minutes
  totalCalories: Number,
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  notes: String
});

const WorkoutPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  
  // Plan details
  duration: {
    type: Number,
    required: true, // in days (e.g., 7, 14, 30)
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },
  goalType: {
    type: String,
    enum: ['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness']
  },
  
  // Weekly schedule
  days: [DayPlanSchema],
  
  // Status
  status: {
    type: String,
    enum: ['active', 'completed', 'paused'],
    default: 'active'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: Date,
  
  // AI Generated
  generatedBy: {
    type: String,
    enum: ['ai', 'expert', 'template'],
    default: 'ai'
  },
  aiPrompt: String,
  
  // Tracking
  completedDays: {
    type: Number,
    default: 0
  },
  totalWorkouts: Number,
  
  // Feedback
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: String,
  
  // Metadata
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [String]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for completion percentage
WorkoutPlanSchema.virtual('completionPercentage').get(function() {
  if (this.days.length === 0) return 0;
  const completedDays = this.days.filter(day => day.completed).length;
  return Math.round((completedDays / this.days.length) * 100);
});

// Method to mark day as completed
WorkoutPlanSchema.methods.completeDay = function(dayNumber) {
  const day = this.days.find(d => d.dayNumber === dayNumber);
  if (day && !day.completed) {
    day.completed = true;
    day.completedAt = new Date();
    this.completedDays += 1;
    
    // Check if plan is fully completed
    if (this.completedDays >= this.days.length) {
      this.status = 'completed';
      this.endDate = new Date();
    }
  }
  return this.save();
};

// Indexes
WorkoutPlanSchema.index({ userId: 1, status: 1 });
WorkoutPlanSchema.index({ createdAt: -1 });

module.exports = mongoose.model('WorkoutPlan', WorkoutPlanSchema);