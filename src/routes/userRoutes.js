const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  requestPasswordReset,
  resetPassword
} = require('../controllers/userController');
const { getEarnings } = require('../controllers/earningsController');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

router.post('/', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.post('/request-password-reset', requestPasswordReset);
router.put('/reset-password/:token', resetPassword);

// Earnings route
router.get('/earnings', protect, getEarnings);

module.exports = router; 