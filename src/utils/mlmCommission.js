const User = require('../models/User');
const Earning = require('../models/Earning');
const Rank = require('../models/Rank');
const Franchise = require('../models/Franchise');

/**
 * MLM Commission percentages for each level
 */
const MLM_COMMISSION_LEVELS = [
  { level: 1, percentage: 0.015 }, // 1.5%
  { level: 2, percentage: 0.01 },  // 1.0%
  { level: 3, percentage: 0.005 }, // 0.5%
  { level: 4, percentage: 0.005 }, // 0.5%
  { level: 5, percentage: 0.005 }  // 0.5%
];

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
 * Check if commission has already been distributed for this order
 * @param {string} orderId - The order ID
 * @returns {boolean} - True if commission already distributed
 */
async function isCommissionAlreadyDistributed(orderId) {
  const existingEarnings = await Earning.find({
    orderId: orderId,
    type: 'mlm_level'
  });
  return existingEarnings.length > 0;
}

/**
 * Calculate and distribute MLM commissions up to 5 levels using the uplineId chain
 * @param {Object} order - The order document
 */
async function distributeMLMCommission(order) {
  console.log('--- MLM COMMISSION DEBUG ---');
  console.log('distributeMLMCommission called for order:', order && order._id);
  
  if (!order) {
    console.log('No order object provided');
    return;
  }

  // Check if commission has already been distributed for this order
  if (await isCommissionAlreadyDistributed(order._id)) {
    console.log('Commission already distributed for order:', order._id);
    return;
  }

  // Get the purchasing user
  let currentUser = await User.findById(order.user);
  if (!currentUser) {
    console.log('No purchasing user found for order', order._id);
    return;
  }
  
  console.log('Purchasing user:', currentUser.email, 'User ID:', currentUser._id);

  // Initialize commission tracking array if not exists
  if (!order.commissions) {
    order.commissions = {};
  }
  if (!order.commissions.mlm) {
    order.commissions.mlm = [];
  }

  // For each product in the order
  for (const item of order.items) {
    // Use referralChain if uplineId is null or undefined
    let uplines = [];
    if (currentUser.uplineId) {
      // Old logic: walk up uplineId chain
      let uplineUser = await User.findById(currentUser.uplineId);
      while (uplineUser && uplines.length < MLM_COMMISSION_LEVELS.length) {
        uplines.push(uplineUser);
        uplineUser = await User.findById(uplineUser.uplineId);
      }
    } else if (Array.isArray(currentUser.referralChain) && currentUser.referralChain.length > 0) {
      // New logic: use referralChain
      for (let i = 0; i < MLM_COMMISSION_LEVELS.length && i < currentUser.referralChain.length; i++) {
        const uplineUser = await User.findById(currentUser.referralChain[i]);
        if (uplineUser) {
          uplines.push(uplineUser);
        }
      }
    }

    let level = 1;
    let totalCommissionDistributed = 0;

    for (const uplineUser of uplines) {
      // Skip admin users from receiving commission
      if (uplineUser.role === 'admin') {
        console.log('Skipping commission for admin user:', uplineUser.email);
        level++;
        continue;
      }

      const commissionConfig = MLM_COMMISSION_LEVELS[level - 1];
      const commission = item.productPrice * item.quantity * commissionConfig.percentage;
      
      console.log(`Level ${level}: Upline ${uplineUser.email}, Commission %: ${commissionConfig.percentage * 100}%, Commission: ${commission}`);
      
      if (commission > 0) {
        try {
          // Create earning record
          const earning = await Earning.create({
            user: uplineUser._id,
            amount: commission,
            type: 'mlm_level',
            level: level,
            description: `Level ${level} MLM commission from order ${order._id} by ${currentUser.name} (${currentUser.email}) (product: ${item.productName})`,
            status: 'pending',
            orderId: order._id
          });

          // Update order commissions tracking
          order.commissions.mlm.push({
            userId: uplineUser._id,
            level: level,
            amount: commission,
            status: 'pending',
            earningId: earning._id
          });

          totalCommissionDistributed += commission;
          console.log('Earning created for', uplineUser.email, 'amount:', commission);
        } catch (err) {
          console.log('Error creating earning for', uplineUser.email, err);
        }
      } else {
        console.log('No commission created for', uplineUser.email, '(commission is 0)');
      }
      level++;
    }

    console.log(`Total commission distributed for item ${item.productName}: ${totalCommissionDistributed}`);
  }

  console.log('--- END MLM COMMISSION DEBUG ---');
}

/**
 * Calculate and distribute franchise commission
 * @param {Object} order - The order document
 */
async function distributeFranchiseCommission(order) {
  console.log('--- FRANCHISE COMMISSION DEBUG ---');
  
  if (!order.franchise) {
    console.log('No franchise associated with order');
    return;
  }

  // Check if franchise commission has already been distributed
  const existingFranchiseEarnings = await Earning.find({
    orderId: order._id,
    type: 'franchise'
  });
  
  if (existingFranchiseEarnings.length > 0) {
    console.log('Franchise commission already distributed for order:', order._id);
    return;
  }

  try {
    const franchise = await Franchise.findById(order.franchise);
    if (!franchise) {
      console.log('Franchise not found:', order.franchise);
      return;
    }

    const franchiseCommission = (order.totalAmount * franchise.commissionPercentage) / 100;
    
    console.log(`Franchise commission: ${franchiseCommission} (${franchise.commissionPercentage}% of ${order.totalAmount})`);

    if (franchiseCommission > 0) {
      // Create earning record for franchise owner
      const earning = await Earning.create({
        user: franchise.ownerId,
        amount: franchiseCommission,
        type: 'franchise',
        description: `Franchise commission from order ${order._id} (${franchise.commissionPercentage}% of ${order.totalAmount})`,
        status: 'pending',
        orderId: order._id,
        franchiseId: franchise._id
      });

      // Update order commission tracking
      order.commissions.franchise = {
        franchiseId: franchise._id,
        amount: franchiseCommission,
        percentage: franchise.commissionPercentage,
        status: 'pending',
        earningId: earning._id
      };

      // Update franchise statistics
      await Franchise.findByIdAndUpdate(franchise._id, {
        $inc: {
          'totalCommission': franchiseCommission,
          'totalSales.total': order.totalAmount,
          [`totalSales.${order.orderType}`]: order.totalAmount
        }
      });

      console.log('Franchise commission created for franchise owner:', franchise.ownerId);
    }

  } catch (error) {
    console.log('Error calculating franchise commission:', error);
  }

  console.log('--- END FRANCHISE COMMISSION DEBUG ---');
}

/**
 * Calculate and distribute all commissions (MLM + Franchise)
 * @param {Object} order - The order document
 */
async function distributeAllCommissions(order) {
  try {
    console.log('Starting commission distribution for order:', order._id);
    
    // Distribute MLM commissions
    await distributeMLMCommission(order);
    
    // Distribute franchise commission
    await distributeFranchiseCommission(order);
    
    // Save the order with commission tracking
    await order.save();
    
    console.log('All commissions distributed successfully for order:', order._id);
  } catch (error) {
    console.log('Error distributing commissions:', error);
    throw error; // Re-throw to handle in calling function
  }
}

/**
 * Update user's downline count
 * @param {String} uplineId - The upline user ID
 */
async function updateDownlineCount(uplineId) {
  try {
    const downlineCount = await User.countDocuments({ uplineId: uplineId });
    
    await User.findByIdAndUpdate(uplineId, {
      'franchiseOwner.totalDownline': downlineCount
    });

    // If upline is a franchise owner, update franchise downline count
    const uplineUser = await User.findById(uplineId);
    if (uplineUser && uplineUser.role === 'franchise_owner' && uplineUser.franchiseId) {
      await Franchise.findByIdAndUpdate(uplineUser.franchiseId, {
        totalDownline: downlineCount
      });
    }

    console.log(`Updated downline count for user ${uplineId}: ${downlineCount}`);
  } catch (error) {
    console.log('Error updating downline count:', error);
  }
}

module.exports = {
  distributeMLMCommission,
  distributeFranchiseCommission,
  distributeAllCommissions,
  updateDownlineCount,
  MLM_COMMISSION_LEVELS
}; 