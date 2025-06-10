const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const dotenv = require('dotenv')
const cookieParser = require('cookie-parser');
const compression = require('compression');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

const app = express();

// Enable CORS with specific options
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Set security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Sanitize data
app.use(mongoSanitize());

// Prevent XSS attacks
app.use(xss());

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Compress responses
app.use(compression());

// Routes
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const addressRoutes = require('./routes/addressRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const rankRoutes = require('./routes/rankRoutes');
const earningsRoutes = require('./routes/earningsRoutes');
const networkRoutes = require('./routes/networkRoutes');
const authRoutes = require('./routes/auth');

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/ranks', rankRoutes);
app.use('/api/users/earnings', earningsRoutes);
app.use('/api/users/network', networkRoutes);
app.use('/api/auth', authRoutes);

// Handle 404 errors
app.use(notFound);

// Error handler
app.use(errorHandler);

module.exports = app; 