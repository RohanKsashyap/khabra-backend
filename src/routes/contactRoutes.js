const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.post('/', contactController.createContact);

// Admin only routes
router.get('/', protect, authorize('admin'), contactController.getAllContacts);
router.put('/:id/status', protect, authorize('admin'), contactController.updateContactStatus);
router.delete('/:id', protect, authorize('admin'), contactController.deleteContact);

module.exports = router; 