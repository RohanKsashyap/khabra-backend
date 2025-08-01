const Notification = require('../models/Notification');

// Admin only: Create notification
exports.createNotification = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create notifications.' });
    }
    const { title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required.' });
    }
    const notification = await Notification.create({
      title,
      message,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create notification.' });
  }
};

// All users: Get all notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email');
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notifications.' });
  }
};

// Admin only: Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete notifications.' });
    }
    const { id } = req.params;
    const notification = await Notification.findByIdAndDelete(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }
    res.json({ success: true, message: 'Notification deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete notification.' });
  }
}; 