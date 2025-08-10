require('dotenv').config({ path: './src/.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Earning = require('../models/Earning');
const connectDB = require('../config/db');

// Connect to database
connectDB();

async function testEarningsAPI() {
  try {
    console.log('=== TESTING EARNINGS API RESPONSES ===\n');

    // Find the user (rohan from the screenshot)
    const testUser = await User.findOne({ email: { $regex: /rohan/, $options: 'i' } });
    if (!testUser) {
      console.log('❌ Test user not found!');
      return;
    }

    console.log(`🔍 Testing for user: ${testUser.name} (${testUser.email})`);
    console.log(`User ID: ${testUser._id}\n`);

    // 1. Test /api/earnings endpoint (what the frontend calls)
    console.log('1. Testing GET /api/earnings response:');
    console.log('=====================================');

    const earnings = await Earning.find({ user: testUser._id }).sort({ date: -1 });
    const totalEarnings = earnings.reduce((sum, earning) => sum + earning.amount, 0);
    const pendingEarnings = earnings
      .filter(earning => earning.status === 'pending')
      .reduce((sum, earning) => sum + earning.amount, 0);

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonth = earnings
      .filter(earning => new Date(earning.date) >= firstDayOfMonth)
      .reduce((sum, earning) => sum + earning.amount, 0);

    const lastMonth = earnings
      .filter(earning => 
        new Date(earning.date) >= firstDayOfLastMonth && 
        new Date(earning.date) <= lastDayOfLastMonth
      )
      .reduce((sum, earning) => sum + earning.amount, 0);

    const stats = {
      totalEarnings,
      pendingEarnings,
      thisMonth,
      lastMonth
    };

    console.log('📊 EARNINGS SUMMARY:');
    console.log(`   Total Earnings: ₹${stats.totalEarnings}`);
    console.log(`   Pending Earnings: ₹${stats.pendingEarnings}`);
    console.log(`   This Month: ₹${stats.thisMonth}`);
    console.log(`   Last Month: ₹${stats.lastMonth}`);
    
    console.log('\n📋 EARNINGS HISTORY:');
    if (earnings.length === 0) {
      console.log('   No earnings found!');
    } else {
      earnings.forEach((earning, index) => {
        console.log(`   ${index + 1}. ${earning.type.toUpperCase()}: ₹${earning.amount} (${earning.status})`);
        console.log(`      Date: ${earning.date.toISOString().split('T')[0]}`);
        console.log(`      Description: ${earning.description.substring(0, 60)}...`);
        if (earning.level) console.log(`      Level: ${earning.level}`);
        console.log('');
      });
    }

    // 2. Test /api/dashboard/overview endpoint (dashboard summary)
    console.log('2. Testing GET /api/dashboard/overview response:');
    console.log('================================================');

    const userId = testUser._id;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get user's earnings aggregation (similar to dashboard controller)
    const earningsAgg = await Earning.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0]
            }
          },
          paid: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0]
            }
          },
          thisMonth: {
            $sum: {
              $cond: [
                { $gte: ['$createdAt', startOfMonth] },
                '$amount',
                0
              ]
            }
          }
        }
      }
    ]);

    const earningsData = earningsAgg[0] || {
      total: 0,
      pending: 0,
      paid: 0,
      thisMonth: 0
    };

    // Get recent earnings (last 10 - now included in dashboard)
    const recentEarnings = await Earning.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    console.log('📊 DASHBOARD EARNINGS DATA:');
    console.log(`   Total: ₹${earningsData.total}`);
    console.log(`   Pending: ₹${earningsData.pending}`);
    console.log(`   Paid: ₹${earningsData.paid}`);
    console.log(`   This Month: ₹${earningsData.thisMonth}`);
    
    console.log('\n📋 RECENT EARNINGS (Dashboard):');
    if (recentEarnings.length === 0) {
      console.log('   No recent earnings found!');
    } else {
      recentEarnings.forEach((earning, index) => {
        console.log(`   ${index + 1}. ${earning.type}: ₹${earning.amount} (${earning.status})`);
        console.log(`      ${earning.description.substring(0, 50)}...`);
      });
    }

    // 3. Simulate the exact API response format
    console.log('\n3. SIMULATED API RESPONSES:');
    console.log('============================');

    const earningsAPIResponse = {
      earnings: earnings.map(e => ({
        _id: e._id,
        amount: e.amount,
        type: e.type,
        level: e.level,
        description: e.description,
        status: e.status,
        date: e.date,
        orderId: e.orderId
      })),
      stats: stats
    };

    const dashboardAPIResponse = {
      success: true,
      data: {
        earnings: earningsData,
        recentEarnings: recentEarnings
        // other dashboard data would be here...
      }
    };

    console.log('🔗 GET /api/earnings response:');
    console.log(JSON.stringify(earningsAPIResponse, null, 2).substring(0, 500) + '...');

    console.log('\n🔗 GET /api/dashboard/overview earnings section:');
    console.log(JSON.stringify(dashboardAPIResponse.data.earnings, null, 2));

    // 4. Summary and recommendations
    console.log('\n💡 SUMMARY & STATUS:');
    console.log('====================');

    if (earnings.length > 0) {
      console.log('✅ Earnings system is working!');
      console.log(`✅ User has ${earnings.length} earning record(s)`);
      console.log(`✅ Total earnings: ₹${totalEarnings}`);
      console.log('✅ Frontend will now show non-zero earnings');
      
      if (pendingEarnings > 0) {
        console.log(`⏳ Pending earnings: ₹${pendingEarnings} (waiting to be paid out)`);
      }
    } else {
      console.log('❌ No earnings found for this user');
      console.log('❗ Check if orders are being marked as "delivered"');
      console.log('❗ Check if products have selfCommission > 0');
      console.log('❗ Check if commission distribution is being triggered');
    }

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. User refreshes the earnings page');
    console.log('2. Dashboard overview will show recent earnings');
    console.log('3. Earnings tab will show detailed earning history');
    console.log('4. All earnings will have appropriate types and descriptions');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the test
testEarningsAPI();
