const express = require('express');
const router = express.Router();
const {
    getFranchises,
    getFranchise,
    createFranchise,
    updateFranchise,
    deleteFranchise,
    getFranchisesByDistrict
} = require('../controllers/franchiseController');

const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getFranchises);
router.get('/:id', getFranchise);
router.get('/district/:district', getFranchisesByDistrict);

// Admin only routes
router.post('/', protect, authorize('admin'), createFranchise);
router.put('/:id', protect, authorize('admin'), updateFranchise);
router.delete('/:id', protect, authorize('admin'), deleteFranchise);

module.exports = router; 