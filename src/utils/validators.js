const Joi = require('joi');

exports.validateAddress = (data) => {
  const schema = Joi.object({
    label: Joi.string().trim(),
    fullName: Joi.string().required().trim(),
    phone: Joi.string().required().trim(),
    addressLine1: Joi.string().required().trim(),
    addressLine2: Joi.string().trim().allow(''),
    city: Joi.string().required().trim(),
    state: Joi.string().required().trim(),
    postalCode: Joi.string().required().trim(),
    country: Joi.string().required().trim(),
    isDefault: Joi.boolean()
  });

  return schema.validate(data);
};

exports.validateReview = (data) => {
  const schema = Joi.object({
    productId: Joi.string(),
    orderId: Joi.string(),
    rating: Joi.number().min(1).max(5).required(),
    review: Joi.string().required().min(10).max(1000),
    images: Joi.array().items(Joi.string().uri()).max(5),
    status: Joi.string().valid('pending', 'approved', 'rejected')
  });

  return schema.validate(data);
};

// Email validation regex pattern
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates an email address format
 * @param {string} email - The email address to validate
 * @returns {boolean} - True if email is valid, false otherwise
 */
exports.validateEmail = (email) => {
  if (!email) return false;
  return emailRegex.test(email);
}; 