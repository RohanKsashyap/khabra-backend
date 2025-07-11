const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, referredBy } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

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
      console.log('Admin user used for fallback:', adminUser ? adminUser._id : null);
      if (adminUser) {
        uplineId = adminUser._id;
        referralChain = [adminUser._id.toString(), ...(adminUser.referralChain || [])];
      }
    }
    console.log('Registering user:', { name, email, referredBy });
    console.log('Referrer:', referrer ? referrer._id : null);
    console.log('Final uplineId:', uplineId);

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      referredBy,
      uplineId,
      referralChain,
    });
    console.log('User created:', user);

    // If user was referred, update referrer's network
    if (referredBy) {
      const referrer = await User.findOne({ referralCode: referredBy });
      if (referrer) {
        referrer.network.level1.push(user._id);
        await referrer.save();
      }
    }

    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
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
      token: generateToken(user._id),
      user: userObject,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
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
      user: userObject,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'There is no user with that email',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save();

    // TODO: Send email with reset token

    res.status(200).json({
      success: true,
      message: 'Password reset email sent',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}; 