// Error handling middleware
const errorHandler = (error, req, res, next) => {
    console.error('Error:', error);

    // Mongoose bad ObjectId
    if (error.name === 'CastError') {
        const message = 'Invalid ID format';
        return res.status(400).json({ success: false, message });
    }

    // Mongoose duplicate key
    if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        const message = `${field} already exists`;
        return res.status(400).json({ success: false, message });
    }

    // Mongoose validation error
    if (error.name === 'ValidationError') {
        const message = Object.values(error.errors).map(err => err.message).join(', ');
        return res.status(400).json({ success: false, message });
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token expired' });
    }

    // Default error
    res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Internal server error'
    });
};

module.exports = errorHandler;