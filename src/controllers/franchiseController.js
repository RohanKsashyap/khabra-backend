const Franchise = require('../models/Franchise');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all franchises
// @route   GET /api/v1/franchises
// @access  Public
exports.getFranchises = asyncHandler(async (req, res, next) => {
    const franchises = await Franchise.find();
    res.status(200).json({
        success: true,
        count: franchises.length,
        data: franchises
    });
});

// @desc    Get single franchise
// @route   GET /api/v1/franchises/:id
// @access  Public
exports.getFranchise = asyncHandler(async (req, res, next) => {
    const franchise = await Franchise.findById(req.params.id);
    
    if (!franchise) {
        return next(new ErrorResponse(`Franchise not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
        success: true,
        data: franchise
    });
});

// @desc    Create franchise
// @route   POST /api/v1/franchises
// @access  Private/Admin
exports.createFranchise = asyncHandler(async (req, res, next) => {
    const franchise = await Franchise.create(req.body);
    
    res.status(201).json({
        success: true,
        data: franchise
    });
});

// @desc    Update franchise
// @route   PUT /api/v1/franchises/:id
// @access  Private/Admin
exports.updateFranchise = asyncHandler(async (req, res, next) => {
    let franchise = await Franchise.findById(req.params.id);

    if (!franchise) {
        return next(new ErrorResponse(`Franchise not found with id of ${req.params.id}`, 404));
    }

    franchise = await Franchise.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: franchise
    });
});

// @desc    Delete franchise
// @route   DELETE /api/v1/franchises/:id
// @access  Private/Admin
exports.deleteFranchise = asyncHandler(async (req, res, next) => {
    const franchise = await Franchise.findById(req.params.id);

    if (!franchise) {
        return next(new ErrorResponse(`Franchise not found with id of ${req.params.id}`, 404));
    }

    await franchise.deleteOne();

    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Get franchises by district
// @route   GET /api/v1/franchises/district/:district
// @access  Public
exports.getFranchisesByDistrict = asyncHandler(async (req, res, next) => {
    const franchises = await Franchise.find({ district: req.params.district });
    
    res.status(200).json({
        success: true,
        count: franchises.length,
        data: franchises
    });
}); 