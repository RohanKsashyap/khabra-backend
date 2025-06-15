const Address = require('../models/Address');
const { validateAddress } = require('../utils/validators');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Get all addresses for a user
exports.getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user._id });
    res.json(addresses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching addresses', error: error.message });
  }
};

// Add a new address
exports.addAddress = async (req, res) => {
  try {
    const { error } = validateAddress(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const address = new Address({
      ...req.body,
      user: req.user._id
    });

    // If this is the first address, make it default
    const addressCount = await Address.countDocuments({ user: req.user._id });
    if (addressCount === 0) {
      address.isDefault = true;
    }

    await address.save();
    res.status(201).json(address);
  } catch (error) {
    res.status(500).json({ message: 'Error adding address', error: error.message });
  }
};

// @desc    Get user's default address
// @route   GET /api/addresses/default
// @access  Private
exports.getDefaultAddress = asyncHandler(async (req, res, next) => {
  const address = await Address.findOne({ 
    user: req.user._id,
    isDefault: true 
  });

  if (!address) {
    return next(new ErrorResponse('No default address found', 404));
  }

  res.status(200).json({
    success: true,
    data: address
  });
});

// @desc    Update address
// @route   PUT /api/addresses/:id
// @access  Private
exports.updateAddress = asyncHandler(async (req, res, next) => {
  const { fullName, addressLine1, addressLine2, city, state, postalCode, country, phone } = req.body;

  // Find address and ensure it belongs to user
  let address = await Address.findOne({
    _id: req.params.id,
    user: req.user.id
  });

  if (!address) {
    return next(new ErrorResponse('Address not found', 404));
  }

  // Build update object
  const updateFields = {};
  if (fullName) updateFields.fullName = fullName;
  if (addressLine1) updateFields.addressLine1 = addressLine1;
  if (addressLine2) updateFields.addressLine2 = addressLine2;
  if (city) updateFields.city = city;
  if (state) updateFields.state = state;
  if (postalCode) updateFields.postalCode = postalCode;
  if (country) updateFields.country = country;
  if (phone) updateFields.phone = phone;

  address = await Address.findByIdAndUpdate(
    req.params.id,
    updateFields,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    data: address
  });
});

// Delete an address
exports.deleteAddress = async (req, res) => {
  try {
    const address = await Address.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // If the deleted address was default, make another address default
    if (address.isDefault) {
      const nextAddress = await Address.findOne({ user: req.user._id });
      if (nextAddress) {
        nextAddress.isDefault = true;
        await nextAddress.save();
      }
    }

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting address', error: error.message });
  }
};

// Set an address as default
exports.setDefaultAddress = async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // Update all addresses to not be default
    await Address.updateMany(
      { user: req.user._id },
      { isDefault: false }
    );

    // Set the selected address as default
    address.isDefault = true;
    await address.save();

    res.json(address);
  } catch (error) {
    res.status(500).json({ message: 'Error setting default address', error: error.message });
  }
}; 