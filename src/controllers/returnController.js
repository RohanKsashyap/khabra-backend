const ReturnRequest = require('../models/ReturnRequest');
const Order = require('../models/Order');
const Product = require('../models/Product');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Request a product return
// @route   POST /api/returns/request
// @access  Private
exports.createReturnRequest = asyncHandler(async (req, res) => {
  const { orderId, productId, reason } = req.body;

  // Basic validation
  if (!orderId || !productId || !reason) {
    res.status(400);
    throw new Error('Please provide orderId, productId, and reason for return');
  }

  // Check if the order and product belong to the user and is delivered
  const order = await Order.findOne({
    _id: orderId,
    user: req.user._id,
    status: 'delivered',
  });

  if (!order) {
    res.status(404);
    throw new Error('Order not found or not delivered for this user');
  }

  const productInOrder = order.items.find(item => item.product.toString() === productId);

  if (!productInOrder) {
    res.status(404);
    throw new Error('Product not found in the specified order');
  }

  // Check if a return request for this product in this order already exists
  const existingReturn = await ReturnRequest.findOne({
    order: orderId,
    product: productId,
    user: req.user._id,
    status: { $in: ['pending', 'approved'] },
  });

  if (existingReturn) {
    res.status(400);
    throw new Error('A return request for this product in this order is already pending or approved.');
  }

  const returnRequest = await ReturnRequest.create({
    user: req.user._id,
    order: orderId,
    product: productId,
    reason,
  });

  // Update the specific item in the order with return status and request reference
  const itemToUpdate = order.items.find(item => item.product.toString() === productId);
  if (itemToUpdate) {
    itemToUpdate.returnStatus = 'pending';
    itemToUpdate.returnRequest = returnRequest._id;
    await order.save(); // Save the updated order
  }

  res.status(201).json({ message: 'Return request submitted successfully', returnRequest });
});

// @desc    Get all return requests (Admin only)
// @route   GET /api/returns
// @access  Private/Admin
exports.getAllReturnRequests = asyncHandler(async (req, res) => {
  const returnRequests = await ReturnRequest.find({}).populate('user', 'name email').populate('order', 'totalAmount status').populate('product', 'name price');
  res.json(returnRequests);
});

// @desc    Update return request status (Admin only)
// @route   PUT /api/returns/:id
// @access  Private/Admin
exports.updateReturnRequestStatus = asyncHandler(async (req, res) => {
  const { status, adminNotes } = req.body;

  const returnRequest = await ReturnRequest.findById(req.params.id);

  if (!returnRequest) {
    res.status(404);
    throw new Error('Return request not found');
  }

  returnRequest.status = status || returnRequest.status;
  returnRequest.adminNotes = adminNotes || returnRequest.adminNotes;
  if (status === 'approved' || status === 'rejected' || status === 'completed') {
    returnRequest.resolutionDate = new Date();
  }

  const updatedReturnRequest = await returnRequest.save();

  res.json({ message: 'Return request updated', updatedReturnRequest });
}); 