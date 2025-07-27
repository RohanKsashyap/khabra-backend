const crypto = require('crypto');
const { razorpay, razorpayKeyId, webhookSecret } = require('../config/razorpay');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { sendOrderStatusEmail } = require('../utils/emailService');

// Create Razorpay order
exports.createRazorpayOrder = asyncHandler(async (req, res, next) => {
  const { orderId } = req.body;

  // Find the order in our database
  const order = await Order.findById(orderId);
  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }

  // Verify order belongs to the authenticated user
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized to access this order', 403));
  }

  // Convert amount to smallest currency unit (paise for INR)
  const amountInPaise = Math.round(order.totalAmount * 100);

  // Prepare order data for Razorpay
  const razorpayOrderData = {
    amount: amountInPaise,
    currency: 'INR',
    receipt: `order_${order._id}`,
    notes: {
      orderId: order._id.toString(),
      userId: req.user._id.toString(),
    }
  };

  try {
    // Create order in Razorpay
    const razorpayOrder = await razorpay.orders.create(razorpayOrderData);

    // Create or update payment record
    let payment = await Payment.findOne({ order: order._id });
    if (!payment) {
      payment = new Payment({
        order: order._id,
        amount: order.totalAmount,
        paymentMethod: 'razorpay',
        status: 'pending',
        razorpayOrderId: razorpayOrder.id
      });
    } else {
      payment.razorpayOrderId = razorpayOrder.id;
      payment.status = 'pending';
    }
    await payment.save();

    // Update order payment details
    order.paymentDetails = {
      ...order.paymentDetails,
      razorpayOrderId: razorpayOrder.id
    };
    order.paymentMethod = 'razorpay';
    await order.save();

    // Return necessary information for checkout
    res.status(200).json({
      success: true,
      data: {
        orderId: order._id,
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId,
        amount: amountInPaise,
        currency: 'INR',
        prefill: {
          name: order.shippingAddress.fullName,
          email: req.user.email,
          contact: order.shippingAddress.phone
        }
      }
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    return next(new ErrorResponse('Error creating payment order', 500));
  }
});

// Verify Razorpay payment
exports.verifyPayment = asyncHandler(async (req, res, next) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  // Validate required parameters
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return next(new ErrorResponse('Missing payment verification parameters', 400));
  }

  // Find payment by Razorpay order ID
  const payment = await Payment.findOne({ razorpayOrderId });
  if (!payment) {
    return next(new ErrorResponse('Payment not found', 404));
  }

  // Find the order
  const order = await Order.findById(payment.order);
  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }

  // Verify signature
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (generatedSignature !== razorpaySignature) {
    // Update payment status to failed
    payment.status = 'failed';
    payment.errorDetails = { message: 'Invalid payment signature' };
    await payment.save();
    return next(new ErrorResponse('Invalid payment signature', 400));
  }

  // Update payment record
  payment.razorpayPaymentId = razorpayPaymentId;
  payment.razorpaySignature = razorpaySignature;
  payment.status = 'captured';
  await payment.save();

  // Update order status
  order.status = 'processing';
  order.paymentStatus = 'paid';
  order.paymentDetails = {
    ...order.paymentDetails,
    razorpayPaymentId,
    razorpaySignature
  };
  await order.save();

  // Send order confirmation email
  await sendOrderStatusEmail(req.user.email, {
    orderId: order._id,
    status: order.status,
    items: order.items,
    totalAmount: order.totalAmount
  });

  res.status(200).json({
    success: true,
    message: 'Payment verified successfully',
    data: { order, payment }
  });
});

// Handle Razorpay webhook
exports.handleWebhook = asyncHandler(async (req, res, next) => {
  const signature = req.headers['x-razorpay-signature'];
  
  if (!signature) {
    return next(new ErrorResponse('Missing webhook signature', 400));
  }

  // Verify webhook signature
  try {
    const requestBody = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(requestBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('Invalid webhook signature');
      return next(new ErrorResponse('Invalid webhook signature', 400));
    }
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return next(new ErrorResponse('Webhook signature verification failed', 400));
  }

  // Process webhook event
  const event = req.body.event;
  console.log(`Processing webhook event: ${event}`);

  try {
    if (event.startsWith('payment.')) {
      await handlePaymentEvent(req.body);
    } else if (event.startsWith('refund.')) {
      await handleRefundEvent(req.body);
    }

    res.status(200).json({ success: true, message: 'Webhook processed successfully' });
  } catch (error) {
    console.error(`Error processing webhook ${event}:`, error);
    // Still return 200 to acknowledge receipt to Razorpay
    res.status(200).json({ 
      success: false, 
      message: `Error processing webhook: ${error.message}` 
    });
  }
});

// Process payment refund
exports.processRefund = asyncHandler(async (req, res, next) => {
  const { orderId, amount, notes } = req.body;

  // Find the order
  const order = await Order.findById(orderId);
  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }

  // Check if user is authorized to refund
  if (req.user.role !== 'admin' && order.user.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse('Not authorized to refund this order', 403));
  }

  // Find payment
  const payment = await Payment.findOne({ order: order._id });
  if (!payment || !payment.razorpayPaymentId) {
    return next(new ErrorResponse('No payment found for this order', 404));
  }

  // Validate refund amount
  const refundAmount = amount || order.totalAmount;
  if (refundAmount <= 0 || refundAmount > order.totalAmount) {
    return next(new ErrorResponse('Invalid refund amount', 400));
  }

  try {
    // Convert amount to paise
    const refundAmountInPaise = Math.round(refundAmount * 100);

    // Process refund through Razorpay
    const refundData = {
      amount: refundAmountInPaise,
      speed: "normal",
      notes: {
        orderId: order._id.toString(),
        reason: notes || "Customer requested refund"
      }
    };

    // Initiate refund
    const razorpayRefund = await razorpay.payments.refund(
      payment.razorpayPaymentId,
      refundData
    );

    // Update payment record
    payment.refundId = razorpayRefund.id;
    payment.refundStatus = 'initiated';
    payment.refundAmount = refundAmount;
    await payment.save();

    // Update order status
    if (refundAmount === order.totalAmount) {
      order.paymentStatus = 'refunded';
      order.status = 'returned';
    } else {
      order.paymentStatus = 'partially_refunded';
    }
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Refund initiated successfully',
      data: { refund: razorpayRefund, order, payment }
    });
  } catch (error) {
    console.error('Refund error:', error);
    return next(new ErrorResponse(`Failed to process refund: ${error.message}`, 500));
  }
});

// Helper function to handle payment events from webhook
async function handlePaymentEvent(payload) {
  const paymentEntity = payload.payload.payment.entity;
  const razorpayPaymentId = paymentEntity.id;
  const razorpayOrderId = paymentEntity.order_id;
  const paymentStatus = paymentEntity.status;

  // Find payment by Razorpay order ID
  const payment = await Payment.findOne({ razorpayOrderId });
  if (!payment) {
    console.error(`Payment not found for Razorpay order ID: ${razorpayOrderId}`);
    return;
  }

  // Find the order
  const order = await Order.findById(payment.order);
  if (!order) {
    console.error(`Order not found for payment: ${payment._id}`);
    return;
  }

  // Map Razorpay payment status to our system's status
  const statusMapping = {
    created: 'pending',
    authorized: 'authorized',
    captured: 'captured',
    refunded: 'refunded',
    failed: 'failed'
  };

  // Update payment status
  if (statusMapping[paymentStatus]) {
    payment.status = statusMapping[paymentStatus];
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.paymentDetails = paymentEntity;
    await payment.save();

    // Update order status based on payment status
    if (paymentStatus === 'captured') {
      order.status = 'processing';
      order.paymentStatus = 'paid';
    } else if (paymentStatus === 'failed') {
      order.status = 'pending';
      order.paymentStatus = 'failed';
    } else if (paymentStatus === 'refunded') {
      order.status = 'returned';
      order.paymentStatus = 'refunded';
    }

    await order.save();
  }
}

// Helper function to handle refund events from webhook
async function handleRefundEvent(payload) {
  const refundEntity = payload.payload.refund.entity;
  const razorpayRefundId = refundEntity.id;
  const razorpayPaymentId = refundEntity.payment_id;
  const refundAmount = refundEntity.amount / 100; // Convert from paise
  const refundStatus = refundEntity.status;
  const event = payload.event;

  // Find payment by Razorpay payment ID
  const payment = await Payment.findOne({ razorpayPaymentId });
  if (!payment) {
    console.error(`Payment not found for Razorpay payment ID: ${razorpayPaymentId}`);
    return;
  }

  // Find the order
  const order = await Order.findById(payment.order);
  if (!order) {
    console.error(`Order not found for payment: ${payment._id}`);
    return;
  }

  // Handle different refund events
  if (event === 'refund.created') {
    payment.refundId = razorpayRefundId;
    payment.refundStatus = 'initiated';
    payment.refundAmount = refundAmount;
    await payment.save();
  } else if (event === 'refund.processed') {
    payment.refundStatus = 'processed';
    payment.status = 'refunded';
    await payment.save();

    // Update order payment status
    if (refundAmount >= order.totalAmount) {
      order.paymentStatus = 'refunded';
      order.status = 'returned';
    } else {
      order.paymentStatus = 'partially_refunded';
    }
    await order.save();
  } else if (event === 'refund.failed') {
    payment.refundStatus = 'failed';
    payment.errorDetails = {
      ...payment.errorDetails,
      refundError: refundEntity.error
    };
    await payment.save();
  }
} 