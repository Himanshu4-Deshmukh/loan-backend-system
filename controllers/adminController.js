const User = require('../models/User');
const Customer = require('../models/Customer');
const Loan = require('../models/Loan');
const Payment = require('../models/Payment');
const { createMessage } = require('../services/messageService');

const adminController = {
    // Get all users
    getAllUsers: async (req, res) => {
        try {
            const { page = 1, limit = 10, role, isActive } = req.query;
            const filter = {};
            
            if (role) filter.role = role;
            if (isActive !== undefined) filter.isActive = isActive === 'true';

            const users = await User.find(filter)
                .select('-password')
                .populate('createdBy', 'name userid')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await User.countDocuments(filter);

            res.json({
                success: true,
                users,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error('Get all users error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting users' 
            });
        }
    },

    // Get user by ID
    getUserById: async (req, res) => {
        try {
            const user = await User.findById(req.params.id)
                .select('-password')
                .populate('createdBy', 'name userid');

            if (!user) {
                return res.status(404).json({ 
                    success: false,
                    message: 'User not found' 
                });
            }

            res.json({
                success: true,
                user
            });
        } catch (error) {
            console.error('Get user by ID error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting user' 
            });
        }
    },

    // Create user
    createUser: async (req, res) => {
        try {
            const { userid, password, name, email, role, permissions, restrictions, profile } = req.body;

            if (!userid || !password || !name) {
                return res.status(400).json({ 
                    success: false,
                    message: 'User ID, password, and name are required' 
                });
            }

            const existingUser = await User.findOne({ userid });
            if (existingUser) {
                return res.status(400).json({ 
                    success: false,
                    message: 'User ID already exists' 
                });
            }

            const user = new User({
                userid,
                password,
                name,
                email,
                role: role || 'user',
                permissions: permissions || User.getDefaultPermissions(role || 'user'),
                restrictions: restrictions || {},
                profile: profile || {},
                createdBy: req.user.id
            });

            await user.save();

            // Create notification message
            await createMessage({
                type: 'system_alert',
                userId: user._id,
                title: 'Account Created',
                message: `Your account has been created by ${req.user.name}`,
                priority: 'medium'
            });

            res.status(201).json({ 
                success: true,
                message: 'User created successfully', 
                user: {
                    id: user._id,
                    userid: user.userid,
                    name: user.name,
                    role: user.role,
                    permissions: user.permissions,
                    isActive: user.isActive
                }
            });
        } catch (error) {
            console.error('Create user error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error creating user' 
            });
        }
    },

    // Update user
    updateUser: async (req, res) => {
        try {
            const { name, email, role, permissions, restrictions, profile, isActive } = req.body;
            
            const user = await User.findById(req.params.id);
            if (!user) {
                return res.status(404).json({ 
                    success: false,
                    message: 'User not found' 
                });
            }

            // Prevent admin from deactivating themselves
            if (req.user.id === req.params.id && isActive === false) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Cannot deactivate your own account' 
                });
            }

            // Update fields
            if (name) user.name = name;
            if (email) user.email = email;
            if (role) user.role = role;
            if (permissions) user.permissions = permissions;
            if (restrictions) user.restrictions = { ...user.restrictions, ...restrictions };
            if (profile) user.profile = { ...user.profile, ...profile };
            if (isActive !== undefined) user.isActive = isActive;

            user.updatedAt = new Date();
            await user.save();

            res.json({ 
                success: true,
                message: 'User updated successfully', 
                user: {
                    id: user._id,
                    userid: user.userid,
                    name: user.name,
                    role: user.role,
                    permissions: user.permissions,
                    isActive: user.isActive
                }
            });
        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error updating user' 
            });
        }
    },

    // Delete user
    deleteUser: async (req, res) => {
        try {
            const user = await User.findById(req.params.id);
            if (!user) {
                return res.status(404).json({ 
                    success: false,
                    message: 'User not found' 
                });
            }

            // Prevent admin from deleting themselves
            if (req.user.id === req.params.id) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Cannot delete your own account' 
                });
            }

            // Instead of deleting, deactivate the user
            user.isActive = false;
            user.updatedAt = new Date();
            await user.save();

            res.json({ 
                success: true,
                message: 'User deactivated successfully' 
            });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error deleting user' 
            });
        }
    },

    // Get all subadmins
    getAllSubAdmins: async (req, res) => {
        try {
            const subadmins = await User.find({ role: 'subadmin' })
                .select('-password')
                .populate('createdBy', 'name userid')
                .sort({ createdAt: -1 });

            res.json({
                success: true,
                subadmins
            });
        } catch (error) {
            console.error('Get all subadmins error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting subadmins' 
            });
        }
    },

    // Create subadmin
    createSubAdmin: async (req, res) => {
        try {
            const { userid, password, name, email, permissions, restrictions, profile } = req.body;

            if (!userid || !password || !name) {
                return res.status(400).json({ 
                    success: false,
                    message: 'User ID, password, and name are required' 
                });
            }

            const existingUser = await User.findOne({ userid });
            if (existingUser) {
                return res.status(400).json({ 
                    success: false,
                    message: 'User ID already exists' 
                });
            }

            const subadmin = new User({
                userid,
                password,
                name,
                email,
                role: 'subadmin',
                permissions: permissions || User.getDefaultPermissions('subadmin'),
                restrictions: restrictions || {
                    maxLoanAmount: 50000,
                    canApproveLoans: true,
                    canDeleteCustomers: false,
                    canGenerateReports: true,
                    workingHours: {
                        start: '09:00',
                        end: '17:00'
                    }
                },
                profile: profile || {},
                createdBy: req.user.id
            });

            await subadmin.save();

            // Create notification message
            await createMessage({
                type: 'system_alert',
                userId: subadmin._id,
                title: 'SubAdmin Account Created',
                message: `Your SubAdmin account has been created by ${req.user.name}`,
                priority: 'high'
            });

            res.status(201).json({ 
                success: true,
                message: 'SubAdmin created successfully', 
                subadmin: {
                    id: subadmin._id,
                    userid: subadmin.userid,
                    name: subadmin.name,
                    role: subadmin.role,
                    permissions: subadmin.permissions,
                    restrictions: subadmin.restrictions,
                    isActive: subadmin.isActive
                }
            });
        } catch (error) {
            console.error('Create subadmin error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error creating subadmin' 
            });
        }
    },

    // Update subadmin
    updateSubAdmin: async (req, res) => {
        try {
            const { name, email, permissions, restrictions, profile, isActive } = req.body;
            
            const subadmin = await User.findOne({ _id: req.params.id, role: 'subadmin' });
            if (!subadmin) {
                return res.status(404).json({ 
                    success: false,
                    message: 'SubAdmin not found' 
                });
            }

            // Update fields
            if (name) subadmin.name = name;
            if (email) subadmin.email = email;
            if (permissions) subadmin.permissions = permissions;
            if (restrictions) subadmin.restrictions = { ...subadmin.restrictions, ...restrictions };
            if (profile) subadmin.profile = { ...subadmin.profile, ...profile };
            if (isActive !== undefined) subadmin.isActive = isActive;

            subadmin.updatedAt = new Date();
            await subadmin.save();

            res.json({ 
                success: true,
                message: 'SubAdmin updated successfully', 
                subadmin: {
                    id: subadmin._id,
                    userid: subadmin.userid,
                    name: subadmin.name,
                    permissions: subadmin.permissions,
                    restrictions: subadmin.restrictions,
                    isActive: subadmin.isActive
                }
            });
        } catch (error) {
            console.error('Update subadmin error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error updating subadmin' 
            });
        }
    },

    // Delete subadmin
    deleteSubAdmin: async (req, res) => {
        try {
            const subadmin = await User.findOne({ _id: req.params.id, role: 'subadmin' });
            if (!subadmin) {
                return res.status(404).json({ 
                    success: false,
                    message: 'SubAdmin not found' 
                });
            }

            // Deactivate instead of delete
            subadmin.isActive = false;
            subadmin.updatedAt = new Date();
            await subadmin.save();

            res.json({ 
                success: true,
                message: 'SubAdmin deactivated successfully' 
            });
        } catch (error) {
            console.error('Delete subadmin error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error deleting subadmin' 
            });
        }
    },

    // Update user permissions
    updateUserPermissions: async (req, res) => {
        try {
            const { permissions } = req.body;
            
            const user = await User.findById(req.params.id);
            if (!user) {
                return res.status(404).json({ 
                    success: false,
                    message: 'User not found' 
                });
            }

            user.permissions = permissions;
            user.updatedAt = new Date();
            await user.save();

            res.json({ 
                success: true,
                message: 'User permissions updated successfully' 
            });
        } catch (error) {
            console.error('Update user permissions error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error updating permissions' 
            });
        }
    },

    // Update user restrictions
    updateUserRestrictions: async (req, res) => {
        try {
            const { restrictions } = req.body;
            
            const user = await User.findById(req.params.id);
            if (!user) {
                return res.status(404).json({ 
                    success: false,
                    message: 'User not found' 
                });
            }

            user.restrictions = { ...user.restrictions, ...restrictions };
            user.updatedAt = new Date();
            await user.save();

            res.json({ 
                success: true,
                message: 'User restrictions updated successfully' 
            });
        } catch (error) {
            console.error('Update user restrictions error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error updating restrictions' 
            });
        }
    },

    // Activate user
    activateUser: async (req, res) => {
        try {
            const user = await User.findById(req.params.id);
            if (!user) {
                return res.status(404).json({ 
                    success: false,
                    message: 'User not found' 
                });
            }

            user.isActive = true;
            user.updatedAt = new Date();
            await user.save();

            res.json({ 
                success: true,
                message: 'User activated successfully' 
            });
        } catch (error) {
            console.error('Activate user error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error activating user' 
            });
        }
    },

    // Deactivate user
    deactivateUser: async (req, res) => {
        try {
            const user = await User.findById(req.params.id);
            if (!user) {
                return res.status(404).json({ 
                    success: false,
                    message: 'User not found' 
                });
            }

            // Prevent admin from deactivating themselves
            if (req.user.id === req.params.id) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Cannot deactivate your own account' 
                });
            }

            user.isActive = false;
            user.updatedAt = new Date();
            await user.save();

            res.json({ 
                success: true,
                message: 'User deactivated successfully' 
            });
        } catch (error) {
            console.error('Deactivate user error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error deactivating user' 
            });
        }
    },

    // Get system statistics
    getSystemStats: async (req, res) => {
        try {
            const totalUsers = await User.countDocuments();
            const activeUsers = await User.countDocuments({ isActive: true });
            const totalCustomers = await Customer.countDocuments({ isActive: true });
            const totalLoans = await Loan.countDocuments();
            const totalPayments = await Payment.countDocuments({ status: 'Completed' });

            const usersByRole = await User.aggregate([
                { $group: { _id: '$role', count: { $sum: 1 } } }
            ]);

            const loansByStatus = await Loan.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]);

            res.json({
                success: true,
                stats: {
                    totalUsers,
                    activeUsers,
                    totalCustomers,
                    totalLoans,
                    totalPayments,
                    usersByRole,
                    loansByStatus
                }
            });
        } catch (error) {
            console.error('Get system stats error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting system stats' 
            });
        }
    },

    // Get activity log
    getActivityLog: async (req, res) => {
        try {
            const { page = 1, limit = 50 } = req.query;
            
            // This is a simplified version - in a real system, you'd have an audit log
            const recentCustomers = await Customer.find()
                .populate('createdBy', 'name userid')
                .sort({ createdAt: -1 })
                .limit(20);

            const recentLoans = await Loan.find()
                .populate('createdBy', 'name userid')
                .sort({ createdAt: -1 })
                .limit(20);

            const recentPayments = await Payment.find()
                .populate('recordedBy', 'name userid')
                .sort({ createdAt: -1 })
                .limit(20);

            const activities = [
                ...recentCustomers.map(c => ({
                    type: 'customer_created',
                    description: `Customer ${c.fullName} created`,
                    user: c.createdBy,
                    timestamp: c.createdAt
                })),
                ...recentLoans.map(l => ({
                    type: 'loan_created',
                    description: `Loan of ${l.loanAmount} created for ${l.customerName}`,
                    user: l.createdBy,
                    timestamp: l.createdAt
                })),
                ...recentPayments.map(p => ({
                    type: 'payment_recorded',
                    description: `Payment of ${p.paymentAmount} recorded for ${p.customerName}`,
                    user: p.recordedBy,
                    timestamp: p.createdAt
                }))
            ].sort((a, b) => b.timestamp - a.timestamp);

            res.json({
                success: true,
                activities: activities.slice(0, limit)
            });
        } catch (error) {
            console.error('Get activity log error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting activity log' 
            });
        }
    },

    // Get user sessions
    getUserSessions: async (req, res) => {
        try {
            const users = await User.find({ isActive: true })
                .select('userid name role lastLogin')
                .sort({ lastLogin: -1 });

            res.json({
                success: true,
                sessions: users.map(user => ({
                    id: user._id,
                    userid: user.userid,
                    name: user.name,
                    role: user.role,
                    lastLogin: user.lastLogin,
                    status: user.lastLogin && 
                           (Date.now() - user.lastLogin.getTime()) < 24 * 60 * 60 * 1000 
                           ? 'Active' : 'Inactive'
                }))
            });
        } catch (error) {
            console.error('Get user sessions error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting user sessions' 
            });
        }
    },

    // Bulk create users
    bulkCreateUsers: async (req, res) => {
        try {
            const { users } = req.body;
            
            if (!Array.isArray(users) || users.length === 0) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Users array is required' 
                });
            }

            const createdUsers = [];
            const errors = [];

            for (const userData of users) {
                try {
                    const existingUser = await User.findOne({ userid: userData.userid });
                    if (existingUser) {
                        errors.push(`User ${userData.userid} already exists`);
                        continue;
                    }

                    const user = new User({
                        ...userData,
                        createdBy: req.user.id
                    });

                    await user.save();
                    createdUsers.push(user);
                } catch (error) {
                    errors.push(`Error creating user ${userData.userid}: ${error.message}`);
                }
            }

            res.json({
                success: true,
                message: `Created ${createdUsers.length} users`,
                created: createdUsers.length,
                errors
            });
        } catch (error) {
            console.error('Bulk create users error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error bulk creating users' 
            });
        }
    },

    // Additional methods for bulk operations, system config, etc.
    bulkUpdateUsers: async (req, res) => {
        try {
            const { userIds, updates } = req.body;
            
            const result = await User.updateMany(
                { _id: { $in: userIds } },
                { $set: updates }
            );

            res.json({
                success: true,
                message: `Updated ${result.modifiedCount} users`,
                modified: result.modifiedCount
            });
        } catch (error) {
            console.error('Bulk update users error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error bulk updating users' 
            });
        }
    },

    bulkDeleteUsers: async (req, res) => {
        try {
            const { userIds } = req.body;
            
            // Deactivate instead of delete
            const result = await User.updateMany(
                { _id: { $in: userIds } },
                { $set: { isActive: false } }
            );

            res.json({
                success: true,
                message: `Deactivated ${result.modifiedCount} users`,
                modified: result.modifiedCount
            });
        } catch (error) {
            console.error('Bulk delete users error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error bulk deleting users' 
            });
        }
    },

    getSystemConfig: async (req, res) => {
        try {
            // In a real system, this would come from a config collection
            const config = {
                maxLoanAmount: 100000,
                defaultInterestRate: 10,
                maxLoanPeriod: 12,
                workingHours: {
                    start: '09:00',
                    end: '17:00'
                },
                paymentMethods: ['Cash', 'Mobile Money', 'Bank Transfer'],
                reportFormats: ['pdf', 'excel'],
                systemSettings: {
                    autoUpdateLoanStatus: true,
                    sendNotifications: true,
                    requireApproval: false
                }
            };

            res.json({
                success: true,
                config
            });
        } catch (error) {
            console.error('Get system config error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting system config' 
            });
        }
    },

    updateSystemConfig: async (req, res) => {
        try {
            const { config } = req.body;
            
            // In a real system, this would update a config collection
            res.json({
                success: true,
                message: 'System configuration updated successfully',
                config
            });
        } catch (error) {
            console.error('Update system config error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error updating system config' 
            });
        }
    }
};

module.exports = adminController;