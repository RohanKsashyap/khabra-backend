const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

// Admin: Create notification
router.post('/', protect, notificationController.createNotification);
// All: Get notifications
router.get('/', protect, notificationController.getNotifications);
// Admin: Delete notification
router.delete('/:id', protect, notificationController.deleteNotification);

module.exports = router; 