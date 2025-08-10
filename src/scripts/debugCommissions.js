require('dotenv').config({ path: './src/.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Earning = require('../models/Earning');
const { distributeAllCommissions } = require('../utils/mlmCommission');
const connectDB = require('../config/db');

// Connect to database
connectDB();

async function debugCommissions() {
  try {
    console.log('=== COMMISSION DEBUG ANALYSIS ===\n');

    // 1. Check if there are any users
    const totalUsers = await User.countDocuments();
    console.log(`📊 Total Users in system: ${totalUsers}`);
    
    if (totalUsers === 0) {
      console.log('❌ No users found! Commission system needs users to work.');
      return;
    }

    // 2. Check if there are any products with self-commission
    const productsWithSelfComm = await Product.find({ selfCommission: { $gt: 0 } });
    const totalProducts = await Product.countDocuments();
    
    console.log(`📦 Total Products: ${totalProducts}`);
    console.log(`💰 Products with Self-Commission: ${productsWithSelfComm.length}`);
    
    if (productsWithSelfComm.length > 0) {
      console.log('\n🎯 Products with Self-Commission:');
      productsWithSelfComm.forEach(product => {
        console.log(`   • ${product.name}: ${product.selfCommission}% (Price: ₹${product.price})`);
      });
    }

    // 3. Check for delivered orders
    const deliveredOrders = await Order.find({ status: 'delivered' })
      .populate('user', 'name email')
      .populate('items.product', 'name selfCommission')
      .sort({ createdAt: -1 })
      .limit(10);

    console.log(`\n📋 Delivered Orders: ${deliveredOrders.length}`);
    
    if (deliveredOrders.length === 0) {
      console.log('❌ No delivered orders found! Orders must be delivered to trigger commissions.');
      
      // Check for orders in other statuses
      const allOrders = await Order.find().select('status').lean();
      const ordersByStatus = allOrders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\n📊 Orders by Status:');
      Object.entries(ordersByStatus).forEach(([status, count]) => {
        console.log(`   • ${status}: ${count}`);
      });
      
      return;
    }

    // 4. Analyze delivered orders for commission potential
    console.log('\n🔍 Analyzing Delivered Orders:');
    for (let i = 0; i < Math.min(5, deliveredOrders.length); i++) {
      const order = deliveredOrders[i];
      console.log(`\n--- Order ${i + 1}: ${order._id} ---`);
      console.log(`   Buyer: ${order.user.name} (${order.user.email})`);
      console.log(`   Total Amount: ₹${order.totalAmount}`);
      console.log(`   Created: ${order.createdAt.toISOString()}`);
      console.log(`   Items: ${order.items.length}`);
      
      // Check each item for self-commission potential
      let expectedSelfCommission = 0;
      order.items.forEach((item, idx) => {
        const product = item.product;
        const selfCommPercentage = product?.selfCommission || 0;
        const itemSelfComm = item.productPrice * item.quantity * (selfCommPercentage / 100);
        expectedSelfCommission += itemSelfComm;
        
        console.log(`     Item ${idx + 1}: ${item.productName}`);
        console.log(`       Price: ₹${item.productPrice} × ${item.quantity}`);
        console.log(`       Self-Commission: ${selfCommPercentage}% = ₹${itemSelfComm}`);
      });
      
      console.log(`   Expected Self-Commission Total: ₹${expectedSelfCommission}`);
    }

    // 5. Check existing earnings
    const totalEarnings = await Earning.countDocuments();
    const earningsByType = await Earning.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    console.log(`\n💰 Total Earnings Records: ${totalEarnings}`);
    
    if (totalEarnings > 0) {
      console.log('\n📊 Earnings by Type:');
      earningsByType.forEach(earning => {
        console.log(`   • ${earning._id}: ${earning.count} records, ₹${earning.totalAmount.toFixed(2)}`);
      });
    } else {
      console.log('❌ No earnings records found!');
    }

    // 6. Check specific user (rohan@gmail.com from the screenshot)
    const testUser = await User.findOne({ email: { $regex: /rohan/, $options: 'i' } });
    if (testUser) {
      console.log(`\n🔍 Analyzing User: ${testUser.name} (${testUser.email})`);
      
      const userOrders = await Order.find({ user: testUser._id, status: 'delivered' });
      const userEarnings = await Earning.find({ user: testUser._id });
      
      console.log(`   Delivered Orders: ${userOrders.length}`);
      console.log(`   Earnings Records: ${userEarnings.length}`);
      
      if (userOrders.length > 0 && userEarnings.length === 0) {
        console.log('   ⚠️  User has delivered orders but no earnings - commissions not distributed!');
        
        // Try to distribute commissions for the most recent order
        const recentOrder = userOrders[userOrders.length - 1];
        console.log(`\n🔧 Attempting to distribute commissions for order: ${recentOrder._id}`);
        
        try {
          await distributeAllCommissions(recentOrder);
          console.log('✅ Commission distribution completed');
          
          // Check if earnings were created
          const newEarnings = await Earning.find({ user: testUser._id });
          console.log(`   New earnings count: ${newEarnings.length}`);
          
          if (newEarnings.length > 0) {
            console.log('   🎉 Commissions successfully created!');
            newEarnings.forEach(earning => {
              console.log(`     • ${earning.type}: ₹${earning.amount} - ${earning.description.substring(0, 50)}...`);
            });
          }
        } catch (error) {
          console.log('❌ Error distributing commissions:', error.message);
        }
      }
    }

    // 7. Provide recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (deliveredOrders.length === 0) {
      console.log('1. ❗ Mark some orders as "delivered" to trigger commission distribution');
    }
    
    if (productsWithSelfComm.length === 0) {
      console.log('2. ❗ Add selfCommission percentage to products in admin panel');
    }
    
    if (totalEarnings === 0 && deliveredOrders.length > 0) {
      console.log('3. ❗ Commission distribution may not be triggered automatically');
      console.log('   Check if orderController.js calls distributeAllCommissions() on status update');
    }

    console.log('\n=== DEBUG ANALYSIS COMPLETE ===');

  } catch (error) {
    console.error('Debug failed:', error);
  } finally {
    // Close database connection
    mongoose.connection.close();
  }
}

// Run the debug
debugCommissions();
