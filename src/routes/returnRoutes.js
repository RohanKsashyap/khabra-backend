const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const { createReturnRequest, getAllReturnRequests, updateReturnRequestStatus } = require('../controllers/returnController');

const router = express.Router();

router.route('/request').post(protect, createReturnRequest);
router.route('/').get(protect, authorize('admin'), getAllReturnRequests);
router.route('/:id').put(protect, authorize('admin'), updateReturnRequestStatus);

module.exports = router; 