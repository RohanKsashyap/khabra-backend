const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  getAllUsers,
  updateUser,
  deleteUser,
  getUserById,
  bulkDeleteUsers,
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', protect, getMe);

// Admin routes
router.route('/')
  .get(protect, admin, getAllUsers)
  .delete(protect, admin, bulkDeleteUsers);

// Route for franchise management (doesn't require admin)
router.get('/franchise-owners', protect, getAllUsers);

router.route('/:id')
  .get(protect, admin, getUserById)
  .put(protect, admin, updateUser)
  .delete(protect, admin, deleteUser);

module.exports = router; 