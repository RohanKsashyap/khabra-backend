const mongoose = require('mongoose');
const Franchise = require('./src/models/Franchise');
require('dotenv').config();


const MONGODB_URI="mongodb+srv://roy282227:13131313SABs@cluster0.xgaiyxu.mongodb.net/?retryWrites=true\u0026w=majority\u0026appName=Cluster0"
async function setAllFranchisesNonDefault() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Remove default status from all franchises
        await Franchise.updateMany({}, { isDefault: false });
        console.log('Removed default status from all franchises');

    } catch (error) {
        console.error('Error setting non-default franchise:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

setAllFranchisesNonDefault();
