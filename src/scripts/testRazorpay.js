require('dotenv').config();
const { razorpay } = require('../config/razorpay');

// Test Razorpay connection and API keys
async function testRazorpayConnection() {
  try {
    console.log('Testing Razorpay connection...');
    
    // Create a test order
    const orderData = {
      amount: 50000, // ₹500 in paise
      currency: 'INR',
      receipt: 'test_receipt_' + Date.now(),
      notes: {
        description: 'Test order for Razorpay integration'
      }
    };
    
    const order = await razorpay.orders.create(orderData);
    
    console.log('✅ Razorpay connection successful!');
    console.log('Test order created:');
    console.log(JSON.stringify(order, null, 2));
    
    // Get order details
    const orderDetails = await razorpay.orders.fetch(order.id);
    console.log('Order details fetched:');
    console.log(JSON.stringify(orderDetails, null, 2));
    
    return true;
  } catch (error) {
    console.error('❌ Razorpay connection failed:');
    console.error(error);
    return false;
  }
}

// Execute the test
testRazorpayConnection()
  .then(success => {
    if (success) {
      console.log('Razorpay integration test completed successfully.');
    } else {
      console.log('Razorpay integration test failed. Check your API keys and connection.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error during test:', error);
    process.exit(1);
  }); 