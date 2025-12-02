const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotificationById,
  deleteAllReadNotifications
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// IMPORTANT: More specific routes MUST come before parameterized routes
router.get('/', getNotifications);
router.put('/read-all', markAllNotificationsAsRead);
router.delete('/read-all', deleteAllReadNotifications); // Changed from /read to /read-all
router.put('/:id/read', markNotificationAsRead);
router.delete('/:id', deleteNotificationById);

module.exports = router;