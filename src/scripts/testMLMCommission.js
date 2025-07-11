const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const Earning = require('../models/Earning');
const { distributeAllCommissions, MLM_COMMISSION_LEVELS } = require('../utils/mlmCommission');
const connectDB = require('../config/db');

// Connect to database
connectDB();

async function testMLMCommission() {
  try {
    console.log('=== MLM Commission System Test ===\n');

    // Clear existing test data
    await User.deleteMany({ email: { $regex: /^test/ } });
    await Order.deleteMany({ 'shippingAddress.fullName': { $regex: /^Test/ } });
    await Earning.deleteMany({ description: { $regex: /Test/ } });

    console.log('1. Creating test users with upline chain...');

    // Create test users with upline chain
    const users = [];
    
    // Create Level 1 (Top level)
    const level1 = await User.create({
      name: 'Test Level 1',
      email: 'test.level1@example.com',
      password: 'password123',
      phone: '1234567890',
      role: 'user',
      referralCode: 'TEST001'
    });
    users.push(level1);

    // Create Level 2
    const level2 = await User.create({
      name: 'Test Level 2',
      email: 'test.level2@example.com',
      password: 'password123',
      phone: '1234567891',
      role: 'user',
      referralCode: 'TEST002',
      uplineId: level1._id
    });
    users.push(level2);

    // Create Level 3
    const level3 = await User.create({
      name: 'Test Level 3',
      email: 'test.level3@example.com',
      password: 'password123',
      phone: '1234567892',
      role: 'user',
      referralCode: 'TEST003',
      uplineId: level2._id
    });
    users.push(level3);

    // Create Level 4
    const level4 = await User.create({
      name: 'Test Level 4',
      email: 'test.level4@example.com',
      password: 'password123',
      phone: '1234567893',
      role: 'user',
      referralCode: 'TEST004',
      uplineId: level3._id
    });
    users.push(level4);

    // Create Level 5
    const level5 = await User.create({
      name: 'Test Level 5',
      email: 'test.level5@example.com',
      password: 'password123',
      phone: '1234567894',
      role: 'user',
      referralCode: 'TEST005',
      uplineId: level4._id
    });
    users.push(level5);

    // Create Level 6 (Buyer)
    const level6 = await User.create({
      name: 'Test Level 6',
      email: 'test.level6@example.com',
      password: 'password123',
      phone: '1234567895',
      role: 'user',
      referralCode: 'TEST006',
      uplineId: level5._id
    });
    users.push(level6);

    console.log('Users created successfully!');
    console.log('Upline chain: Level 6 → Level 5 → Level 4 → Level 3 → Level 2 → Level 1\n');

    console.log('2. Creating test order...');

    // Create a test order
    const order = await Order.create({
      user: level6._id,
      items: [{
        product: new mongoose.Types.ObjectId(),
        productName: 'Test Product',
        productPrice: 1000,
        productImage: 'test-image.jpg',
        quantity: 1
      }],
      totalAmount: 1000,
      status: 'delivered',
      paymentStatus: 'paid',
      paymentMethod: 'cod',
      orderType: 'online',
      shippingAddress: {
        fullName: 'Test Level 6',
        addressLine1: 'Test Address',
        city: 'Test City',
        state: 'Test State',
        postalCode: '123456',
        country: 'India',
        phone: '1234567895'
      },
      billingAddress: {
        fullName: 'Test Level 6',
        addressLine1: 'Test Address',
        city: 'Test City',
        state: 'Test State',
        postalCode: '123456',
        country: 'India',
        phone: '1234567895'
      },
      createdBy: level6._id,
      commissions: {
        mlm: [],
        franchise: {}
      }
    });

    console.log('Order created successfully!');
    console.log(`Order ID: ${order._id}`);
    console.log(`Order Amount: ₹${order.totalAmount}\n`);

    console.log('3. Distributing MLM commissions...');

    // Distribute commissions
    await distributeAllCommissions(order);

    console.log('Commissions distributed successfully!\n');

    console.log('4. Verifying commission distribution...');

    // Get all earnings for this order
    const earnings = await Earning.find({ orderId: order._id }).populate('user', 'name email');
    
    console.log(`Total earnings created: ${earnings.length}`);
    console.log('\nCommission Distribution Results:');
    console.log('================================');

    let totalCommission = 0;
    earnings.forEach(earning => {
      console.log(`${earning.user.name} (${earning.user.email}): ₹${earning.amount} (${earning.type})`);
      totalCommission += earning.amount;
    });

    console.log(`\nTotal Commission Distributed: ₹${totalCommission}`);
    console.log(`Expected Total: ₹${1000 * (MLM_COMMISSION_LEVELS.reduce((sum, level) => sum + level.percentage, 0))}`);

    // Verify commission levels
    const mlmEarnings = earnings.filter(e => e.type === 'mlm_level').sort((a, b) => a.level - b.level);
    
    console.log('\nMLM Commission Levels:');
    console.log('=====================');
    
    mlmEarnings.forEach(earning => {
      const expectedPercentage = MLM_COMMISSION_LEVELS[earning.level - 1].percentage * 100;
      const expectedAmount = 1000 * MLM_COMMISSION_LEVELS[earning.level - 1].percentage;
      console.log(`Level ${earning.level}: ${earning.user.name} - ₹${earning.amount} (${expectedPercentage}%)`);
      
      if (Math.abs(earning.amount - expectedAmount) > 0.01) {
        console.log(`  ⚠️  WARNING: Expected ₹${expectedAmount}, got ₹${earning.amount}`);
      }
    });

    console.log('\n5. Testing duplicate commission prevention...');
    
    // Try to distribute commissions again
    await distributeAllCommissions(order);
    
    const earningsAfterDuplicate = await Earning.find({ orderId: order._id });
    console.log(`Earnings after duplicate attempt: ${earningsAfterDuplicate.length} (should be same as before)`);

    // --- Automated Downline Reassignment Test ---
    console.log('\n6. Testing downline reassignment on user deletion...');

    // Delete Level 5 (level5)
    await User.findByIdAndDelete(level5._id);

    // Fetch Level 6 again
    const updatedLevel6 = await User.findById(level6._id);
    const expectedUplineId = String(level4._id);
    const actualUplineId = updatedLevel6.uplineId ? String(updatedLevel6.uplineId) : null;

    if (actualUplineId === expectedUplineId) {
      console.log('✅ Downline reassignment successful: Level 6\'s uplineId is now Level 4.');
    } else {
      console.log('❌ Downline reassignment failed:');
      console.log('  Expected uplineId:', expectedUplineId);
      console.log('  Actual uplineId:', actualUplineId);
    }

    console.log('\n=== Test Completed Successfully! ===');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

// Run the test
testMLMCommission(); 