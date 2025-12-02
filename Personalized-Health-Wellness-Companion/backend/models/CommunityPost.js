const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 500
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const CommunityPostSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: [true, 'Post content is required'],
    maxlength: [2000, 'Post cannot exceed 2000 characters']
  },
  
  // Media
  images: [{
    url: String,
    publicId: String
  }],
  
  // Post type
  type: {
    type: String,
    enum: ['achievement', 'question', 'tip', 'motivation', 'general'],
    default: 'general'
  },
  
  // Achievements shared
  achievement: {
    type: {
      type: String,
      enum: ['workout_completed', 'streak_milestone', 'goal_achieved', 'weight_milestone', 'badge_earned']
    },
    data: mongoose.Schema.Types.Mixed
  },
  
  // Tags and categories
  tags: [String],
  category: {
    type: String,
    enum: ['fitness', 'nutrition', 'mental_health', 'success_story', 'question', 'general']
  },
  
  // Engagement
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [CommentSchema],
  views: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  },
  
  // Moderation
  isReported: {
    type: Boolean,
    default: false
  },
  reportCount: {
    type: Number,
    default: 0
  },
  isHidden: {
    type: Boolean,
    default: false
    },
  
  // Pinned posts
  isPinned: {
    type: Boolean,
    default: false
  },
  
  // Privacy
  visibility: {
    type: String,
    enum: ['public', 'friends', 'private'],
    default: 'public'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for like count
CommunityPostSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for comment count
CommunityPostSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Method to add like
CommunityPostSchema.methods.addLike = function(userId) {
  if (!this.likes.includes(userId)) {
    this.likes.push(userId);
  }
  return this.save();
};

// Method to remove like
CommunityPostSchema.methods.removeLike = function(userId) {
  this.likes = this.likes.filter(id => id.toString() !== userId.toString());
  return this.save();
};

// Method to add comment
CommunityPostSchema.methods.addComment = function(userId, content) {
  this.comments.push({ userId, content });
  return this.save();
};

// Indexes
CommunityPostSchema.index({ userId: 1, createdAt: -1 });
CommunityPostSchema.index({ category: 1, createdAt: -1 });
CommunityPostSchema.index({ tags: 1 });
CommunityPostSchema.index({ isPinned: -1, createdAt: -1 });

module.exports = mongoose.model('CommunityPost', CommunityPostSchema);