const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // Import crypto for token generation
const { sendEmailNotification } = require('../utils/emailService'); // Import the new email function
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, phone, referredBy } = req.body;

  let uplineId = null;
  let referralChain = [];
  let referrer = null;

  if (typeof referredBy === 'string' && referredBy.trim() !== "") {
    referrer = await User.findOne({ referralCode: referredBy });
  }

  if (referrer) {
    uplineId = referrer._id;
    referralChain = [referrer._id.toString(), ...(referrer.referralChain || [])];
  } else {
    // Always fallback to admin if no valid referrer
    const adminUser = await User.findOne({ role: 'admin' });
    if (adminUser) {
      uplineId = adminUser._id;
      referralChain = [adminUser._id.toString(), ...(adminUser.referralChain || [])];
    }
  }
  console.log('Registering user:', { name, email, referredBy });
  console.log('Referrer:', referrer ? referrer._id : null);
  const adminUser = await User.findOne({ role: 'admin' });
  console.log('Admin user used for fallback:', adminUser ? adminUser._id : null);
  console.log('Final uplineId:', uplineId);

  const user = await User.create({
    name,
    email,
    password,
    phone,
    referredBy,
    uplineId,
    referralChain
  });
  console.log('User created:', user);

  // Generate JWT token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    token,
  });
});

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and password', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  res.status(200).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    token: jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    }),
  });
});

// @desc    Get current logged in user
// @route   GET /api/users/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  const userObject = user.toObject();

  if (user.referredBy) {
    const referrer = await User.findOne({ referralCode: user.referredBy }).select('name');
    if (referrer) {
      userObject.referrerName = referrer.name;
    }
  }

  res.status(200).json({
    success: true,
    data: userObject,
  });
});

// @desc    Request Password Reset
// @route   POST /api/users/request-password-reset
// @access  Public
exports.requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    // Send a success message even if user is not found to prevent email enumeration
    return res.json({ message: 'If a user with that email exists, a password reset link has been sent.' });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Set token and expiration on user document
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  await user.save({ validateBeforeSave: false }); // Save without re-validating other fields

  // Create reset URL
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  // Send password reset email
  await sendEmailNotification(user.email, 'passwordReset', {
    userName: user.name || user.email, // Use name if available, otherwise email
    resetLink: resetUrl,
  });

  res.json({ message: 'Password reset email sent' });
});

// @desc    Reset Password
// @route   PUT /api/users/reset-password/:token
// @access  Public
exports.resetPassword = asyncHandler(async (req, res) => {
  const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    throw new ErrorResponse('Invalid or expired reset token', 400);
  }

  // Set new password
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(req.body.password, salt);

  // Clear reset token fields
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  // Optionally send a password changed confirmation email
  // await sendEmailNotification(user.email, 'passwordChangedConfirmation', { userName: user.name });

  // Generate new JWT
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    token,
  });
});

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
exports.getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  
  if (!user) {
    throw new ErrorResponse('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update user profile
// @route   PUT /api/users/me
// @access  Private
exports.updateUserProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;

  // Find user and update
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, phone },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw new ErrorResponse('User not found', 404);
  }

  res.json(user);
});

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = asyncHandler(async (req, res) => {
  // Only allow admin
  if (!req.user || req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized as admin', 403);
  }

  // Get all users
  const users = await User.find({}, '-password -resetPasswordToken -resetPasswordExpire');

  // For each user, find their referrer by referral code
  const populatedUsers = await Promise.all(users.map(async (user) => {
    if (user.referredBy) {
      const referrer = await User.findOne({ referralCode: user.referredBy }, 'name email referralCode');
      if (referrer) {
        user = user.toObject();
        user.referredBy = {
          name: referrer.name,
          email: referrer.email,
          referralCode: referrer.referralCode
        };
      }
    }
    return user;
  }));

  res.json(populatedUsers);
});

// @desc    Get user by ID (admin only)
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUserById = asyncHandler(async (req, res) => {
  // Only allow admin
  if (!req.user || req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized as admin', 403);
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ErrorResponse('User not found', 404);
  }

  res.json(user);
});

// @desc    Update any user (admin only)
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUserById = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized as admin', 403);
  }
  const { name, phone, role } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ErrorResponse('User not found', 404);
  }
  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (role) user.role = role;
  await user.save();
  res.json({ success: true, user });
});

exports.getUsers = async (req, res) => {
  const { email } = req.query;
  try {
    const query = email ? { email: { $regex: email, $options: 'i' } } : {};
    const users = await User.find(query);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get users' });
  }
};

// @desc    Get all clients for admin management
// @route   GET /api/users/admin/clients
// @access  Private/Admin
exports.getAdminClients = asyncHandler(async (req, res, next) => {
    const users = await User.find({
        role: { $in: ['user', 'distributor', 'franchise_owner'] }
    })
    .populate('franchiseId', 'name district')
    .populate('uplineId', 'name email')
    .sort({ createdAt: -1 });

    // Calculate additional stats for each user
    const usersWithStats = await Promise.all(users.map(async (user) => {
        const userObj = user.toObject();
        
        // Get order statistics
        const Order = require('../models/Order');
        const orders = await Order.find({ user: user._id });
        const totalOrders = orders.length;
        const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        
        return {
            ...userObj,
            totalOrders,
            totalSpent,
            status: user.status || 'active' // Default to active if not set
        };
    }));
    
    res.status(200).json({
        success: true,
        count: usersWithStats.length,
        data: usersWithStats
    });
});

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

exports.updateProfile = async (req, res, next) => {
  const { name, email, phone } = req.body;
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;

    await user.save();

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return next(new ErrorResponse('There is no user with that email', 404));
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${req.protocol}://${req.get(
      'host'
    )}/api/auth/resetpassword/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

    try {
      // await sendEmail({
      //   email: user.email,
      //   subject: 'Password reset token',
      //   message,
      // });

      res.status(200).json({ success: true, data: 'Email sent' });
    } catch (err) {
      console.log(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return next(new ErrorResponse('Email could not be sent', 500));
    }
  } catch (err) {
    next(err);
  }
};

// @desc      Reset password
// @route     PUT /api/auth/resetpassword/:resettoken
// @access    Public
exports.resetPassword = async (req, res, next) => {
  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  try {
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(new ErrorResponse('Invalid token', 400));
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res) => {
  try {
    // Find the user to be deleted
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Reassign downline: set uplineId of all direct downline users to this user's uplineId
    await User.updateMany(
      { uplineId: user._id },
      { $set: { uplineId: user.uplineId } }
    );

    // Now delete the user
    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'User removed and downline reassigned.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
};

// @desc    Bulk delete users (admin only)
// @route   DELETE /api/users
// @access  Private/Admin
exports.bulkDeleteUsers = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized as admin', 403);
  }

  const { userIds } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw new ErrorResponse('User IDs are required', 400);
  }

  const result = await User.deleteMany({ _id: { $in: userIds } });

  if (result.deletedCount === 0) {
    throw new ErrorResponse('No users found for deletion', 404);
  }

  res.json({ message: `${result.deletedCount} users deleted successfully.` });
}); 

// @desc    Search users by name or email
// @route   GET /api/users/search?search=term
// @access  Private (franchise, admin, etc.)
exports.searchUsers = asyncHandler(async (req, res) => {
  const { search } = req.query;
  if (!search || typeof search !== 'string' || !search.trim()) {
    return res.json([]);
  }
  const regex = new RegExp(search, 'i');
  const users = await User.find({
    $or: [
      { name: { $regex: regex } },
      { email: { $regex: regex } }
    ]
  }).select('-password -resetPasswordToken -resetPasswordExpire');
  res.json(users);
}); 