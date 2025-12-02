const Joi = require('joi');

/**
 * Validate request body against Joi schema
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: errorMessage
      });
    }

    next();
  };
};

// Common validation schemas
const validationSchemas = {
  // User Registration
  register: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    age: Joi.number().min(13).max(120).required(),
    gender: Joi.string().valid('male', 'female', 'other').required(),
    height: Joi.number().min(50).max(300).required(),
    weight: Joi.number().min(20).max(500).required(),
    activityLevel: Joi.string().valid('sedentary', 'light', 'moderate', 'active', 'veryActive').default('moderate'),
    healthGoals: Joi.array().items(Joi.string().valid('weight_loss', 'muscle_gain', 'maintain_weight', 'improve_fitness', 'better_sleep', 'stress_management')),
    dietaryPreferences: Joi.array().items(Joi.string().valid('vegetarian', 'vegan', 'keto', 'paleo', 'mediterranean', 'none')),
    allergies: Joi.array().items(Joi.string())
  }),

  // User Login
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  // Biometric Data
  biometricData: Joi.object({
    type: Joi.string().valid('weight', 'heart_rate', 'sleep_duration', 'blood_pressure', 'steps', 'calories_consumed', 'calories_burned', 'water_intake', 'body_fat', 'mood').required(),
    value: Joi.number().required(),
    unit: Joi.string().required(),
    date: Joi.date().default(Date.now),
    notes: Joi.string().max(500).allow('')
  }),

  // Goal Creation
  goal: Joi.object({
    type: Joi.string().valid('weight', 'fitness', 'nutrition', 'mindfulness').required(),
    title: Joi.string().min(3).max(100).required(),
    targetValue: Joi.number().required(),
    currentValue: Joi.number().required(),
    unit: Joi.string().required(),
    deadline: Joi.date().min('now').required(),
    description: Joi.string().max(500).allow('')
  }),

  // Update Profile
  updateProfile: Joi.object({
    name: Joi.string().min(2).max(50),
    age: Joi.number().min(13).max(120),
    gender: Joi.string().valid('male', 'female', 'other'),
    height: Joi.number().min(50).max(300),
    weight: Joi.number().min(20).max(500),
    activityLevel: Joi.string().valid('sedentary', 'light', 'moderate', 'active', 'veryActive'),
    healthGoals: Joi.array().items(Joi.string()),
    dietaryPreferences: Joi.array().items(Joi.string()),
    allergies: Joi.array().items(Joi.string())
  })
};

module.exports = { validate, validationSchemas };