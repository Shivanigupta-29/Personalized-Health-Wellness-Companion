const CommunityPost = require('../models/CommunityPost');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const { uploadToCloudinary } = require('../config/cloudinary');
const { awardPoints } = require('../services/gamificationService');
const logger = require('../utils/logger');

/**
 * @desc    Create community post
 * @route   POST /api/community/posts
 * @access  Private
 */
const createPost = async (req, res, next) => {
  try {
    const { content, type, achievement, tags, category } = req.body;

    // Upload images if provided
    let images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.path, 'community-posts');
        images.push({
          url: result.url,
          publicId: result.publicId
        });
      }
    }

    const post = await CommunityPost.create({
      userId: req.user.id,
      content,
      type,
      achievement,
      tags,
      category,
      images
    });

    // Populate user data
    await post.populate('userId', 'name profilePicture');

    // Award points
    await awardPoints(req.user.id, 10, 'Created community post');

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      activityType: 'community_post',
      description: 'Created a community post',
      relatedId: post._id,
      relatedModel: 'CommunityPost',
      pointsEarned: 10
    });

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: post
    });
  } catch (error) {
    logger.error('Create post error:', error);
    next(error);
  }
};

/**
 * @desc    Get community feed
 * @route   GET /api/community/feed
 * @access  Private
 */
const getFeed = async (req, res, next) => {
  try {
    const { 
      limit = 20, 
      skip = 0, 
      category, 
      type 
    } = req.query;

    const query = { 
      visibility: 'public',
      isHidden: false 
    };

    if (category) query.category = category;
    if (type) query.type = type;

    const posts = await CommunityPost.find(query)
      .populate('userId', 'name profilePicture totalPoints')
      .populate('comments.userId', 'name profilePicture')
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await CommunityPost.countDocuments(query);

    res.status(200).json({
      success: true,
      count: posts.length,
      total,
      hasMore: total > parseInt(skip) + parseInt(limit),
      data: posts
    });
  } catch (error) {
    logger.error('Get feed error:', error);
    next(error);
  }
};

/**
 * @desc    Get post by ID
 * @route   GET /api/community/posts/:id
 * @access  Private
 */
const getPostById = async (req, res, next) => {
  try {
    const post = await CommunityPost.findById(req.params.id)
      .populate('userId', 'name profilePicture totalPoints badges')
      .populate('comments.userId', 'name profilePicture');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Increment views
    post.views += 1;
    await post.save();

    res.status(200).json({
      success: true,
      data: post
    });
  } catch (error) {
    logger.error('Get post by ID error:', error);
    next(error);
  }
};

/**
 * @desc    Like/Unlike post
 * @route   PUT /api/community/posts/:id/like
 * @access  Private
 */
const toggleLike = async (req, res, next) => {
  try {
    const post = await CommunityPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const hasLiked = post.likes.includes(req.user.id);

    if (hasLiked) {
      // Unlike
      await post.removeLike(req.user.id);
    } else {
      // Like
      await post.addLike(req.user.id);

      // Notify post owner (if not liking own post)
      if (post.userId.toString() !== req.user.id) {
        await Notification.create({
          userId: post.userId,
          type: 'community_like',
          title: '👍 Someone liked your post',
          message: `${req.user.name} liked your post`,
          relatedId: post._id,
          relatedModel: 'CommunityPost'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: hasLiked ? 'Post unliked' : 'Post liked',
      likeCount: post.likes.length,
      hasLiked: !hasLiked
    });
  } catch (error) {
    logger.error('Toggle like error:', error);
    next(error);
  }
};

/**
 * @desc    Add comment to post
 * @route   POST /api/community/posts/:id/comments
 * @access  Private
 */
const addComment = async (req, res, next) => {
  try {
    const { content } = req.body;

    const post = await CommunityPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    await post.addComment(req.user.id, content);
    await post.populate('comments.userId', 'name profilePicture');

    // Award points
    await awardPoints(req.user.id, 5, 'Added comment');

    // Notify post owner (if not commenting on own post)
    if (post.userId.toString() !== req.user.id) {
      await Notification.create({
        userId: post.userId,
        type: 'community_comment',
        title: '💬 New comment on your post',
        message: `${req.user.name} commented on your post`,
        relatedId: post._id,
        relatedModel: 'CommunityPost'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: post.comments
    });
  } catch (error) {
    logger.error('Add comment error:', error);
    next(error);
  }
};

/**
 * @desc    Delete post
 * @route   DELETE /api/community/posts/:id
 * @access  Private
 */
const deletePost = async (req, res, next) => {
  try {
    const post = await CommunityPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check ownership
    if (post.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }

    await post.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    logger.error('Delete post error:', error);
    next(error);
  }
};

/**
 * @desc    Get user's posts
 * @route   GET /api/community/posts/user/:userId
 * @access  Private
 */
const getUserPosts = async (req, res, next) => {
  try {
    const { limit = 10, skip = 0 } = req.query;

    const posts = await CommunityPost.find({
      userId: req.params.userId,
      isHidden: false
    })
      .populate('userId', 'name profilePicture')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await CommunityPost.countDocuments({
      userId: req.params.userId,
      isHidden: false
    });

    res.status(200).json({
      success: true,
      count: posts.length,
      total,
      data: posts
    });
  } catch (error) {
    logger.error('Get user posts error:', error);
    next(error);
  }
};

module.exports = {
  createPost,
  getFeed,
  getPostById,
  toggleLike,
  addComment,
  deletePost,
  getUserPosts
};