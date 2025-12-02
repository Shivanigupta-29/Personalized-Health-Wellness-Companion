const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  updateProfile,
  uploadProfilePicture,
  updateNotificationPreferences,
  getUserProfile,
  getDashboardStats,
  deleteAccount
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { validate, validationSchemas } = require('../middleware/validator');

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
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

// Profile routes
router.put('/profile', validate(validationSchemas.updateProfile), updateProfile);
router.post('/profile-picture', upload.single('image'), uploadProfilePicture);
router.put('/notifications', updateNotificationPreferences);
router.get('/dashboard/stats', getDashboardStats);
router.get('/:id', getUserProfile);

// Account deletion
router.delete('/account', deleteAccount);

module.exports = router;