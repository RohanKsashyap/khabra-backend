const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  requestPasswordReset,
  resetPassword,
  updateUserProfile
} = require('../controllers/userController');
const { getEarnings } = require('../controllers/earningsController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/', registerUser);
router.post('/login', loginUser);
router.post('/request-password-reset', requestPasswordReset);
router.put('/reset-password/:token', resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.put('/me', protect, updateUserProfile);
router.get('/earnings', protect, getEarnings);

module.exports = router; 