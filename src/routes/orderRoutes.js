const express = require('express');
const router = express.Router();
const {
  getUserOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  addTrackingUpdate,
  cancelOrder,
  requestReturn,
  updateReturnStatus,
  getAllReturnRequests
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes
router.get('/:id', protect, getOrder);

// Protected routes
router.get('/', protect, getUserOrders);
router.post('/', protect, createOrder);
router.put('/:id/cancel', protect, cancelOrder);
router.post('/:id/return', protect, requestReturn);

// Admin routes
router.use(protect, admin);
router.get('/admin/returns', getAllReturnRequests);
router.put('/:id/status', updateOrderStatus);
router.post('/:id/tracking', addTrackingUpdate);
router.put('/:id/return-status', updateReturnStatus);

module.exports = router; 