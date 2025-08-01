const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Ensure we're always sending JSON responses
  res.setHeader('Content-Type', 'application/json');
  
  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    }
  });
};

// Not Found Error Handler
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = { errorHandler, notFound }; 