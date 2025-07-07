const asyncHandler = require('../middleware/asyncHandler');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const User = require('../models/User');
const Earning = require('../models/Earning');
const ErrorResponse = require('../utils/errorResponse');
const { formatCurrency } = require('../utils/currency');

// @desc    Create a new withdrawal request
// @route   POST /api/withdrawals/request
// @access  Private
exports.createWithdrawalRequest = asyncHandler(async (req, res, next) => {
  const { amount, paymentMethod, paymentDetails } = req.body;
  const userId = req.user._id;

  if (!amount || !paymentMethod || !paymentDetails) {
    return next(new ErrorResponse('Please provide amount, payment method, and details', 400));
  }

  const user = await User.findById(userId);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Calculate total earnings
  const earnings = await Earning.find({ user: userId });
  const totalEarnings = earnings.reduce((acc, earning) => acc + earning.amount, 0);

  // Check if balance is sufficient
  if (totalEarnings < amount) {
    return next(new ErrorResponse('Insufficient balance', 400));
  }

  const request = await WithdrawalRequest.create({
    user: userId,
    amount,
    paymentMethod,
    paymentDetails,
    status: 'pending',
  });

  res.status(201).json({ success: true, data: request });
});

// @desc    Get current user's withdrawal requests
// @route   GET /api/withdrawals/my-requests
// @access  Private
exports.getMyWithdrawalRequests = asyncHandler(async (req, res, next) => {
  const requests = await WithdrawalRequest.find({ user: req.user._id }).sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: requests.length, data: requests });
});

// @desc    Get all withdrawal requests (Admin only)
// @route   GET /api/withdrawals
// @access  Private/Admin
exports.getAllWithdrawalRequests = asyncHandler(async (req, res, next) => {
  // Filtering and pagination can be added here
  const requests = await WithdrawalRequest.find().populate('user', 'name email').sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: requests.length, data: requests });
});

// @desc    Update withdrawal request status (Admin only)
// @route   PUT /api/withdrawals/:id
// @access  Private/Admin
exports.updateWithdrawalRequestStatus = asyncHandler(async (req, res, next) => {
  const { status, adminNotes } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return next(new ErrorResponse('Invalid status', 400));
  }

  const request = await WithdrawalRequest.findById(req.params.id);

  if (!request) {
    return next(new ErrorResponse(`Request not found with id of ${req.params.id}`, 404));
  }

  if (request.status !== 'pending') {
    return next(new ErrorResponse('This request has already been processed', 400));
  }
  
  const user = await User.findById(request.user);

  if (!user) {
    return next(new ErrorResponse('User associated with this request not found', 404));
  }

  if (status === 'approved') {
    // Recalculate earnings at the moment of approval
    const earnings = await Earning.find({ user: request.user });
    const totalEarnings = earnings.reduce((acc, earning) => acc + earning.amount, 0);

    if (totalEarnings < request.amount) {
      // Not enough balance, maybe because of another transaction. Reject it.
      request.status = 'rejected';
      request.adminNotes = 'Insufficient balance at time of approval. Auto-rejected.';
    } else {
      // Mark all pending earnings as completed
      await Earning.updateMany(
        { user: request.user, status: 'pending' },
        { $set: { status: 'completed' } }
      );
      // Create a negative earning to represent the withdrawal
      await Earning.create({
        user: request.user,
        amount: -request.amount,
        type: 'withdrawal',
        description: `Withdrawal of ${formatCurrency(request.amount)}`,
        status: 'completed',
        date: new Date(),
      });
      request.status = 'approved';
    }
  } else { // status is 'rejected'
    request.status = 'rejected';
  }

  request.processedAt = new Date();
  request.adminNotes = adminNotes || request.adminNotes;
  
  await request.save();

  res.status(200).json({ success: true, data: request });
}); 