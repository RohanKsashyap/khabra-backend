const Razorpay = require('razorpay');
require('dotenv').config();

const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

console.log('Razorpay Configuration:');
console.log('RAZORPAY_KEY_ID:', razorpayKeyId);
console.log('RAZORPAY_KEY_ID (from process.env):', process.env.RAZORPAY_KEY_ID);
console.log('RAZORPAY_KEY_SECRET:', razorpayKeySecret ? 'LOADED' : 'MISSING');
console.log('RAZORPAY_WEBHOOK_SECRET:', webhookSecret ? 'LOADED' : 'MISSING');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret
});

module.exports = {
  razorpay,
  razorpayKeyId,
  razorpayKeySecret,
  webhookSecret
}; 