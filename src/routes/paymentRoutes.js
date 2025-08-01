const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createRazorpayOrder,
  verifyPayment,
  handleWebhook,
  processRefund
} = require('../controllers/paymentController');

// Public webhook route (no auth needed)
router.post('/webhook', handleWebhook);

// Protected routes
router.post('/razorpay/create', protect, createRazorpayOrder);
router.post('/razorpay/verify', protect, verifyPayment);

// Admin only routes
router.post('/refund', protect, authorize('admin'), processRefund);

module.exports = router; 