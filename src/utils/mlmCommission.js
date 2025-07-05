const User = require('../models/User');
const Earning = require('../models/Earning');
const Rank = require('../models/Rank');

/**
 * Get the commission percent for a user based on their direct referrals.
 * @param {number} directReferrals
 * @returns {number} commission percent (as a decimal, e.g. 0.07 for 7%)
 */
async function getCommissionPercent(directReferrals) {
  // Find the highest rank the user qualifies for (<= directReferrals)
  const rank = await Rank.findOne({ 'requirements.directReferrals': { $lte: directReferrals } })
    .sort({ 'requirements.directReferrals': -1 });
  if (rank && rank.rewards && typeof rank.rewards.commission === 'number') {
    return rank.rewards.commission / 100; // convert percent to decimal
  }
  return 0;
}

/**
 * Distribute MLM commissions up to 5 levels using the referralChain array
 * @param {Object} order - The order document (populated with user and items)
 */
async function distributeMLMCommission(order) {
  // Commission percentages for each level
  const COMMISSION_LEVELS = [0.015, 0.01, 0.007, 0.005, 0.003];

  // Debug: Log function call and order info
  console.log('--- MLM COMMISSION DEBUG ---');
  console.log('distributeMLMCommission called for order:', order && order._id);
  if (!order) {
    console.log('No order object provided');
    return;
  }

  // Get the purchasing user
  let currentUser = await User.findById(order.user);
  if (!currentUser) {
    console.log('No purchasing user found for order', order._id);
    return;
  }
  console.log('Purchasing user:', currentUser.email, 'User ID:', currentUser._id);

  // Debug: Log order items
  console.log('Order items:', order.items);

  // For each product in the order
  for (const item of order.items) {
    // Use referralChain from the purchasing user
    const chain = currentUser.referralChain || [];
    console.log('Referral chain for user:', chain);
    for (let level = 0; level < Math.min(chain.length, 5); level++) {
      const uplineIdOrCode = chain[level];
      // Try to find the upline user by _id or referralCode
      let uplineUser = await User.findById(uplineIdOrCode);
      if (!uplineUser) {
        uplineUser = await User.findOne({ referralCode: uplineIdOrCode });
      }
      if (!uplineUser) {
        console.log('No upline user found for chain entry', uplineIdOrCode);
        continue;
      }
      // Skip admin users from receiving commission
      if (uplineUser.role === 'admin') {
        console.log('Skipping commission for admin user:', uplineUser.email);
        continue;
      }
      const commissionPercent = COMMISSION_LEVELS[level];
      const commission = item.productPrice * item.quantity * commissionPercent;
      console.log(`Level ${level + 1}: Upline ${uplineUser.email}, Commission %: ${commissionPercent * 100}%, Commission: ${commission}`);
      if (commission > 0) {
        try {
          await Earning.create({
            user: uplineUser._id,
            amount: commission,
            type: 'level',
            description: `Level ${level + 1} commission from order ${order._id} by ${currentUser.name} (${currentUser.email}) (product: ${item.productName})`,
            status: 'pending',
          });
          console.log('Earning created for', uplineUser.email, 'amount:', commission);
        } catch (err) {
          console.log('Error creating earning for', uplineUser.email, err);
        }
      } else {
        console.log('No commission created for', uplineUser.email, '(commission is 0)');
      }
    }
  }
  console.log('--- END MLM COMMISSION DEBUG ---');
}

module.exports = { distributeMLMCommission }; 