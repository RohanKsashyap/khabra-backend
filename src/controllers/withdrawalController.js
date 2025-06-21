const WithdrawalRequest = require('../models/WithdrawalRequest');
const Earning = require('../models/Earning');

// User requests a withdrawal
exports.requestWithdrawal = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    // Calculate available (completed) earnings
    const completedEarnings = await Earning.aggregate([
      { $match: { user: userId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const available = completedEarnings[0]?.total || 0;
    // Calculate total pending/processing withdrawals
    const pendingWithdrawals = await WithdrawalRequest.aggregate([
      { $match: { user: userId, status: { $in: ['pending', 'approved'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const locked = pendingWithdrawals[0]?.total || 0;
    const withdrawable = available - locked;
    if (amount > withdrawable) {
      return res.status(400).json({ message: 'Requested amount exceeds available balance' });
    }
    // Create withdrawal request
    const request = await WithdrawalRequest.create({
      user: userId,
      amount,
      status: 'pending',
      requestedAt: new Date()
    });
    res.status(201).json({ message: 'Withdrawal request submitted', request });
  } catch (error) {
    res.status(500).json({ message: 'Error requesting withdrawal', error: error.message });
  }
};

// User views their withdrawal history
exports.getMyWithdrawals = async (req, res) => {
  try {
    const requests = await WithdrawalRequest.find({ user: req.user._id }).sort({ requestedAt: -1 });
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching withdrawal history', error: error.message });
  }
};

// Admin: view all withdrawal requests
exports.getAllWithdrawals = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  try {
    const { user, status, startDate, endDate } = req.query;
    const filter = {};
    if (user) filter.user = user;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.requestedAt = {};
      if (startDate) filter.requestedAt.$gte = new Date(startDate);
      if (endDate) filter.requestedAt.$lte = new Date(endDate);
    }
    const requests = await WithdrawalRequest.find(filter)
      .populate('user', 'name email')
      .sort({ requestedAt: -1 });
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching withdrawal requests', error: error.message });
  }
};

// Admin: approve/reject a withdrawal request
exports.updateWithdrawalStatus = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  try {
    const { status, adminNotes } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const request = await WithdrawalRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request already processed' });
    }
    request.status = status;
    request.processedAt = new Date();
    if (adminNotes) request.adminNotes = adminNotes;
    await request.save();
    res.json({ message: `Withdrawal request ${status}`, request });
  } catch (error) {
    res.status(500).json({ message: 'Error updating withdrawal status', error: error.message });
  }
}; 