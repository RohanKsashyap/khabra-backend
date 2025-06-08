require('dotenv').config();

module.exports = {
  // MongoDB Configuration
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/khabra-mlm',
  
  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '90d',
  
  // Server Configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Email Configuration (if needed)
  emailService: process.env.EMAIL_SERVICE || 'gmail',
  emailUser: process.env.EMAIL_USER,
  emailPassword: process.env.EMAIL_PASSWORD,
}; 