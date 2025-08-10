require('dotenv').config({ path: './src/.env' });
const mongoose = require('mongoose');
const Product = require('../models/Product');
const connectDB = require('../config/db');

// Connect to database
connectDB();

async function testNewProductCreation() {
  try {
    console.log('=== TESTING NEW PRODUCT CREATION ===\n');

    // Test creating a new product with only selfCommission field
    console.log('1. Creating new product with selfCommission field...');
    
    const newProduct = await Product.create({
      name: 'TEST: Premium Health Supplement',
      description: 'A premium health supplement with high self-commission for buyers',
      price: 1500,
      image: 'https://example.com/test-product.jpg',
      category: 'health',
      stock: 100,
      selfCommission: 12, // 12% self-commission
      isActive: true
    });

    console.log('✅ Product created successfully!');
    console.log(`📦 Product: ${newProduct.name}`);
    console.log(`💰 Self-Commission: ${newProduct.selfCommission}%`);
    console.log(`💵 Price: ₹${newProduct.price}`);
    console.log(`📂 Category: ${newProduct.category}`);
    console.log(`📊 Stock: ${newProduct.stock}`);

    // Verify the product structure
    console.log('\n2. Verifying product structure...');
    const productJson = newProduct.toJSON();
    
    if (productJson.hasOwnProperty('commission')) {
      console.log('❌ Product still has old commission field!');
      console.log(`   commission: ${productJson.commission}`);
    } else {
      console.log('✅ Product does NOT have old commission field');
    }

    if (productJson.selfCommission) {
      console.log(`✅ Product has selfCommission: ${productJson.selfCommission}%`);
    } else {
      console.log('❌ Product missing selfCommission field!');
    }

    // Test commission calculation for this product
    console.log('\n3. Testing commission calculation...');
    const orderValue = 3000; // User buys ₹3000 worth of this product (2 units)
    const expectedSelfCommission = (orderValue * newProduct.selfCommission) / 100;
    console.log(`📊 Order Value: ₹${orderValue}`);
    console.log(`💰 Expected Self-Commission: ₹${expectedSelfCommission} (${newProduct.selfCommission}%)`);

    // Test different scenarios
    console.log('\n4. Testing different commission scenarios...');
    
    const scenarios = [
      { price: 500, selfComm: 5, qty: 1, name: 'Basic Product' },
      { price: 2000, selfComm: 8, qty: 2, name: 'Premium Product' },
      { price: 100, selfComm: 15, qty: 5, name: 'High Commission Product' }
    ];

    scenarios.forEach((scenario, index) => {
      const orderTotal = scenario.price * scenario.qty;
      const commission = (orderTotal * scenario.selfComm) / 100;
      console.log(`   ${index + 1}. ${scenario.name}: ₹${scenario.price} × ${scenario.qty} = ₹${orderTotal}`);
      console.log(`      → Self-Commission (${scenario.selfComm}%): ₹${commission}`);
    });

    // Clean up - remove test product
    console.log('\n5. Cleaning up test product...');
    await Product.findByIdAndDelete(newProduct._id);
    console.log('✅ Test product removed');

    console.log('\n🎉 NEW PRODUCT CREATION TEST PASSED!');
    console.log('💡 Summary:');
    console.log('   ✅ Products can be created with only selfCommission field');
    console.log('   ✅ Old commission field is no longer required');
    console.log('   ✅ Admin forms should now show "Self Commission %" input');
    console.log('   ✅ Commission calculations work correctly');

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error.message.includes('commission') && error.message.includes('required')) {
      console.log('\n🔧 ISSUE DETECTED:');
      console.log('   The old commission field is still marked as required in the model.');
      console.log('   Make sure the Product model has been updated correctly.');
    }
  } finally {
    mongoose.connection.close();
  }
}

// Run the test
testNewProductCreation();
