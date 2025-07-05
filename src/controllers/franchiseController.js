const Franchise = require('../models/Franchise');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const Order = require('../models/Order');
const mongoose = require('mongoose');

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
    const { owner, commissionPercentage } = req.body;
    if (!owner || !commissionPercentage) {
        return next(new ErrorResponse('Owner and commissionPercentage are required', 400));
    }
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

// @desc    Get all franchises with sales and commission info (Admin)
// @route   GET /api/v1/franchises/admin/sales
// @access  Private/Admin
exports.getAllFranchiseSales = asyncHandler(async (req, res, next) => {
    const franchises = await Franchise.find().populate('owner', 'name email').lean();
    const data = await Promise.all(franchises.map(async (franchise) => {
        const sales = await Order.find({ franchise: franchise._id });
        const totalSales = sales.reduce((sum, order) => sum + order.totalAmount, 0);
        const commission = (totalSales * franchise.commissionPercentage) / 100;
        return {
            ...franchise,
            totalSales,
            commission
        };
    }));
    res.json(data);
});

// @desc    Get own franchise sales and commission (Franchise Owner)
// @route   GET /api/v1/franchises/my/sales
// @access  Private/Franchise Owner
exports.getMyFranchiseSales = asyncHandler(async (req, res, next) => {
    // Ensure owner is always an ObjectId
    const ownerId = typeof req.user._id === 'string' ? new mongoose.Types.ObjectId(req.user._id) : req.user._id;
    const franchise = await Franchise.findOne({ owner: ownerId });
    if (!franchise) return next(new ErrorResponse('Franchise not found', 404));
    // Exclude stock purchases if orderType is used
    const sales = await Order.find({ franchise: franchise._id, $or: [{ orderType: { $exists: false } }, { orderType: { $ne: 'stock' } }] });
    const totalSales = sales.reduce((sum, order) => sum + order.totalAmount, 0);
    const commission = (totalSales * franchise.commissionPercentage) / 100;
    const totalProductsSold = sales.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
    res.json({
        franchise,
        totalSales,
        commission,
        totalProductsSold
    });
}); 