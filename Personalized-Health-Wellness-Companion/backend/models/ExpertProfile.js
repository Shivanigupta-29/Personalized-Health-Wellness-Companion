const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxlength: 1000
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const AvailabilitySlotSchema = new mongoose.Schema({
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0, // Sunday
    max: 6  // Saturday
  },
  startTime: {
    type: String,
    required: true // Format: "HH:MM"
  },
  endTime: {
    type: String,
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
});

const BookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: String,
  endTime: String,
  duration: Number, // in minutes
  sessionType: {
    type: String,
    enum: ['consultation', 'training', 'nutrition_planning', 'follow_up'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  meetingLink: String,
  notes: String,
  price: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ExpertProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  // Professional Information
  specialization: {
    type: [String],
    enum: ['personal_trainer', 'nutritionist', 'dietitian', 'yoga_instructor', 'mental_health', 'physiotherapist', 'wellness_coach'],
    required: true
  },
  certifications: [{
    name: String,
    issuingOrganization: String,
    issueDate: Date,
    expiryDate: Date,
    certificateUrl: String
  }],
  yearsOfExperience: {
    type: Number,
    required: true,
    min: 0
  },
  education: [{
    degree: String,
    institution: String,
    year: Number
  }],
  
  // Profile Details
  bio: {
    type: String,
    required: true,
    maxlength: 2000
  },
  expertise: [String], // e.g., ["Weight Loss", "Muscle Gain", "Sports Nutrition"]
  languages: [String],
  
  // Pricing
  pricing: {
    consultationFee: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    },
    sessionDuration: {
      type: Number,
      default: 60 // minutes
    }
  },
  
  // Availability
  availability: [AvailabilitySlotSchema],
  timezone: {
    type: String,
    default: 'UTC'
  },
  
  // Bookings
  bookings: [BookingSchema],
  
  // Reviews and Ratings
  reviews: [ReviewSchema],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  
  // Statistics
  totalClients: {
    type: Number,
    default: 0
  },
  totalSessions: {
    type: Number,
    default: 0
  },
  
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDocuments: [{
    type: String,
    url: String
  }],
  
  // Status
  isAcceptingClients: {
    type: Boolean,
    default: true
  },
  accountStatus: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  
  // Social Links
  socialLinks: {
    website: String,
    instagram: String,
    youtube: String,
    linkedin: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Method to calculate average rating
ExpertProfileSchema.methods.calculateAverageRating = function() {
  if (this.reviews.length === 0) {
    this.averageRating = 0;
    this.totalReviews = 0;
  } else {
    const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
    this.averageRating = (sum / this.reviews.length).toFixed(1);
    this.totalReviews = this.reviews.length;
  }
  return this.save();
};

// Method to add booking
ExpertProfileSchema.methods.addBooking = function(bookingData) {
  this.bookings.push(bookingData);
  return this.save();
};

// Indexes
ExpertProfileSchema.index({ specialization: 1 });
ExpertProfileSchema.index({ averageRating: -1 });
ExpertProfileSchema.index({ isVerified: 1, accountStatus: 1 });

module.exports = mongoose.model('ExpertProfile', ExpertProfileSchema);