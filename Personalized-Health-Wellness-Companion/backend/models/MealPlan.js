const mongoose = require('mongoose');

const RecipeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    required: true
  },
  ingredients: [{
    name: String,
    quantity: String,
    unit: String
  }],
  instructions: [String],
  prepTime: Number, // in minutes
  cookTime: Number,
  servings: Number,
  
  // Nutrition info
  nutrition: {
    calories: Number,
    protein: Number, // in grams
    carbs: Number,
    fat: Number,
    fiber: Number,
    sugar: Number
  },
  
  // Dietary flags
  dietaryTags: [{
    type: String,
    enum: ['vegetarian', 'vegan', 'keto', 'paleo', 'gluten_free', 'dairy_free', 'low_carb', 'high_protein']
  }],
  allergens: [String],
  
  // Media
  imageUrl: String,
  videoUrl: String,
  
  // Completion
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  rating: {
    type: Number,
    min: 1,
    max: 5
  }
});

const DayMealPlanSchema = new mongoose.Schema({
  dayNumber: {
    type: Number,
    required: true
  },
  date: Date,
  meals: [RecipeSchema],
  
  // Daily totals
  totalCalories: Number,
  totalProtein: Number,
  totalCarbs: Number,
  totalFat: Number,
  
  // Water tracking
  waterIntake: {
    type: Number,
    default: 0 // in ml
  },
  waterGoal: {
    type: Number,
    default: 2000
  },
  
  notes: String
});

const MealPlanSchema = new mongoose.Schema({
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
  
  // Plan duration
  duration: {
    type: Number,
    required: true // in days
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: Date,
  
  // Daily plans
  days: [DayMealPlanSchema],
  
  // Nutritional targets
  dailyCalorieTarget: Number,
  macroTargets: {
    protein: Number, // percentage
    carbs: Number,
    fat: Number
  },
  
  // Dietary preferences
  dietaryPreferences: [{
    type: String,
    enum: ['vegetarian', 'vegan', 'keto', 'paleo', 'mediterranean', 'gluten_free', 'dairy_free']
  }],
  allergies: [String],
  
  // Status
  status: {
    type: String,
    enum: ['active', 'completed', 'paused'],
    default: 'active'
  },
  
  // AI Generated
  generatedBy: {
    type: String,
    enum: ['ai', 'nutritionist', 'template'],
    default: 'ai'
  },
  aiPrompt: String,
  
  // Tracking
  adherenceScore: {
    type: Number,
    default: 0, // percentage
    min: 0,
    max: 100
  },
  
  // Feedback
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for completion percentage
MealPlanSchema.virtual('completionPercentage').get(function() {
  if (this.days.length === 0) return 0;
  
  let totalMeals = 0;
  let completedMeals = 0;
  
  this.days.forEach(day => {
    totalMeals += day.meals.length;
    completedMeals += day.meals.filter(meal => meal.completed).length;
  });
  
  return totalMeals > 0 ? Math.round((completedMeals / totalMeals) * 100) : 0;
});

// Method to mark meal as completed
MealPlanSchema.methods.completeMeal = function(dayNumber, mealIndex) {
  const day = this.days.find(d => d.dayNumber === dayNumber);
  if (day && day.meals[mealIndex]) {
    day.meals[mealIndex].completed = true;
    day.meals[mealIndex].completedAt = new Date();
  }
  return this.save();
};

// Indexes
MealPlanSchema.index({ userId: 1, status: 1 });
MealPlanSchema.index({ createdAt: -1 });

module.exports = mongoose.model('MealPlan', MealPlanSchema);