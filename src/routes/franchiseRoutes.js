const express = require('express');
const router = express.Router();
const {
    getFranchises,
    getFranchise,
    createFranchise,
    updateFranchise,
    deleteFranchise,
    getFranchisesByDistrict,
    getAllFranchisesOverview,
    getFranchiseDetails,
    getMyFranchiseSales,
    createFranchiseOrder,
    addDownlineMember,
    getFranchiseStatistics,
    getFranchiseNetwork
} = require('../controllers/franchiseController');

const { protect, authorize } = require('../middleware/auth');
const requireRole = require('../middleware/roleMiddleware');

// Public routes
router.get('/district/:district', getFranchisesByDistrict);
router.get('/test-public', (req, res) => {
  res.json({ success: true, message: 'Public route works!' });
});

// Admin only routes
router.get('/', getFranchises);
router.post('/', protect, requireRole('admin'), createFranchise);
router.put('/:id', protect, requireRole('admin'), updateFranchise);
router.delete('/:id', protect, requireRole('admin'), deleteFranchise);

// Admin franchise management routes
router.get('/admin/overview', protect, requireRole('admin'), getAllFranchisesOverview);
router.get('/admin/statistics', protect, requireRole('admin'), getFranchiseStatistics);
router.get('/:id/details', protect, requireRole('admin'), getFranchiseDetails);

// Franchise owner routes
router.get('/my/sales', protect, requireRole('franchise_owner'), getMyFranchiseSales);
router.post('/orders', protect, requireRole('franchise_owner'), createFranchiseOrder);
router.post('/downline', protect, requireRole('franchise_owner'), addDownlineMember);

// Single franchise route (accessible by admin and franchise owner)
router.get('/:id', getFranchise);

// Network visualization route (admin or franchise owner)
router.get('/:id/network', protect, requireRole(['admin', 'franchise_owner']), getFranchiseNetwork);

module.exports = router; 