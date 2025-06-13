const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { sendOrderStatusEmail } = require('../utils/emailService');

// Create new order
exports.createOrder = async (req, res) => {
  try {
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

    await order.save();

    // Send order confirmation email
    await sendOrderStatusEmail(req.user.email, {
      orderId: order._id,
      status: 'pending',
      items: order.items,
      totalAmount: order.totalAmount
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error creating order', error: error.message });
  }
};

// Get user's orders
exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('items.product')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single order
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('items.product');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
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
    }

    await order.save();

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