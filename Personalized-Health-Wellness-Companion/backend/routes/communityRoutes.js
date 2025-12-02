const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  createPost,
  getFeed,
  getPostById,
  toggleLike,
  addComment,
  deletePost,
  getUserPosts
} = require('../controllers/communityController');
const { protect } = require('../middleware/auth');

// Configure multer for multiple image uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5 // Max 5 images per post
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// All routes are protected
router.use(protect);

// Community post routes
router.post('/posts', upload.array('images', 5), createPost);
router.get('/feed', getFeed);
router.get('/posts/:id', getPostById);
router.put('/posts/:id/like', toggleLike);
router.post('/posts/:id/comments', addComment);
router.delete('/posts/:id', deletePost);
router.get('/posts/user/:userId', getUserPosts);

module.exports = router;