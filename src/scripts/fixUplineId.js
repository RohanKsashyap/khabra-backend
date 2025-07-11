require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

// Connect to database
connectDB();

async function fixUplineIds() {
  try {
    // Fix users with valid referredBy
    const usersWithReferral = await User.find({ uplineId: null, $and: [ { referredBy: { $ne: null } }, { referredBy: { $ne: "" } } ] });
    let updatedCount = 0;
    for (const user of usersWithReferral) {
      const referrer = await User.findOne({ referralCode: user.referredBy });
      if (referrer) {
        user.uplineId = referrer._id;
        await user.save();
        console.log(`Updated user ${user.email}: uplineId set to ${referrer._id}`);
        updatedCount++;
      } else {
        console.log(`No referrer found for user ${user.email} with referredBy ${user.referredBy}`);
      }
    }
    // Fix users with no referredBy (null, undefined, or empty string)
    const usersNoReferral = await User.find({ uplineId: null, $or: [ { referredBy: null }, { referredBy: "" } ] });
    const adminUser = await User.findOne({ role: 'admin' });
    if (adminUser) {
      for (const user of usersNoReferral) {
        user.uplineId = adminUser._id;
        await user.save();
        console.log(`Updated user ${user.email}: uplineId set to admin (${adminUser._id})`);
        updatedCount++;
      }
    }
    console.log(`\nTotal users updated: ${updatedCount}`);
  } catch (error) {
    console.error('Error fixing uplineIds:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

fixUplineIds(); 