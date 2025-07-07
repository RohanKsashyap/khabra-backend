const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  await mongoose.connect('mongodb+srv://roy282227:13131313SABs@cluster0.xgaiyxu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'); // <-- Replace with your MongoDB URI

  const users = await User.find({ referredBy: { $ne: null }, uplineId: null });
  let updated = 0;

  for (const user of users) {
    const referrer = await User.findOne({ referralCode: user.referredBy });
    if (referrer) {
      user.uplineId = referrer._id;
      user.referralChain = [referrer._id.toString(), ...(referrer.referralChain || [])];
      await user.save();
      updated++;
      console.log(`Updated user ${user.email}: uplineId set to ${referrer._id}`);
    } else {
      console.log(`Referrer not found for user ${user.email} (referredBy: ${user.referredBy})`);
    }
  }

  console.log(`Done! Updated ${updated} users.`);
  process.exit();
}

main(); 