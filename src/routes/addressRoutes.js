const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getDefaultAddress,
  getAddressesByUserId
} = require('../controllers/addressController');

// All routes are protected
router.use(protect);

// Get all addresses for a specific user (admin only)
router.get('/user/:userId', getAddressesByUserId);

// Get all addresses
router.get('/', getAddresses);

// Add new address
router.post('/', addAddress);

// Update address
router.put('/:id', updateAddress);

// Delete address
router.delete('/:id', deleteAddress);

// Set address as default
router.put('/:id/default', setDefaultAddress);

// Get default address
router.get('/default', getDefaultAddress);

module.exports = router; 