const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const app = require('./app'); // Import the Express app from app.js

// Load environment variables
console.log('Current directory:', __dirname);
console.log('Loading .env file...');
dotenv.config({ path: path.join(__dirname, '../.env') });
console.log('Environment variables loaded:', process.env.MONGO_URI ? 'Yes' : 'No');

// MongoDB Connection
const MONGODB_URI = process.env.MONGO_URI || 'mongodb+srv://roy282227:13131313SABs@cluster0.xgaiyxu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const MONGODB_URI2 = process.env.MONGO_URI;

mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('Connected to MongoDB');
  // Create indexes for better performance (if models are defined globally or imported here)
  // Assuming models are required within app.js or its routes, this might not be strictly necessary here.
  // However, if any models are directly interacted with in server.js, they should be required here.
  
  const PORT = process.env.PORT || 5000;
 
  console.log(MONGODB_URI2)
  const server = app.listen(PORT, () => {
    console.log(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.log(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    // Close server & exit process
    server.close(() => process.exit(1));
  });
})
.catch((error) => {
  console.error('MongoDB connection error:', error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
}); 