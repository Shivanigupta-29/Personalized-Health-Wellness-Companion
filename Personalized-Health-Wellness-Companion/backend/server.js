require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const logger = require('./utils/logger');
const { initializeCronJobs } = require('./cron/reminderCron');
const Badge = require('./models/Badge');

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Security headers
app.use(helmet());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
app.use('/api', apiLimiter);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/biometrics', require('./routes/biometricRoutes'));
app.use('/api/recommendations', require('./routes/recommendationRoutes'));
app.use('/api/goals', require('./routes/goalRoutes'));
app.use('/api/gamification', require('./routes/gamificationRoutes'));
app.use('/api/community', require('./routes/communityRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/experts', require('./routes/expertRoutes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
  logger.info(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  
  // Initialize default badges
  try {
    await Badge.createDefaultBadges();
  } catch (error) {
    logger.error('Error creating default badges:', error);
  }
  
  // Initialize cron jobs
  if (process.env.NODE_ENV === 'production') {
    initializeCronJobs();
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;