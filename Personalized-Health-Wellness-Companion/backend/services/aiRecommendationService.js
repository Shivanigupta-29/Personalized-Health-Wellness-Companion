const { generateAIResponse } = require('../config/gemini');
const User = require('../models/User');
const BiometricData = require('../models/BiometricData');
const Goal = require('../models/Goal');
const { parseAIPlan, calculateDailyCalories } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Generate Personalized Workout Plan
 */
const generateWorkoutPlan = async (userId, duration = 7) => {
  try {
    // Fetch user data
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Get recent biometric data
    const recentWeight = await BiometricData.getLatestByType(userId, 'weight');
    const recentHeartRate = await BiometricData.getLatestByType(userId, 'heart_rate');
    
    // Get active fitness goals
    const fitnessGoals = await Goal.find({ 
      userId, 
      type: 'fitness', 
      status: 'active' 
    });

    // Construct AI prompt
    const prompt = `
You are a certified personal trainer. Generate a ${duration}-day personalized workout plan in JSON format.

User Profile:
- Age: ${user.age} years
- Gender: ${user.gender}
- Current Weight: ${recentWeight?.value || user.weight}kg
- Height: ${user.height}cm
- Fitness Level: ${user.fitnessLevel}
- Activity Level: ${user.activityLevel}
- Health Goals: ${user.healthGoals.join(', ')}
- Recent Heart Rate: ${recentHeartRate?.value || 'N/A'}bpm

Specific Goals: ${fitnessGoals.map(g => g.title).join(', ')}

Requirements:
1. Create a balanced ${duration}-day plan
2. Include variety (cardio, strength, flexibility)
3. Specify exercises with sets, reps, duration
4. Include rest days
5. Consider user's fitness level
6. Estimate calories burned per workout

Return ONLY valid JSON in this exact format:
{
  "title": "7-Day Fitness Plan",
  "description": "Brief overview",
  "difficulty": "beginner|intermediate|advanced",
  "days": [
    {
      "dayNumber": 1,
      "dayName": "Monday",
      "restDay": false,
      "focus": "Upper Body Strength",
      "exercises": [
        {
          "name": "Push-ups",
          "sets": 3,
          "reps": "10-12",
          "restTime": 60,
          "instructions": "Keep back straight",
          "difficulty": "medium",
          "muscleGroups": ["chest", "triceps"],
          "equipment": ["none"],
          "caloriesBurned": 30
        }
      ],
      "totalDuration": 45,
      "totalCalories": 300
    }
  ]
}`;

    // Get AI response
    const aiResponse = await generateAIResponse(prompt);
    
    // Parse response
    const workoutPlan = parseAIPlan(aiResponse);
    
    // Validate structure
    if (!workoutPlan.days || !Array.isArray(workoutPlan.days)) {
      throw new Error('Invalid workout plan format from AI');
    }

    logger.info(`✅ Generated workout plan for user ${userId}`);
    
    return {
      ...workoutPlan,
      userId,
      duration,
      goalType: user.healthGoals[0] || 'general_fitness',
      generatedBy: 'ai',
      aiPrompt: prompt
    };

  } catch (error) {
    logger.error('Workout plan generation error:', error);
    
    // Fallback to rule-based plan
    return generateRuleBasedWorkoutPlan(userId, duration);
  }
};

/**
 * Fallback Rule-Based Workout Plan
 */
const generateRuleBasedWorkoutPlan = async (userId, duration = 7) => {
  const user = await User.findById(userId);
  
  const beginnerWorkouts = [
    {
      dayNumber: 1,
      dayName: "Monday",
      focus: "Full Body",
      restDay: false,
      exercises: [
        {
          name: "Walking",
          duration: 30,
          reps: "30 minutes",
          instructions: "Brisk pace, maintain good posture",
          difficulty: "easy",
          muscleGroups: ["legs", "cardio"],
          equipment: ["none"],
          caloriesBurned: 150
        },
        {
          name: "Wall Push-ups",
          sets: 2,
          reps: "8-10",
          restTime: 60,
          instructions: "Keep body straight",
          difficulty: "easy",
          muscleGroups: ["chest", "arms"],
          equipment: ["wall"],
          caloriesBurned: 20
        }
      ],
      totalDuration: 35,
      totalCalories: 170
    },
    {
      dayNumber: 2,
      dayName: "Tuesday",
      focus: "Rest & Stretch",
      restDay: true,
      exercises: [],
      totalDuration: 0,
      totalCalories: 0
    }
  ];

  return {
    title: `${duration}-Day Beginner Workout Plan`,
    description: 'A gentle introduction to fitness',
    difficulty: user.fitnessLevel,
    days: beginnerWorkouts.slice(0, duration),
    userId,
    duration,
    generatedBy: 'template'
  };
};

/**
 * Generate Personalized Meal Plan
 */
const generateMealPlan = async (userId, duration = 7) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Calculate calorie needs
    const dailyCalories = calculateDailyCalories(
      user.weight,
      user.height,
      user.age,
      user.gender,
      user.activityLevel
    );

    // Adjust based on goals
    let targetCalories = dailyCalories;
    if (user.healthGoals.includes('weight_loss')) {
      targetCalories -= 500; // 500 calorie deficit
    } else if (user.healthGoals.includes('muscle_gain')) {
      targetCalories += 300; // 300 calorie surplus
    }

    const prompt = `
You are a certified nutritionist. Generate a ${duration}-day personalized meal plan in JSON format.

User Profile:
- Age: ${user.age} years
- Gender: ${user.gender}
- Weight: ${user.weight}kg
- Height: ${user.height}cm
- Daily Calorie Target: ${targetCalories} kcal
- Health Goals: ${user.healthGoals.join(', ')}
- Dietary Preferences: ${user.dietaryPreferences.join(', ') || 'None'}
- Allergies: ${user.allergies.join(', ') || 'None'}

Requirements:
1. Create ${duration} days of meals (breakfast, lunch, dinner, 2 snacks)
2. Meet calorie target (±100 calories)
3. Balanced macros: 30% protein, 40% carbs, 30% fat
4. Respect dietary preferences and allergies
5. Include ingredients and simple instructions
6. Provide nutrition info for each meal

Return ONLY valid JSON in this format:
{
  "title": "7-Day Nutrition Plan",
  "description": "Brief overview",
  "dailyCalorieTarget": ${targetCalories},
  "days": [
    {
      "dayNumber": 1,
      "meals": [
        {
          "name": "Oatmeal with Berries",
          "mealType": "breakfast",
          "ingredients": [
            {"name": "Oats", "quantity": "50", "unit": "g"},
            {"name": "Blueberries", "quantity": "100", "unit": "g"}
          ],
          "instructions": ["Boil water", "Add oats", "Top with berries"],
          "prepTime": 10,
          "cookTime": 5,
          "servings": 1,
          "nutrition": {
            "calories": 300,
            "protein": 10,
            "carbs": 50,
            "fat": 8,
            "fiber": 6
          },
          "dietaryTags": ["vegetarian", "high_fiber"]
        }
      ],
      "totalCalories": ${targetCalories}
    }
  ]
}`;

    const aiResponse = await generateAIResponse(prompt);
    const mealPlan = parseAIPlan(aiResponse);

    if (!mealPlan.days || !Array.isArray(mealPlan.days)) {
      throw new Error('Invalid meal plan format from AI');
    }

    logger.info(`✅ Generated meal plan for user ${userId}`);

    return {
      ...mealPlan,
      userId,
      duration,
      dietaryPreferences: user.dietaryPreferences,
      allergies: user.allergies,
      generatedBy: 'ai',
      aiPrompt: prompt
    };

  } catch (error) {
    logger.error('Meal plan generation error:', error);
    return generateRuleBasedMealPlan(userId, duration);
  }
};

/**
 * Fallback Rule-Based Meal Plan
 */
const generateRuleBasedMealPlan = async (userId, duration = 7) => {
  const user = await User.findById(userId);
  
  const sampleDay = {
    dayNumber: 1,
    meals: [
      {
        name: "Oatmeal with Banana",
        mealType: "breakfast",
        ingredients: [
          { name: "Oats", quantity: "50", unit: "g" },
          { name: "Banana", quantity: "1", unit: "piece" },
          { name: "Honey", quantity: "1", unit: "tbsp" }
        ],
        instructions: ["Boil water", "Add oats and cook for 5 minutes", "Top with sliced banana and honey"],
        prepTime: 5,
        cookTime: 5,
        servings: 1,
        nutrition: {
          calories: 350,
          protein: 10,
          carbs: 65,
          fat: 6,
          fiber: 8
        },
        dietaryTags: ["vegetarian"]
      },
      {
        name: "Grilled Chicken Salad",
        mealType: "lunch",
        ingredients: [
          { name: "Chicken breast", quantity: "150", unit: "g" },
          { name: "Mixed greens", quantity: "100", unit: "g" },
          { name: "Olive oil", quantity: "1", unit: "tbsp" }
        ],
        instructions: ["Grill chicken", "Toss salad with olive oil", "Add chicken on top"],
        prepTime: 10,
        cookTime: 15,
        servings: 1,
        nutrition: {
          calories: 400,
          protein: 35,
          carbs: 20,
          fat: 18,
          fiber: 5
        },
        dietaryTags: ["high_protein"]
      }
    ],
    totalCalories: 1800
  };

  return {
    title: `${duration}-Day Balanced Meal Plan`,
    description: 'A nutritious and balanced diet',
    dailyCalorieTarget: user.dailyCalorieTarget || 2000,
    days: Array.from({ length: duration }, (_, i) => ({
      ...sampleDay,
      dayNumber: i + 1
    })),
    userId,
    duration,
    generatedBy: 'template'
  };
};

/**
 * Generate Mindfulness Exercises
 */
const generateMindfulnessExercises = async (userId) => {
  try {
    const user = await User.findById(userId);
    
    const prompt = `
Generate 5 personalized mindfulness and mental wellness exercises for a ${user.age}-year-old ${user.gender}.

Focus areas: ${user.healthGoals.filter(g => g.includes('stress') || g.includes('sleep')).join(', ') || 'General wellness'}

Return JSON array:
[
  {
    "title": "Deep Breathing Exercise",
    "duration": 5,
    "difficulty": "beginner",
    "instructions": ["Step 1", "Step 2"],
    "benefits": ["Reduces stress", "Improves focus"],
    "bestTime": "morning"
  }
]`;

    const aiResponse = await generateAIResponse(prompt);
    const exercises = parseAIPlan(aiResponse);

    return Array.isArray(exercises) ? exercises : [exercises];

  } catch (error) {
    logger.error('Mindfulness generation error:', error);
    return getDefaultMindfulnessExercises();
  }
};

const getDefaultMindfulnessExercises = () => {
  return [
    {
      title: "Box Breathing",
      duration: 5,
      difficulty: "beginner",
      instructions: [
        "Inhale for 4 counts",
        "Hold for 4 counts",
        "Exhale for 4 counts",
        "Hold for 4 counts",
        "Repeat for 5 minutes"
      ],
      benefits: ["Reduces anxiety", "Improves focus", "Calms nervous system"],
      bestTime: "anytime"
    },
    {
      title: "Body Scan Meditation",
      duration: 10,
      difficulty: "beginner",
      instructions: [
        "Lie down comfortably",
        "Close your eyes",
        "Focus on each body part from toes to head",
        "Notice any tension",
        "Breathe and relax each area"
      ],
      benefits: ["Reduces physical tension", "Improves body awareness", "Promotes relaxation"],
      bestTime: "evening"
    },
    {
      title: "Gratitude Journaling",
      duration: 10,
      difficulty: "beginner",
      instructions: [
        "Find a quiet space",
        "Write 3 things you're grateful for today",
        "Reflect on why each matters",
        "Notice how it makes you feel"
      ],
      benefits: ["Improves mood", "Increases positivity", "Better sleep quality"],
      bestTime: "evening"
    }
  ];
};

module.exports = {
  generateWorkoutPlan,
  generateMealPlan,
  generateMindfulnessExercises
};