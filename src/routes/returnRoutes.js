const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const { createReturnRequest, getAllReturnRequests, updateReturnRequestStatus, deleteAllReturnRequests } = require('../controllers/returnController');

const router = express.Router();

router.route('/request').post(protect, createReturnRequest);
router.route('/').get(protect, authorize('admin'), getAllReturnRequests);
router.route('/:id').put(protect, authorize('admin'), updateReturnRequestStatus);
router.route('/admin/all').delete(protect, authorize('admin'), deleteAllReturnRequests);

module.exports = router; 