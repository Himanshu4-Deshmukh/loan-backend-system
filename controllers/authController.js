import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { createMessage } from '../services/messageService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your_refresh_secret_key_here';

const authController = {
    // User signup
    signup: async (req, res) => {
        try {
            const { userid, password, name, email } = req.body;

            if (!userid || !password || !name) {
                return res.status(400).json({ 
                    success: false,
                    message: 'User ID, password, and name are required' 
                });
            }

            // Check if user exists
            const existingUser = await User.findOne({ userid });
            if (existingUser) {
                return res.status(400).json({ 
                    success: false,
                    message: 'User ID already exists' 
                });
            }

            // Create user
            const user = new User({
                userid,
                password,
                name,
                email,
                permissions: User.getDefaultPermissions('user')
            });

            await user.save();

            // Create welcome message
            await createMessage({
                type: 'system_alert',
                userId: user._id,
                title: 'Welcome to Loan Management System',
                message: `Welcome ${name}! Your account has been created successfully.`,
                priority: 'low'
            });

            res.status(201).json({ 
                success: true,
                message: 'User created successfully',
                user: {
                    id: user._id,
                    userid: user.userid,
                    name: user.name,
                    role: user.role
                }
            });
        } catch (error) {
            console.error('Signup error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error during signup' 
            });
        }
    },

    // User login
    login: async (req, res) => {
        try {
            const { userid, password } = req.body;

            if (!userid || !password) {
                return res.status(400).json({ 
                    success: false,
                    message: 'User ID and password are required' 
                });
            }

            // Find user
            const user = await User.findOne({ userid, isActive: true });
            if (!user) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Invalid credentials' 
                });
            }

            // Check if account is locked
            if (user.isLocked) {
                return res.status(423).json({ 
                    success: false,
                    message: 'Account locked due to too many failed attempts. Please try again later.' 
                });
            }

            // Check password
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                await user.incLoginAttempts();
                return res.status(400).json({ 
                    success: false,
                    message: 'Invalid credentials' 
                });
            }

            // Reset login attempts on successful login
            if (user.loginAttempts > 0) {
                await user.resetLoginAttempts();
            }

            // Update last login
            user.lastLogin = new Date();
            await user.save();

            // Generate tokens
            const accessToken = jwt.sign(
                { 
                    id: user._id, 
                    userid: user.userid, 
                    name: user.name, 
                    role: user.role,
                    permissions: user.permissions
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            const refreshToken = jwt.sign(
                { id: user._id },
                JWT_REFRESH_SECRET,
                { expiresIn: '7d' }
            );

            res.json({
                success: true,
                message: 'Login successful',
                accessToken,
                refreshToken,
                user: {
                    id: user._id,
                    userid: user.userid,
                    name: user.name,
                    role: user.role,
                    permissions: user.permissions,
                    lastLogin: user.lastLogin
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error during login' 
            });
        }
    },

    // User logout
    logout: async (req, res) => {
        try {
            // In a real application, you might want to blacklist the token
            res.json({ 
                success: true,
                message: 'Logged out successfully' 
            });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error during logout' 
            });
        }
    },

    // Refresh token
    refreshToken: async (req, res) => {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(401).json({ 
                    success: false,
                    message: 'Refresh token required' 
                });
            }

            const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
            const user = await User.findById(decoded.id).select('-password');

            if (!user || !user.isActive) {
                return res.status(403).json({ 
                    success: false,
                    message: 'Invalid refresh token' 
                });
            }

            const accessToken = jwt.sign(
                { 
                    id: user._id, 
                    userid: user.userid, 
                    name: user.name, 
                    role: user.role,
                    permissions: user.permissions
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                success: true,
                accessToken,
                user: {
                    id: user._id,
                    userid: user.userid,
                    name: user.name,
                    role: user.role,
                    permissions: user.permissions
                }
            });
        } catch (error) {
            console.error('Refresh token error:', error);
            res.status(403).json({ 
                success: false,
                message: 'Invalid refresh token' 
            });
        }
    },

    // Get user profile
    getProfile: async (req, res) => {
        try {
            const user = await User.findById(req.user.id).select('-password');
            res.json({
                success: true,
                user
            });
        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting profile' 
            });
        }
    },

    // Update user profile
    updateProfile: async (req, res) => {
        try {
            const { name, email, profile } = req.body;
            const user = await User.findById(req.user.id);

            if (name) user.name = name;
            if (email) user.email = email;
            if (profile) user.profile = { ...user.profile, ...profile };

            await user.save();

            res.json({ 
                success: true,
                message: 'Profile updated successfully',
                user: {
                    id: user._id,
                    userid: user.userid,
                    name: user.name,
                    email: user.email,
                    profile: user.profile
                }
            });
        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error updating profile' 
            });
        }
    },

    // Change password
    changePassword: async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Current password and new password are required' 
                });
            }

            const user = await User.findById(req.user.id);
            const isMatch = await user.comparePassword(currentPassword);

            if (!isMatch) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Current password is incorrect' 
                });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({ 
                    success: false,
                    message: 'New password must be at least 6 characters long' 
                });
            }

            user.password = newPassword;
            await user.save();

            res.json({ 
                success: true,
                message: 'Password changed successfully' 
            });
        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error changing password' 
            });
        }
    },

    // Forgot password
    forgotPassword: async (req, res) => {
        try {
            const { userid, email } = req.body;

            if (!userid && !email) {
                return res.status(400).json({ 
                    success: false,
                    message: 'User ID or email is required' 
                });
            }

            const user = await User.findOne({
                $or: [
                    { userid: userid },
                    { email: email }
                ]
            });

            if (!user) {
                return res.status(404).json({ 
                    success: false,
                    message: 'User not found' 
                });
            }

            // In a real application, you would send an email with reset link
            // For now, we'll just return a success message
            res.json({ 
                success: true,
                message: 'Password reset instructions sent to your email' 
            });
        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error during password reset' 
            });
        }
    },

    // Reset password
    resetPassword: async (req, res) => {
        try {
            const { token, newPassword } = req.body;

            if (!token || !newPassword) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Token and new password are required' 
                });
            }

            // In a real application, you would verify the reset token
            // For now, we'll just return a success message
            res.json({ 
                success: true,
                message: 'Password reset successfully' 
            });
        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error during password reset' 
            });
        }
    },

    // Validate session
    validateSession: async (req, res) => {
        try {
            res.json({ 
                success: true,
                message: 'Session is valid',
                user: {
                    id: req.user._id,
                    userid: req.user.userid,
                    name: req.user.name,
                    role: req.user.role,
                    permissions: req.user.permissions
                }
            });
        } catch (error) {
            console.error('Validate session error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error validating session' 
            });
        }
    }
};

export default authController;