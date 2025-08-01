const express = require('express');
const router = express.Router();
const {
  createWithdrawalRequest,
  getMyWithdrawalRequests,
  getAllWithdrawalRequests,
  updateWithdrawalRequestStatus,
} = require('../controllers/withdrawalController');
const { protect, admin } = require('../middleware/authMiddleware');

// User routes
router.route('/request').post(protect, createWithdrawalRequest);
router.route('/my-requests').get(protect, getMyWithdrawalRequests);

// Admin routes
router.route('/').get(protect, admin, getAllWithdrawalRequests);
router.route('/:id').put(protect, admin, updateWithdrawalRequestStatus);

module.exports = router; 