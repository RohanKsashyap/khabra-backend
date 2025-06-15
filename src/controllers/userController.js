const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // Import crypto for token generation
const { validateRegister, validateLogin } = require('../utils/validators');
const { sendEmailNotification } = require('../utils/emailService'); // Import the new email function
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Register new user
// @route   POST /api/users
// @access  Public
exports.registerUser = asyncHandler(async (req, res) => {
  const { error } = validateRegister(req.body);
  if (error) {
    throw new ErrorResponse(error.details[0].message, 400);
  }

  const { name, email, phone, password, referralCode } = req.body;

  // Check if user already exists
  let user = await User.findOne({ email });

  if (user) {
    throw new ErrorResponse('User already exists', 400);
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Handle referral
  let referredBy = null;
  if (referralCode) {
    const referrer = await User.findOne({ referralCode });
    if (referrer) {
      referredBy = referrer._id;
      // TODO: Implement referral bonus/logic here
    } else {
      // Optionally send a warning/error that referral code is invalid
      console.warn(`Invalid referral code used: ${referralCode}`);
    }
  }

  // Create user
  user = new User({
    name,
    email,
    phone,
    password: hashedPassword,
    referredBy
  });

  await user.save();

  // Generate JWT
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });

  // Send welcome email
  await sendEmailNotification(user.email, 'welcome', {
    userName: user.name,
    userEmail: user.email,
    loginUrl: `${process.env.FRONTEND_URL}/login` // Assuming frontend login page route
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

// @desc    Authenticate user & get token
// @route   POST /api/users/login
// @access  Public
exports.loginUser = asyncHandler(async (req, res) => {
  const { error } = validateLogin(req.body);
  if (error) {
    throw new ErrorResponse(error.details[0].message, 400);
  }

  const { email, password } = req.body;

  // Check for user
  const user = await User.findOne({ email });

  if (!user) {
    throw new ErrorResponse('Invalid credentials', 400);
  }

  // Check password
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new ErrorResponse('Invalid credentials', 400);
  }

  // Generate JWT
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

// @desc    Get current user
// @route   GET /api/users/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');

  if (!user) {
    throw new ErrorResponse('User not found', 404);
  }

  res.json(user);
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