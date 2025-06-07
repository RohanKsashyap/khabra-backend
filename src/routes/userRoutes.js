const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  requestPasswordReset,
  resetPassword
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.post('/request-password-reset', requestPasswordReset);
router.put('/reset-password/:token', resetPassword);

module.exports = router; 