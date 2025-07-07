const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');

const {
  createOrder,
  getUserOrders,
  getOrder,
  updateOrderStatus,
  addTrackingUpdate,
  updateReturnStatus,
  cancelOrder,
  requestReturn,
  getAllReturnRequests,
  getTotalProductSales,
  deleteBulkOrders,
  getAllOrders,
  createAdminOrder,
  testMLMCommission,
} = require('../controllers/orderController');

// Admin routes
router.get('/admin/all', protect, admin, getAllOrders);
router.get('/admin/total-sales', protect, admin, getTotalProductSales);
router.get('/admin/returns', protect, admin, getAllReturnRequests);
router.delete('/bulk', protect, admin, deleteBulkOrders);
router.post('/admin/create', protect, admin, createAdminOrder);

// User routes
router.post('/', protect, createOrder);
router.get('/', protect, getUserOrders);

router.get('/:id', protect, getOrder);
router.put('/:id', protect, admin, updateOrderStatus);
router.put('/:id/status', protect, admin, updateOrderStatus);

router.put('/:id/cancel', protect, cancelOrder);
router.post('/:id/return', protect, requestReturn);
router.post('/:id/tracking', protect, admin, addTrackingUpdate);
router.put('/:id/return-status', protect, admin, updateReturnStatus);

// Test MLM commission system
router.post('/test-mlm-commission', protect, admin, testMLMCommission);

module.exports = router; 