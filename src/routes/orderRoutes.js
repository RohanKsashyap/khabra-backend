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
  getAllReturnRequests,
  deleteBulkOrders
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware');

// Admin routes (must come before parameterized routes)
router.delete('/bulk', protect, admin, deleteBulkOrders);
router.get('/admin/returns', protect, admin, getAllReturnRequests);

// Protected routes
router.get('/', protect, getUserOrders);
router.post('/', protect, createOrder);

// Parameterized routes
router.get('/:id', protect, getOrder);
router.put('/:id/cancel', protect, cancelOrder);
router.post('/:id/return', protect, requestReturn);
router.put('/:id/status', protect, admin, updateOrderStatus);
router.post('/:id/tracking', protect, admin, addTrackingUpdate);
router.put('/:id/return-status', protect, admin, updateReturnStatus);

module.exports = router; 