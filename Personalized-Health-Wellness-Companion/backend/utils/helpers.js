const { startOfDay, endOfDay, subDays, format } = require('date-fns');

/**
 * Calculate BMI (Body Mass Index)
 */
const calculateBMI = (weight, height) => {
  // weight in kg, height in cm
  const heightInMeters = height / 100;
  return (weight / (heightInMeters * heightInMeters)).toFixed(1);
};

/**
 * Get BMI category
 */
const getBMICategory = (bmi) => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

/**
 * Calculate daily calorie needs (Harris-Benedict Equation)
 */
const calculateDailyCalories = (weight, height, age, gender, activityLevel) => {
  let bmr;
  
  // Calculate BMR
  if (gender === 'male') {
    bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else {
    bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }
  
  // Activity multipliers
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9
  };
  
  return Math.round(bmr * (activityMultipliers[activityLevel] || 1.2));
};

/**
 * Get date range for queries
 */
const getDateRange = (days = 7) => {
  const end = endOfDay(new Date());
  const start = startOfDay(subDays(end, days - 1));
  return { start, end };
};

/**
 * Format date for display
 */
const formatDate = (date) => {
  return format(new Date(date), 'MMM dd, yyyy');
};

/**
 * Generate random verification code
 */
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Sanitize user input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

/**
 * Calculate workout difficulty based on user level
 */
const getWorkoutDifficulty = (fitnessLevel) => {
  const difficulties = {
    beginner: 'Easy',
    intermediate: 'Moderate',
    advanced: 'Hard'
  };
  return difficulties[fitnessLevel] || 'Moderate';
};

/**
 * Parse AI response to structured format
 */
const parseAIPlan = (aiResponse) => {
  try {
    // Remove markdown formatting
    let cleaned = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Try to parse as JSON
    if (cleaned.trim().startsWith('{') || cleaned.trim().startsWith('[')) {
      return JSON.parse(cleaned);
    }
    
    // Return as text if not JSON
    return { content: cleaned };
  } catch (error) {
    return { content: aiResponse };
  }
};

module.exports = {
  calculateBMI,
  getBMICategory,
  calculateDailyCalories,
  getDateRange,
  formatDate,
  generateVerificationCode,
  sanitizeInput,
  getWorkoutDifficulty,
  parseAIPlan
};