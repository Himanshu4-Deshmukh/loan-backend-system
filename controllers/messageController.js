const Message = require('../models/Message');
const Customer = require('../models/Customer');
const Loan = require('../models/Loan');

const messageController = {
    // Get all messages
    getAllMessages: async (req, res) => {
        try {
            const { page = 1, limit = 20, type, priority, isRead } = req.query;
            const filter = {};
            
            if (type) filter.type = type;
            if (priority) filter.priority = priority;
            if (isRead !== undefined) filter.isRead = isRead === 'true';

            const messages = await Message.find(filter)
                .populate('customerId', 'fullName phoneNumber')
                .populate('loanId', 'loanAmount loanType')
                .populate('userId', 'name userid')
                .populate('createdBy', 'name userid')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await Message.countDocuments(filter);

            res.json({
                success: true,
                messages,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error('Get all messages error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting messages' 
            });
        }
    },

    // Get message by ID
    getMessageById: async (req, res) => {
        try {
            const message = await Message.findById(req.params.id)
                .populate('customerId', 'fullName phoneNumber')
                .populate('loanId', 'loanAmount loanType')
                .populate('userId', 'name userid')
                .populate('createdBy', 'name userid');

            if (!message) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Message not found' 
                });
            }

            res.json({
                success: true,
                message
            });
        } catch (error) {
            console.error('Get message by ID error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting message' 
            });
        }
    },

    // Create message
    createMessage: async (req, res) => {
        try {
            const messageData = {
                ...req.body,
                createdBy: req.user.id,
                isSystemGenerated: false
            };

            const message = new Message(messageData);
            await message.save();

            res.status(201).json({ 
                success: true,
                message: 'Message created successfully', 
                data: message 
            });
        } catch (error) {
            console.error('Create message error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error creating message' 
            });
        }
    },

    // Update message
    updateMessage: async (req, res) => {
        try {
            const message = await Message.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true, runValidators: true }
            );

            if (!message) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Message not found' 
                });
            }

            res.json({ 
                success: true,
                message: 'Message updated successfully', 
                data: message 
            });
        } catch (error) {
            console.error('Update message error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error updating message' 
            });
        }
    },

    // Delete message
    deleteMessage: async (req, res) => {
        try {
            const message = await Message.findByIdAndDelete(req.params.id);

            if (!message) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Message not found' 
                });
            }

            res.json({ 
                success: true,
                message: 'Message deleted successfully' 
            });
        } catch (error) {
            console.error('Delete message error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error deleting message' 
            });
        }
    },

    // Mark message as read
    markAsRead: async (req, res) => {
        try {
            const message = await Message.findById(req.params.id);
            
            if (!message) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Message not found' 
                });
            }

            await message.markAsRead(req.user.id);

            res.json({ 
                success: true,
                message: 'Message marked as read' 
            });
        } catch (error) {
            console.error('Mark as read error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error marking message as read' 
            });
        }
    },

    // Mark message as unread
    markAsUnread: async (req, res) => {
        try {
            const message = await Message.findByIdAndUpdate(
                req.params.id,
                { 
                    isRead: false,
                    $pull: { readBy: { userId: req.user.id } }
                },
                { new: true }
            );

            if (!message) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Message not found' 
                });
            }

            res.json({ 
                success: true,
                message: 'Message marked as unread' 
            });
        } catch (error) {
            console.error('Mark as unread error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error marking message as unread' 
            });
        }
    },

    // Bulk mark as read
    bulkMarkAsRead: async (req, res) => {
        try {
            const { messageIds } = req.body;
            
            if (!Array.isArray(messageIds) || messageIds.length === 0) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Message IDs array is required' 
                });
            }

            const result = await Message.updateMany(
                { _id: { $in: messageIds } },
                { 
                    isRead: true,
                    $addToSet: { readBy: { userId: req.user.id, readAt: new Date() } }
                }
            );

            res.json({
                success: true,
                message: `Marked ${result.modifiedCount} messages as read`,
                modified: result.modifiedCount
            });
        } catch (error) {
            console.error('Bulk mark as read error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error bulk marking messages as read' 
            });
        }
    },

    // Bulk delete messages
    bulkDeleteMessages: async (req, res) => {
        try {
            const { messageIds } = req.body;
            
            if (!Array.isArray(messageIds) || messageIds.length === 0) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Message IDs array is required' 
                });
            }

            const result = await Message.deleteMany({ _id: { $in: messageIds } });

            res.json({
                success: true,
                message: `Deleted ${result.deletedCount} messages`,
                deleted: result.deletedCount
            });
        } catch (error) {
            console.error('Bulk delete messages error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error bulk deleting messages' 
            });
        }
    },

    // Get unread messages
    getUnreadMessages: async (req, res) => {
        try {
            const { limit = 20 } = req.query;
            
            const messages = await Message.find({ isRead: false })
                .populate('customerId', 'fullName phoneNumber')
                .populate('loanId', 'loanAmount loanType')
                .populate('userId', 'name userid')
                .sort({ createdAt: -1 })
                .limit(parseInt(limit));

            const count = await Message.countDocuments({ isRead: false });

            res.json({
                success: true,
                messages,
                count
            });
        } catch (error) {
            console.error('Get unread messages error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting unread messages' 
            });
        }
    },

    // Get messages by type
    getMessagesByType: async (req, res) => {
        try {
            const { type } = req.params;
            const { limit = 50 } = req.query;
            
            const messages = await Message.find({ type })
                .populate('customerId', 'fullName phoneNumber')
                .populate('loanId', 'loanAmount loanType')
                .populate('userId', 'name userid')
                .sort({ createdAt: -1 })
                .limit(parseInt(limit));

            res.json({
                success: true,
                messages
            });
        } catch (error) {
            console.error('Get messages by type error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting messages by type' 
            });
        }
    },

    // Get messages by priority
    getMessagesByPriority: async (req, res) => {
        try {
            const { priority } = req.params;
            const { limit = 50 } = req.query;
            
            const messages = await Message.find({ priority })
                .populate('customerId', 'fullName phoneNumber')
                .populate('loanId', 'loanAmount loanType')
                .populate('userId', 'name userid')
                .sort({ createdAt: -1 })
                .limit(parseInt(limit));

            res.json({
                success: true,
                messages
            });
        } catch (error) {
            console.error('Get messages by priority error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting messages by priority' 
            });
        }
    },

    // Get message statistics
    getMessageStats: async (req, res) => {
        try {
            const totalMessages = await Message.countDocuments();
            const unreadMessages = await Message.countDocuments({ isRead: false });
            const highPriorityMessages = await Message.countDocuments({ 
                priority: { $in: ['high', 'urgent'] },
                isRead: false 
            });

            const messagesByType = await Message.aggregate([
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 },
                        unread: {
                            $sum: {
                                $cond: [{ $eq: ['$isRead', false] }, 1, 0]
                            }
                        }
                    }
                }
            ]);

            const messagesByPriority = await Message.aggregate([
                {
                    $group: {
                        _id: '$priority',
                        count: { $sum: 1 },
                        unread: {
                            $sum: {
                                $cond: [{ $eq: ['$isRead', false] }, 1, 0]
                            }
                        }
                    }
                }
            ]);

            const todayMessages = await Message.countDocuments({
                createdAt: {
                    $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    $lt: new Date(new Date().setHours(23, 59, 59, 999))
                }
            });

            res.json({
                success: true,
                stats: {
                    totalMessages,
                    unreadMessages,
                    highPriorityMessages,
                    todayMessages,
                    messagesByType,
                    messagesByPriority
                }
            });
        } catch (error) {
            console.error('Get message stats error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting message stats' 
            });
        }
    },

    // Get message type statistics
    getMessageTypeStats: async (req, res) => {
        try {
            const typeStats = await Message.aggregate([
                {
                    $group: {
                        _id: '$type',
                        total: { $sum: 1 },
                        unread: {
                            $sum: {
                                $cond: [{ $eq: ['$isRead', false] }, 1, 0]
                            }
                        },
                        highPriority: {
                            $sum: {
                                $cond: [
                                    { $in: ['$priority', ['high', 'urgent']] },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]);

            const dailyStats = await Message.aggregate([
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' },
                            day: { $dayOfMonth: '$createdAt' }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
                { $limit: 30 }
            ]);

            res.json({
                success: true,
                typeStats,
                dailyStats: dailyStats.reverse()
            });
        } catch (error) {
            console.error('Get message type stats error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting message type stats' 
            });
        }
    }
};

module.exports = messageController;