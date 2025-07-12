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
  searchUsers,
  getAdminClients,
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

// Admin client management
router.get('/admin/clients', protect, admin, getAdminClients);

// Route for franchise management (doesn't require admin)
router.get('/franchise-owners', protect, getAllUsers);

// User search (for franchise/admin dashboards)
router.get('/search', protect, searchUsers);

router.route('/:id')
  .get(protect, admin, getUserById)
  .put(protect, admin, updateUser)
  .delete(protect, admin, deleteUser);

module.exports = router; 