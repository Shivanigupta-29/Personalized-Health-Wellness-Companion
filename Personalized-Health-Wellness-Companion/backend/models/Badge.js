const mongoose = require('mongoose');

const BadgeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['workout', 'nutrition', 'streak', 'milestone', 'social', 'special'],
    required: true
  },
  
  // Achievement criteria
  criteria: {
    type: {
      type: String,
      enum: ['streak', 'count', 'value', 'custom'],
      required: true
    },
    target: Number, // e.g., 7 for 7-day streak, 100 for 100 workouts
    metric: String // e.g., 'workouts_completed', 'weight_lost'
  },
  
  // Rarity and points
  rarity: {
    type: String,
    enum: ['common', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  points: {
    type: Number,
    default: 10
  },
  
  // Visual
  icon: {
    type: String,
    required: true // emoji or icon name
  },
  color: {
    type: String,
    default: '#3B82F6'
  },
  imageUrl: String,
  
  // Metadata
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Static method to initialize default badges
BadgeSchema.statics.createDefaultBadges = async function() {
  const defaultBadges = [
    // Streak Badges
    {
      name: 'First Step',
      description: 'Complete your first workout',
      category: 'workout',
      criteria: { type: 'count', target: 1, metric: 'workouts_completed' },
      rarity: 'common',
      points: 10,
      icon: '🎯',
      color: '#10B981'
    },
    {
      name: 'Week Warrior',
      description: 'Maintain a 7-day workout streak',
      category: 'streak',
      criteria: { type: 'streak', target: 7, metric: 'workout_streak' },
      rarity: 'rare',
      points: 50,
      icon: '🔥',
      color: '#F59E0B'
    },
    {
      name: 'Month Master',
      description: 'Maintain a 30-day workout streak',
      category: 'streak',
      criteria: { type: 'streak', target: 30, metric: 'workout_streak' },
      rarity: 'epic',
      points: 200,
      icon: '💪',
      color: '#8B5CF6'
    },
    {
      name: 'Century Club',
      description: 'Complete 100 workouts',
      category: 'milestone',
      criteria: { type: 'count', target: 100, metric: 'workouts_completed' },
      rarity: 'legendary',
      points: 500,
      icon: '👑',
      color: '#EF4444'
    },
    
    // Nutrition Badges
    {
      name: 'Meal Planner',
      description: 'Complete your first meal plan',
      category: 'nutrition',
      criteria: { type: 'count', target: 1, metric: 'meal_plans_completed' },
      rarity: 'common',
      points: 10,
      icon: '🍎',
      color: '#10B981'
    },
    {
      name: 'Hydration Hero',
      description: 'Meet water intake goal for 7 days',
      category: 'nutrition',
      criteria: { type: 'streak', target: 7, metric: 'water_goal_streak' },
      rarity: 'rare',
      points: 50,
      icon: '💧',
      color: '#3B82F6'
    },
    
    // Weight Loss Badges
    {
      name: 'First Pound',
      description: 'Lose your first kilogram',
      category: 'milestone',
      criteria: { type: 'value', target: 1, metric: 'weight_lost' },
      rarity: 'common',
      points: 20,
      icon: '⚖️',
      color: '#10B981'
    },
    {
      name: 'Transformation',
      description: 'Reach your goal weight',
      category: 'milestone',
      criteria: { type: 'custom', metric: 'goal_weight_reached' },
      rarity: 'legendary',
      points: 1000,
      icon: '🌟',
      color: '#F59E0B'
    },
    
    // Social Badges
    {
      name: 'Community Member',
      description: 'Join the community',
      category: 'social',
      criteria: { type: 'custom', metric: 'community_joined' },
      rarity: 'common',
      points: 5,
      icon: '👥',
      color: '#8B5CF6'
    },
    {
      name: 'Motivator',
      description: 'Encourage 10 community members',
      category: 'social',
      criteria: { type: 'count', target: 10, metric: 'encouragements_given' },
      rarity: 'rare',
      points: 50,
      icon: '💬',
      color: '#EC4899'
    }
  ];
  
  for (const badge of defaultBadges) {
    await this.findOneAndUpdate(
      { name: badge.name },
      badge,
      { upsert: true, new: true }
    );
  }
  
  console.log('✅ Default badges created');
};

module.exports = mongoose.model('Badge', BadgeSchema);