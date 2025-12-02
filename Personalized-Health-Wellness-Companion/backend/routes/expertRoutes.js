const express = require('express');
const router = express.Router();
const ExpertProfile = require('../models/ExpertProfile');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

/**
 * @desc    Create expert profile
 * @route   POST /api/experts/profile
 * @access  Private (Expert only)
 */
router.post('/profile', async (req, res, next) => {
  try {
    const existingProfile = await ExpertProfile.findOne({ userId: req.user.id });
    
    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message: 'Expert profile already exists'
      });
    }

    const expertProfile = await ExpertProfile.create({
      userId: req.user.id,
      ...req.body
    });

    res.status(201).json({
      success: true,
      message: 'Expert profile created successfully',
      data: expertProfile
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Get all experts
 * @route   GET /api/experts
 * @access  Private
 */
router.get('/', async (req, res, next) => {
  try {
    const { specialization, verified, limit = 10, skip = 0 } = req.query;

    const query = { accountStatus: 'active' };
    if (specialization) query.specialization = specialization;
    if (verified === 'true') query.isVerified = true;

    const experts = await ExpertProfile.find(query)
      .populate('userId', 'name profilePicture')
      .sort({ averageRating: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await ExpertProfile.countDocuments(query);

    res.status(200).json({
      success: true,
      count: experts.length,
      total,
      data: experts
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Get expert by ID
 * @route   GET /api/experts/:id
 * @access  Private
 */
router.get('/:id', async (req, res, next) => {
  try {
    const expert = await ExpertProfile.findById(req.params.id)
      .populate('userId', 'name profilePicture bio')
      .populate('reviews.userId', 'name profilePicture');

    if (!expert) {
      return res.status(404).json({
        success: false,
        message: 'Expert not found'
      });
    }

    res.status(200).json({
      success: true,
      data: expert
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Book session with expert
 * @route   POST /api/experts/:id/book
 * @access  Private
 */
router.post('/:id/book', async (req, res, next) => {
  try {
    const { date, startTime, endTime, sessionType, notes } = req.body;

    const expert = await ExpertProfile.findById(req.params.id);

    if (!expert) {
      return res.status(404).json({
        success: false,
        message: 'Expert not found'
      });
    }

    if (!expert.isAcceptingClients) {
      return res.status(400).json({
        success: false,
        message: 'Expert is not accepting new clients at the moment'
      });
    }

    const booking = {
      userId: req.user.id,
      date,
      startTime,
      endTime,
      duration: expert.pricing.sessionDuration,
      sessionType,
      notes,
      price: expert.pricing.consultationFee,
      status: 'pending'
    };

    await expert.addBooking(booking);

    // Create notification for expert
    const Notification = require('../models/Notification');
    await Notification.create({
      userId: expert.userId,
      type: 'expert_booking_confirmed',
      title: '📅 New Booking Request',
      message: `You have a new booking request from ${req.user.name}`,
      priority: 'high'
    });

    res.status(201).json({
      success: true,
      message: 'Booking request sent successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Add review for expert
 * @route   POST /api/experts/:id/review
 * @access  Private
 */
router.post('/:id/review', async (req, res, next) => {
  try {
    const { rating, comment } = req.body;

    const expert = await ExpertProfile.findById(req.params.id);

    if (!expert) {
      return res.status(404).json({
        success: false,
        message: 'Expert not found'
      });
    }

    // Check if user has already reviewed
    const existingReview = expert.reviews.find(
      r => r.userId.toString() === req.user.id
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this expert'
      });
    }

    expert.reviews.push({
      userId: req.user.id,
      rating,
      comment
    });

    await expert.calculateAverageRating();

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      averageRating: expert.averageRating
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;