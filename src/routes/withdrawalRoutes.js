const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requestWithdrawal, getMyWithdrawals, getAllWithdrawals, updateWithdrawalStatus } = require('../controllers/withdrawalController');

// User requests a withdrawal
router.post('/request', protect, requestWithdrawal);

// User views their withdrawal history
router.get('/my', protect, getMyWithdrawals);

// Admin: view all withdrawal requests
router.get('/all', protect, getAllWithdrawals);

// Admin: approve/reject a withdrawal request
router.put('/:id', protect, updateWithdrawalStatus);

module.exports = router; 