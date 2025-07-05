const express = require('express');
const router = express.Router();
const {
    getFranchises,
    getFranchise,
    createFranchise,
    updateFranchise,
    deleteFranchise,
    getFranchisesByDistrict,
    getAllFranchiseSales,
    getMyFranchiseSales
} = require('../controllers/franchiseController');

const { protect, authorize } = require('../middleware/auth');
const requireRole = require('../middleware/roleMiddleware');

// Public routes
router.get('/', getFranchises);
router.get('/:id', getFranchise);
router.get('/district/:district', getFranchisesByDistrict);

// Admin only routes
router.post('/', protect, authorize('admin'), createFranchise);
router.put('/:id', protect, authorize('admin'), updateFranchise);
router.delete('/:id', protect, authorize('admin'), deleteFranchise);

// Franchise sales/commission routes
router.get('/admin/sales', protect, requireRole('admin'), getAllFranchiseSales);
router.get('/my/sales', protect, requireRole('franchise_owner'), getMyFranchiseSales);

module.exports = router; 