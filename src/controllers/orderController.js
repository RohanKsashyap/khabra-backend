const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { sendOrderStatusEmail } = require('../utils/emailService');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/asyncHandler');
const Address = require('../models/Address');
const User = require('../models/User');
const mongoose = require('mongoose');
const { distributeMLMCommission } = require('../utils/mlmCommission');
const { updateUserRankProgress } = require('./rankController');

// Create new order
exports.createOrder = async (req, res) => {
  try {
    console.log('Creating order for user:', {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    });

    const {
      items,
      shippingAddress,
      billingAddress,
      paymentMethod,
      paymentDetails,
      totalAmount
    } = req.body;

    const order = new Order({
      user: req.user._id,
      items,
      shippingAddress,
      billingAddress,
      paymentMethod,
      paymentDetails,
      totalAmount,
      status: 'pending',
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid'
    });

    console.log('Order created with user ID:', order.user);
    await order.save();
    console.log('Order saved successfully:', order._id);

    // Distribute MLM commissions for this order
    await distributeMLMCommission(order);

    // Send order confirmation email
    await sendOrderStatusEmail(req.user.email, {
      orderId: order._id,
      status: 'pending',
      items: order.items,
      totalAmount: order.totalAmount
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Error creating order', error: error.message });
  }
};

// Get user's orders (or all orders for admin with filters)
exports.getUserOrders = asyncHandler(async (req, res) => {
  const { status, userId } = req.query;
  let query = {};

  console.log('Getting orders for user:', {
    requestingUserId: req.user._id,
    requestingUserRole: req.user.role,
    filterUserId: userId,
    filterStatus: status
  });

  // Regular users can ONLY see their own orders
  if (req.user.role !== 'admin') {
    query.user = req.user._id;
  } else {
    // Admin can filter by userId if provided
    if (userId) {
      query.user = userId;
    }
  }

  // Both admin and regular users can filter by status
  if (status) {
    query.status = status;
  }

  console.log('Final query:', query);

  try {
    let orders = await Order.find(query)
      .populate({
        path: 'user',
        select: 'name email phone'
      })
      .populate('items.product')
      .populate('items.returnRequest')
      .sort({ createdAt: -1 });

    console.log('Found orders:', orders.map(order => ({
      orderId: order._id,
      userId: order.user._id,
      userName: order.user.name,
      userEmail: order.user.email
    })));

    // Double-check security: Ensure regular users only get their orders
    if (req.user.role !== 'admin') {
      orders = orders.filter(order => order.user._id.toString() === req.user._id.toString());
    }

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single order
exports.getOrder = async (req, res) => {
  try {
    console.log('Getting single order:', {
      orderId: req.params.id,
      requestingUserId: req.user._id,
      requestingUserRole: req.user.role
    });

    let query = { _id: req.params.id };
    
    // If not admin, only allow fetching own orders
    if (req.user.role !== 'admin') {
      query.user = req.user._id;
    }

    console.log('Final query:', query);

    const order = await Order.findOne(query)
      .populate({
        path: 'user',
        select: 'name email phone'
      })
      .populate('items.product')
      .populate('items.returnRequest');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Double-check security: Ensure regular users can only see their own orders
    if (req.user.role !== 'admin' && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    console.log('Found order:', {
      orderId: order._id,
      userId: order.user._id,
      userName: order.user.name,
      userEmail: order.user.email
    });

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Error fetching order', error: error.message });
  }
};

// Update order status (admin only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, trackingNumber, carrier, estimatedDelivery, deliveryNotes } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update order status
    order.status = status;

    // If tracking information is provided, update it
    if (trackingNumber) {
      order.tracking = {
        ...order.tracking,
        number: trackingNumber,
        carrier,
        status: 'in_transit',
        estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined
      };

      // Add tracking update
      order.tracking.updates.push({
        status: 'in_transit',
        description: `Order shipped via ${carrier}. Tracking number: ${trackingNumber}`,
        timestamp: new Date()
      });
    }

    // Update delivery notes if provided
    if (deliveryNotes) {
      order.deliveryNotes = deliveryNotes;
    }

    await order.save();

    // Send status update email
    await sendOrderStatusEmail(order.user, {
      orderId: order._id,
      status: order.status,
      trackingNumber: order.tracking?.number,
      carrier: order.tracking?.carrier,
      estimatedDelivery: order.tracking?.estimatedDelivery
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
};

// Add tracking update (admin only)
exports.addTrackingUpdate = async (req, res) => {
  try {
    const { status, location, description } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Add tracking update
    order.tracking.updates.push({
      status,
      location,
      description,
      timestamp: new Date()
    });

    // Update tracking status
    order.tracking.status = status;

    // If order is delivered, update order status
    if (status === 'delivered') {
      order.status = 'delivered';
      await order.save();
      // Trigger rank evaluation for user and uplines
      await updateRankForUserAndUplines(order.user);
    } else {
      await order.save();
    }

    // Send tracking update email
    await sendOrderStatusEmail(order.user, {
      orderId: order._id,
      status: order.status,
      trackingUpdate: {
        status,
        location,
        description,
        timestamp: new Date()
      }
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error adding tracking update', error: error.message });
  }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only allow cancellation of pending or processing orders
    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(400).json({ 
        message: 'Cannot cancel order in current status'
      });
    }

    order.status = 'cancelled';
    await order.save();

    // Send cancellation email
    await sendOrderStatusEmail(order.user, {
      orderId: order._id,
      status: 'cancelled'
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error cancelling order', error: error.message });
  }
};

// Request return
exports.requestReturn = async (req, res) => {
  try {
    const { reason } = req.body;

    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only allow returns for delivered orders
    if (order.status !== 'delivered') {
      return res.status(400).json({ 
        message: 'Can only request returns for delivered orders'
      });
    }

    // Check if return is already requested
    if (order.returnRequest) {
      return res.status(400).json({ 
        message: 'Return already requested for this order'
      });
    }

    order.returnRequest = {
      reason,
      status: 'pending',
      requestedAt: new Date()
    };

    await order.save();

    // Send return request email
    await sendOrderStatusEmail(order.user, {
      orderId: order._id,
      status: 'return_requested',
      returnReason: reason
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error requesting return', error: error.message });
  }
};

// Update return status (admin only)
exports.updateReturnStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!order.returnRequest) {
      return res.status(400).json({ message: 'No return request found for this order' });
    }

    // Prevent updating status if already completed
    if (order.returnRequest.status === 'completed') {
      return res.status(400).json({ message: 'Return request already completed' });
    }

    order.returnRequest.status = status;
    order.returnRequest.notes = notes;
    order.returnRequest.processedAt = new Date();

    if (status === 'approved') {
      // Update order status
      order.status = 'returned';

      // Update payment status
      order.paymentStatus = 'refunded';

      // Increase product stock
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity }
        });
      }
      // TODO: Implement actual refund processing via payment gateway

    } else if (status === 'rejected') {
      // Keep order status as delivered, but mark return request as rejected
      order.status = 'delivered';
    } else if (status === 'completed') {
       // Mark order status as returned/refunded depending on process
       order.status = 'returned'; // Or a specific status like 'refund_completed'
       order.paymentStatus = 'refunded';
    }

    await order.save();

    // Send return status update email
    await sendOrderStatusEmail(order.user, {
      orderId: order._id,
      status: 'return_' + status,
      returnNotes: notes
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error updating return status', error: error.message });
  }
};

// Admin: Get all return requests
exports.getAllReturnRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { returnRequest: { $exists: true } };

    if (status) {
      query.returnRequest.status = status;
    }

    const returnRequests = await Order.find(query)
      .populate('user', 'name email')
      .populate('items.product', 'name image')
      .sort({ 'returnRequest.requestedAt': -1 });

    // We need to transform the result to return the returnRequest directly,
    // perhaps embedding the necessary order/user/item details.
    // For simplicity now, we'll just return the orders with return requests
    // and the frontend can extract the relevant info.
    // A more robust solution might involve a dedicated ReturnRequest model

    res.json(returnRequests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching return requests', error: error.message });
  }
};

// Delete all orders (Admin only)
exports.deleteBulkOrders = async (req, res) => {
  try {
    await Order.deleteMany({}); // Delete all orders
    res.json({ message: 'All orders deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting all orders', error: error.message });
  }
};

// @desc    Get all orders (Admin only)
// @route   GET /api/orders/admin/all
// @access  Private/Admin
exports.getAllOrders = asyncHandler(async (req, res, next) => {
  const { userFilter } = req.query;

  let userQuery = {};
  if (userFilter) {
    // Find users matching the filter by name or email
    const users = await User.find({
      $or: [
        { name: { $regex: userFilter, $options: 'i' } },
        { email: { $regex: userFilter, $options: 'i' } }
      ]
    }).select('_id');

    const userIds = users.map(user => user._id);
    userQuery = { user: { $in: userIds } };
  }

  const orders = await Order.find(userQuery).populate({
    path: 'user',
    select: 'name email'
  }).populate({
    path: 'items.product',
    select: 'name price image'
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders
  });
});

// Helper to update rank for user and uplines
async function updateRankForUserAndUplines(userId) {
  let user = await User.findById(userId);
  const processed = new Set();
  while (user && user.referredBy && !processed.has(user._id.toString())) {
    await updateUserRankProgress({ user: { _id: user._id } }, { json: () => {} });
    processed.add(user._id.toString());
    user = await User.findOne({ referralCode: user.referredBy });
  }
  // Also update for the original user
  if (user && !processed.has(user._id.toString())) {
    await updateUserRankProgress({ user: { _id: user._id } }, { json: () => {} });
  }
} 