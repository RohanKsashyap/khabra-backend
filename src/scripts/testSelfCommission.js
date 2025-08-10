require('dotenv').config({ path: './src/.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Earning = require('../models/Earning');
const { distributeAllCommissions, distributeSelfCommission } = require('../utils/mlmCommission');
const connectDB = require('../config/db');

// Connect to database
connectDB();

async function testSelfCommission() {
  try {
    console.log('=== SELF COMMISSION SYSTEM TEST ===\n');

    // Clear existing test data
    await User.deleteMany({ email: { $regex: /^test/ } });
    await Product.deleteMany({ name: { $regex: /^Test/ } });
    await Order.deleteMany({ 'shippingAddress.fullName': { $regex: /^Test/ } });
    await Earning.deleteMany({ description: { $regex: /Test|Self-commission/ } });

    console.log('1. Creating test user...');

    // Create test user
    const testUser = await User.create({
      name: 'Test Buyer',
      email: 'test.buyer@example.com',
      password: 'password123',
      phone: '1234567890',
      role: 'user',
      referralCode: 'TESTBUYER001'
    });

    console.log('Test user created:', testUser.email);

    console.log('\n2. Creating test products with different self-commission rates...');

    // Create test products with different self-commission percentages
    const product1 = await Product.create({
      name: 'Test Product A (5% Self-Commission)',
      description: 'Test product with 5% self-commission',
      price: 1000,
      image: 'test-image-a.jpg',
      category: 'health',
      stock: 100,
      commission: 10, // 10% regular commission for MLM
      selfCommission: 5, // 5% self-commission for buyer
      isActive: true
    });

    const product2 = await Product.create({
      name: 'Test Product B (3% Self-Commission)',
      description: 'Test product with 3% self-commission',
      price: 2000,
      image: 'test-image-b.jpg',
      category: 'beauty',
      stock: 100,
      commission: 8, // 8% regular commission for MLM
      selfCommission: 3, // 3% self-commission for buyer
      isActive: true
    });

    const product3 = await Product.create({
      name: 'Test Product C (No Self-Commission)',
      description: 'Test product without self-commission',
      price: 1500,
      image: 'test-image-c.jpg',
      category: 'wellness',
      stock: 100,
      commission: 12, // 12% regular commission for MLM
      selfCommission: 0, // 0% self-commission for buyer
      isActive: true
    });

    console.log('Products created:');
    console.log(`- ${product1.name}: ₹${product1.price} (${product1.selfCommission}% self-commission)`);
    console.log(`- ${product2.name}: ₹${product2.price} (${product2.selfCommission}% self-commission)`);
    console.log(`- ${product3.name}: ₹${product3.price} (${product3.selfCommission}% self-commission)`);

    console.log('\n3. Creating test order with multiple products...');

    // Create a test order with multiple products
    const order = await Order.create({
      user: testUser._id,
      items: [
        {
          product: product1._id,
          productName: product1.name,
          productPrice: product1.price,
          productImage: product1.image,
          quantity: 2 // 2 units of product A
        },
        {
          product: product2._id,
          productName: product2.name,
          productPrice: product2.price,
          productImage: product2.image,
          quantity: 1 // 1 unit of product B
        },
        {
          product: product3._id,
          productName: product3.name,
          productPrice: product3.price,
          productImage: product3.image,
          quantity: 1 // 1 unit of product C (no self-commission)
        }
      ],
      totalAmount: (product1.price * 2) + product2.price + product3.price, // ₹5500
      status: 'delivered',
      paymentStatus: 'paid',
      paymentMethod: 'cod',
      orderType: 'online',
      shippingAddress: {
        fullName: 'Test Buyer',
        addressLine1: 'Test Address',
        city: 'Test City',
        state: 'Test State',
        postalCode: '123456',
        country: 'India',
        phone: '1234567890'
      },
      billingAddress: {
        fullName: 'Test Buyer',
        addressLine1: 'Test Address',
        city: 'Test City',
        state: 'Test State',
        postalCode: '123456',
        country: 'India',
        phone: '1234567890'
      },
      createdBy: testUser._id,
      commissions: {
        self: [],
        mlm: [],
        franchise: {}
      }
    });

    console.log('Order created successfully!');
    console.log(`Order ID: ${order._id}`);
    console.log(`Order Amount: ₹${order.totalAmount}`);

    console.log('\n4. Distributing self-commissions...');

    // Distribute only self-commission for testing
    await distributeSelfCommission(order);

    console.log('Self-commissions distributed successfully!\n');

    console.log('5. Verifying self-commission distribution...');

    // Get all self-commission earnings for this order
    const selfCommissionEarnings = await Earning.find({ 
      orderId: order._id, 
      type: 'self_commission' 
    }).populate('user', 'name email');
    
    console.log(`Total self-commission earnings created: ${selfCommissionEarnings.length}`);
    console.log('\nSelf-Commission Distribution Results:');
    console.log('=====================================');

    let totalSelfCommission = 0;
    let expectedSelfCommission = 0;

    selfCommissionEarnings.forEach(earning => {
      console.log(`${earning.user.name} (${earning.user.email}): ₹${earning.amount} - ${earning.description}`);
      totalSelfCommission += earning.amount;
    });

    // Calculate expected self-commission
    expectedSelfCommission += (product1.price * 2) * (product1.selfCommission / 100); // Product A: ₹2000 * 5% = ₹100
    expectedSelfCommission += product2.price * (product2.selfCommission / 100); // Product B: ₹2000 * 3% = ₹60
    expectedSelfCommission += product3.price * (product3.selfCommission / 100); // Product C: ₹1500 * 0% = ₹0

    console.log(`\nTotal Self-Commission Distributed: ₹${totalSelfCommission}`);
    console.log(`Expected Total: ₹${expectedSelfCommission}`);
    
    if (Math.abs(totalSelfCommission - expectedSelfCommission) < 0.01) {
      console.log('✅ Self-commission calculation is CORRECT!');
    } else {
      console.log('❌ Self-commission calculation is INCORRECT!');
    }

    // Check updated order structure
    const updatedOrder = await Order.findById(order._id);
    console.log('\n6. Checking order commission tracking...');
    console.log(`Self-commission entries in order: ${updatedOrder.commissions.self.length}`);
    
    updatedOrder.commissions.self.forEach((selfComm, index) => {
      console.log(`Entry ${index + 1}: ${selfComm.productName} - ₹${selfComm.amount} (${selfComm.percentage}%)`);
    });

    console.log('\n7. Testing full commission distribution (Self + MLM + Franchise)...');
    
    // Clear previous earnings to test full distribution
    await Earning.deleteMany({ orderId: order._id });
    updatedOrder.commissions = { self: [], mlm: [], franchise: {} };
    await updatedOrder.save();

    // Distribute all commissions
    await distributeAllCommissions(updatedOrder);

    // Get all earnings for verification
    const allEarnings = await Earning.find({ orderId: order._id }).populate('user', 'name email');
    
    console.log(`\nTotal earnings created (all types): ${allEarnings.length}`);
    console.log('\nAll Commission Types:');
    console.log('====================');

    const commissionByType = {};
    allEarnings.forEach(earning => {
      if (!commissionByType[earning.type]) {
        commissionByType[earning.type] = [];
      }
      commissionByType[earning.type].push(earning);
    });

    Object.keys(commissionByType).forEach(type => {
      console.log(`\n${type.toUpperCase()} COMMISSIONS:`);
      commissionByType[type].forEach(earning => {
        console.log(`  ${earning.user.name}: ₹${earning.amount}${earning.level ? ` (Level ${earning.level})` : ''}`);
      });
    });

    const totalAllCommissions = allEarnings.reduce((sum, earning) => sum + earning.amount, 0);
    console.log(`\nTotal All Commissions: ₹${totalAllCommissions}`);

    console.log('\n8. Testing duplicate prevention...');
    
    // Try to distribute commissions again
    await distributeAllCommissions(updatedOrder);
    
    const earningsAfterDuplicate = await Earning.find({ orderId: order._id });
    console.log(`Earnings after duplicate attempt: ${earningsAfterDuplicate.length} (should be same as before)`);

    if (earningsAfterDuplicate.length === allEarnings.length) {
      console.log('✅ Duplicate prevention is working correctly!');
    } else {
      console.log('❌ Duplicate prevention failed!');
    }

    console.log('\n=== SELF COMMISSION TEST COMPLETED SUCCESSFULLY ===');

  } catch (error) {
    console.error('Self Commission test failed:', error);
  } finally {
    // Close database connection
    mongoose.connection.close();
  }
}

// Run the test
testSelfCommission();
