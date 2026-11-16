export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error('💥 Error Caught:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method
  });

  // Mongoose bad ObjectId / CastError
  if (err.name === 'CastError') {
    const message = `Resource not found with id: ${err.value}`;
    return res.status(404).json({
      success: false,
      message,
      code: 'RESOURCE_NOT_FOUND'
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate value entered for field '${field}'. Please provide an alternate value.`;
    return res.status(400).json({
      success: false,
      message,
      code: 'DUPLICATE_KEY_ERROR'
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map(val => val.message)
      .join(', ');
    return res.status(400).json({
      success: false,
      message,
      code: 'VALIDATION_ERROR'
    });
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.',
      code: 'INVALID_TOKEN'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication token has expired.',
      code: 'TOKEN_EXPIRED'
    });
  }

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    code: error.code || 'SERVER_ERROR'
  });
};
