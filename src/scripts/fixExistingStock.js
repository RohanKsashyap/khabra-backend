const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Product = require('../models/Product');
const Stock = require('../models/Stock');

const fixExistingStock = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all products
    const products = await Product.find({});
    console.log(`Found ${products.length} products to check`);

    let updatedCount = 0;

    for (const product of products) {
      // Get all stock records for this product
      const stockRecords = await Stock.find({ product: product._id });
      
      if (stockRecords.length > 0) {
        // Update stock records where currentQuantity is 0 but product has stock
        const updateResult = await Stock.updateMany(
          { 
            product: product._id, 
            currentQuantity: 0 
          },
          { 
            $set: { 
              currentQuantity: product.stock,
              maximumCapacity: Math.max(1000, product.stock * 2)
            } 
          }
        );

        if (updateResult.modifiedCount > 0) {
          console.log(`Updated ${updateResult.modifiedCount} stock records for product: ${product.name} (Stock: ${product.stock})`);
          updatedCount += updateResult.modifiedCount;
        }
      }
    }

    console.log(`\nFixed ${updatedCount} stock records total`);
    console.log('Stock fix completed successfully!');

  } catch (error) {
    console.error('Error fixing stock:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the script
if (require.main === module) {
  fixExistingStock();
}

module.exports = fixExistingStock;
