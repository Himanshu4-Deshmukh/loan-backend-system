import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

// Authentication middleware
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: 'Access token required' 
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(403).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        if (!user.isActive) {
            return res.status(403).json({ 
                success: false,
                message: 'Account is deactivated' 
            });
        }

        if (user.isLocked) {
            return res.status(403).json({ 
                success: false,
                message: 'Account is locked due to too many failed login attempts' 
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                message: 'Token expired' 
            });
        }
        return res.status(403).json({ 
            success: false,
            message: 'Invalid token' 
        });
    }
};

// Permission middleware
const checkPermission = (permission) => {
    return (req, res, next) => {
        if (req.user.role === 'admin' || req.user.permissions.includes(permission)) {
            next();
        } else {
            res.status(403).json({ 
                success: false,
                message: `Insufficient permissions. Required: ${permission}` 
            });
        }
    };
};

// Role-based middleware
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!Array.isArray(roles)) {
            roles = [roles];
        }
        
        if (roles.includes(req.user.role)) {
            next();
        } else {
            res.status(403).json({ 
                success: false,
                message: `Access denied. Required roles: ${roles.join(', ')}` 
            });
        }
    };
};

// Admin only middleware
const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false,
            message: 'Admin access required' 
        });
    }
    next();
};

// Admin or SubAdmin middleware
const adminOrSubAdmin = (req, res, next) => {
    if (!['admin', 'subadmin'].includes(req.user.role)) {
        return res.status(403).json({ 
            success: false,
            message: 'Admin or SubAdmin access required' 
        });
    }
    next();
};

// Check working hours for subadmins
const checkWorkingHours = (req, res, next) => {
    if (req.user.role === 'subadmin' && req.user.restrictions.workingHours) {
        const now = new Date();
        const currentTime = now.getHours() * 100 + now.getMinutes();
        
        const { start, end } = req.user.restrictions.workingHours;
        const startTime = parseInt(start.replace(':', ''));
        const endTime = parseInt(end.replace(':', ''));
        
        if (currentTime < startTime || currentTime > endTime) {
            return res.status(403).json({ 
                success: false,
                message: `Access denied. Working hours: ${start} - ${end}` 
            });
        }
    }
    next();
};

export {
    authenticateToken,
    checkPermission,
    requireRole,
    adminOnly,
    adminOrSubAdmin,
    checkWorkingHours
};