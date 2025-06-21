const User = require('../models/User');
const Earning = require('../models/Earning');

// Commission rates for each level
const COMMISSION_RATES = [0.10, 0.05, 0.03, 0.02, 0.01]; // 10%, 5%, 3%, 2%, 1%

/**
 * Distribute MLM commissions up to 5 levels for each product in the order
 * @param {Object} order - The order document (populated with user and items)
 */
async function distributeMLMCommission(order) {
  // Get the purchasing user
  let currentUser = await User.findById(order.user);
  if (!currentUser) return;

  // For each product in the order
  for (const item of order.items) {
    let uplineReferralCode = currentUser.referredBy;
    let level = 0;
    while (uplineReferralCode && level < COMMISSION_RATES.length) {
      // Find the upline user by referralCode
      const uplineUser = await User.findOne({ referralCode: uplineReferralCode });
      if (!uplineUser) break;

      // Calculate commission for this level
      const commission = item.productPrice * item.quantity * COMMISSION_RATES[level];
      if (commission > 0) {
        // Create an earning record for the upline
        await Earning.create({
          user: uplineUser._id,
          amount: commission,
          type: 'level',
          description: `Level ${level + 1} commission from order ${order._id} (product: ${item.productName})`,
          status: 'pending',
        });
      }

      // Move up the chain
      uplineReferralCode = uplineUser.referredBy;
      level++;
    }
  }
}

module.exports = { distributeMLMCommission }; 