const Franchise = require('../models/Franchise');
const User = require('../models/User');
const Order = require('../models/Order');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { distributeAllCommissions, updateDownlineCount } = require('../utils/mlmCommission');
const mongoose = require('mongoose');

// @desc    Get all franchises (Admin)
// @route   GET /api/v1/franchises
// @access  Private/Admin
exports.getFranchises = asyncHandler(async (req, res, next) => {
    try {
        const franchises = await Franchise.find({ status: 'active' })
            .populate('ownerId', 'name email phone')
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: franchises.length,
            data: franchises
        });
    } catch (error) {
        console.error('Error in getFranchises:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// @desc    Get single franchise
// @route   GET /api/v1/franchises/:id
// @access  Private
exports.getFranchise = asyncHandler(async (req, res, next) => {
    const franchise = await Franchise.findById(req.params.id)
        .populate('ownerId', 'name email phone');
    
    if (!franchise) {
        return next(new ErrorResponse(`Franchise not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
        success: true,
        data: franchise
    });
});

// Helper function to recursively update downline franchiseId
async function updateDownlineFranchiseId(uplineId, franchiseId) {
    const downline = await User.find({ uplineId });
    for (const user of downline) {
        if (String(user.franchiseId) !== String(franchiseId)) {
            user.franchiseId = franchiseId;
            await user.save();
            await updateDownlineFranchiseId(user._id, franchiseId);
        }
    }
}

// @desc    Create franchise (Admin)
// @route   POST /api/v1/franchises
// @access  Private/Admin
exports.createFranchise = asyncHandler(async (req, res, next) => {
    const { ownerId, commissionPercentage } = req.body;
    
    if (!ownerId || !commissionPercentage) {
        return next(new ErrorResponse('Owner ID and commission percentage are required', 400));
    }

    // Check if owner exists and is a franchise owner
    const owner = await User.findById(ownerId);
    if (!owner) {
        return next(new ErrorResponse('Owner not found', 404));
    }

    // Check if user already has a franchise
    const existingFranchise = await Franchise.findOne({ ownerId });
    if (existingFranchise) {
        return next(new ErrorResponse('User already has a franchise', 400));
    }

    // Update user role to franchise_owner
    await User.findByIdAndUpdate(ownerId, { 
        role: 'franchise_owner',
        franchiseId: null // Will be set after franchise creation
    });

    const franchise = await Franchise.create(req.body);
    
    // Update user with franchise ID
    await User.findByIdAndUpdate(ownerId, { franchiseId: franchise._id });

    // Automatically update all downline users to new franchise
    await updateDownlineFranchiseId(ownerId, franchise._id);

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
    }).populate('ownerId', 'name email phone');

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

    // Update owner role back to user
    await User.findByIdAndUpdate(franchise.ownerId, { 
        role: 'user',
        franchiseId: null
    });

    // Update all users under this franchise
    await User.updateMany(
        { franchiseId: franchise._id },
        { franchiseId: null }
    );

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
    const franchises = await Franchise.find({ 
        district: req.params.district,
        status: 'active'
    }).populate('ownerId', 'name email phone');
    
    res.status(200).json({
        success: true,
        count: franchises.length,
        data: franchises
    });
});

// @desc    Get all franchises with sales and downline info (Admin)
// @route   GET /api/v1/franchises/admin/overview
// @access  Private/Admin
exports.getAllFranchisesOverview = asyncHandler(async (req, res, next) => {
    const franchises = await Franchise.find()
        .populate('ownerId', 'name email phone')
        .lean();

    const data = await Promise.all(franchises.map(async (franchise) => {
        // Get orders for this franchise
        const orders = await Order.find({ franchise: franchise._id });
        
        // Calculate sales by type
        const onlineSales = orders
            .filter(order => order.orderType === 'online')
            .reduce((sum, order) => sum + order.totalAmount, 0);
        
        const offlineSales = orders
            .filter(order => order.orderType === 'offline')
            .reduce((sum, order) => sum + order.totalAmount, 0);
        
        const totalSales = onlineSales + offlineSales;
        
        // Get downline count
        const downlineCount = await User.countDocuments({ 
            franchiseId: franchise._id,
            role: { $in: ['distributor', 'user'] }
        });

        // Get recent orders
        const recentOrders = await Order.find({ franchise: franchise._id })
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .limit(5);

        return {
            ...franchise,
            sales: {
                online: onlineSales,
                offline: offlineSales,
                total: totalSales
            },
            downlineCount,
            recentOrders
        };
    }));

    res.json({
        success: true,
        count: data.length,
        data: data
    });
});

// @desc    Get franchise details with orders (Admin)
// @route   GET /api/v1/franchises/:id/details
// @access  Private/Admin
exports.getFranchiseDetails = asyncHandler(async (req, res, next) => {
    const franchise = await Franchise.findById(req.params.id)
        .populate('ownerId', 'name email phone');

    if (!franchise) {
        return next(new ErrorResponse(`Franchise not found with id of ${req.params.id}`, 404));
    }

    // Get all orders for this franchise
    const orders = await Order.find({ franchise: franchise._id })
        .populate('user', 'name email')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });

    // Get downline members
    const downlineMembers = await User.find({ 
        franchiseId: franchise._id,
        role: { $in: ['distributor', 'user'] }
    }).select('name email phone role createdAt');

    // Calculate statistics
    const onlineSales = orders
        .filter(order => order.orderType === 'online')
        .reduce((sum, order) => sum + order.totalAmount, 0);
    
    const offlineSales = orders
        .filter(order => order.orderType === 'offline')
        .reduce((sum, order) => sum + order.totalAmount, 0);

    const totalCommission = orders.reduce((sum, order) => {
        return sum + (order.commissions?.franchise?.amount || 0);
    }, 0);

    res.json({
        success: true,
        data: {
            franchise,
            orders,
            downlineMembers,
            statistics: {
                totalOrders: orders.length,
                onlineSales,
                offlineSales,
                totalSales: onlineSales + offlineSales,
                totalCommission,
                downlineCount: downlineMembers.length
            }
        }
    });
});

// @desc    Get own franchise sales and commission (Franchise Owner)
// @route   GET /api/v1/franchises/my/sales
// @access  Private/Franchise Owner
exports.getMyFranchiseSales = asyncHandler(async (req, res, next) => {
    const franchise = await Franchise.findOne({ ownerId: req.user._id });
    if (!franchise) {
        return next(new ErrorResponse('Franchise not found', 404));
    }

    // Get orders for this franchise
    const orders = await Order.find({ franchise: franchise._id })
        .populate('user', 'name email')
        .sort({ createdAt: -1 });

    // Calculate sales by type
    const onlineSales = orders
        .filter(order => order.orderType === 'online')
        .reduce((sum, order) => sum + order.totalAmount, 0);
    
    const offlineSales = orders
        .filter(order => order.orderType === 'offline')
        .reduce((sum, order) => sum + order.totalAmount, 0);

    const totalCommission = orders.reduce((sum, order) => {
        return sum + (order.commissions?.franchise?.amount || 0);
    }, 0);

    // Get downline members
    const downlineMembers = await User.find({ 
        franchiseId: franchise._id,
        role: { $in: ['distributor', 'user'] }
    }).select('name email phone role createdAt');

    res.json({
        success: true,
        data: {
            franchise,
            sales: {
                online: onlineSales,
                offline: offlineSales,
                total: onlineSales + offlineSales
            },
            totalCommission,
            downlineCount: downlineMembers.length,
            downlineMembers,
            orders: orders.slice(0, 10) // Recent 10 orders
        }
    });
});

// @desc    Create offline order for franchise (Franchise Owner)
// @route   POST /api/v1/franchises/orders
// @access  Private/Franchise Owner
exports.createFranchiseOrder = asyncHandler(async (req, res, next) => {
    const {
        userId,
        items,
        shippingAddress,
        billingAddress,
        paymentMethod = 'cod',
        paymentStatus = 'paid',
        status = 'pending',
        notes
    } = req.body;

    // Ensure the current user is a franchise owner
    const franchise = await Franchise.findOne({ ownerId: req.user._id });
    if (!franchise) {
        return next(new ErrorResponse('Franchise not found', 404));
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
        return next(new ErrorResponse(`User not found with id of ${userId}`, 404));
    }

    // Calculate total amount
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
        if (!item.productName || !item.productPrice || !item.productImage) {
            return next(new ErrorResponse('Product details are required', 400));
        }
        
        orderItems.push({
            productName: item.productName,
            productPrice: item.productPrice,
            productImage: item.productImage,
            quantity: item.quantity,
            productDetails: item.productDetails || '',
        });
        totalAmount += Number(item.productPrice) * item.quantity;
    }

    // Create the order with franchise association
    const order = new Order({
        user: userId,
        items: orderItems,
        shippingAddress,
        billingAddress,
        paymentMethod,
        totalAmount,
        status,
        paymentStatus,
        orderType: 'offline', // Franchise orders are offline
        franchise: franchise._id,
        createdBy: req.user._id,
        notes
    });

    await order.save();

    // If order is delivered, distribute commissions
    if (status === 'delivered') {
        await distributeAllCommissions(order);
    }

    res.status(201).json({
        success: true,
        data: order
    });
});

// @desc    Add downline member (Franchise Owner)
// @route   POST /api/v1/franchises/downline
// @access  Private/Franchise Owner
exports.addDownlineMember = asyncHandler(async (req, res, next) => {
    const {
        name,
        email,
        phone,
        role = 'distributor',
        uplineId
    } = req.body;

    // Ensure the current user is a franchise owner
    const franchise = await Franchise.findOne({ ownerId: req.user._id });
    if (!franchise) {
        return next(new ErrorResponse('Franchise not found', 404));
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return next(new ErrorResponse('User with this email already exists', 400));
    }

    // Generate referral code
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create new user
    const newUser = new User({
        name,
        email,
        phone,
        password: 'defaultPassword123', // Will be changed on first login
        role,
        franchiseId: franchise._id,
        uplineId: uplineId || req.user._id, // If no upline specified, franchise owner is upline
        referralCode,
        referredBy: req.user.referralCode
    });

    await newUser.save();

    // Update downline count for upline
    await updateDownlineCount(uplineId || req.user._id);

    res.status(201).json({
        success: true,
        data: {
            user: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                phone: newUser.phone,
                role: newUser.role,
                referralCode: newUser.referralCode
            },
            message: 'Downline member added successfully'
        }
    });
});

// @desc    Get franchise statistics (Admin)
// @route   GET /api/v1/franchises/admin/statistics
// @access  Private/Admin
exports.getFranchiseStatistics = asyncHandler(async (req, res, next) => {
    const totalFranchises = await Franchise.countDocuments();
    const activeFranchises = await Franchise.countDocuments({ status: 'active' });
    
    const totalSales = await Order.aggregate([
        { $match: { franchise: { $exists: true, $ne: null } } },
        {
            $group: {
                _id: null,
                totalAmount: { $sum: '$totalAmount' },
                onlineSales: {
                    $sum: {
                        $cond: [{ $eq: ['$orderType', 'online'] }, '$totalAmount', 0]
                    }
                },
                offlineSales: {
                    $sum: {
                        $cond: [{ $eq: ['$orderType', 'offline'] }, '$totalAmount', 0]
                    }
                }
            }
        }
    ]);

    const totalDownline = await User.countDocuments({
        role: { $in: ['distributor', 'user'] },
        franchiseId: { $exists: true, $ne: null }
    });

    const topFranchises = await Franchise.find()
        .populate('ownerId', 'name email')
        .sort({ 'totalSales.total': -1 })
        .limit(5);

    res.json({
        success: true,
        data: {
            totalFranchises,
            activeFranchises,
            totalSales: totalSales[0] || { totalAmount: 0, onlineSales: 0, offlineSales: 0 },
            totalDownline,
            topFranchises
        }
    });
});

// @desc    Get franchise downline network tree (Admin/Franchise Owner)
// @route   GET /api/v1/franchises/:id/network
// @access  Private/Admin or Franchise Owner
exports.getFranchiseNetwork = asyncHandler(async (req, res, next) => {
    const franchiseId = req.params.id;
    // Only allow access if admin or the franchise owner
    if (req.user.role !== 'admin' && req.user.role !== 'franchise_owner') {
        return next(new ErrorResponse('Not authorized to view this network', 403));
    }
    // If franchise_owner, ensure they own this franchise
    if (req.user.role === 'franchise_owner') {
        const franchise = await Franchise.findById(franchiseId);
        if (!franchise || String(franchise.ownerId) !== String(req.user._id)) {
            return next(new ErrorResponse('Not authorized to view this network', 403));
        }
    }
    // Get all users in this franchise
    const users = await User.find({ franchiseId }).select('_id name email phone role uplineId createdAt');
    // Build a map for quick lookup
    const userMap = {};
    users.forEach(user => { userMap[user._id] = { ...user._doc, children: [] }; });
    let rootNodes = [];
    // Build the tree
    users.forEach(user => {
        if (user.uplineId && userMap[user.uplineId]) {
            userMap[user.uplineId].children.push(userMap[user._id]);
        } else {
            rootNodes.push(userMap[user._id]);
        }
    });
    res.json({ success: true, data: rootNodes });
});

module.exports = exports; 