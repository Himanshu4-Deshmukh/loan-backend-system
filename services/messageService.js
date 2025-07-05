import Message from '../models/Message.js';

// Create a new message
const createMessage = async (messageData) => {
    try {
        const message = new Message(messageData);
        await message.save();
        return message;
    } catch (error) {
        console.error('Error creating message:', error);
        throw error;
    }
};

// Create system alert
const createSystemAlert = async (title, message, priority = 'medium') => {
    try {
        return await createMessage({
            type: 'system_alert',
            title,
            message,
            priority
        });
    } catch (error) {
        console.error('Error creating system alert:', error);
        throw error;
    }
};

// Create overdue notification
const createOverdueNotification = async (customerId, loanId, customerName, amount) => {
    try {
        return await createMessage({
            type: 'overdue',
            customerId,
            loanId,
            title: 'Loan Overdue',
            message: `Loan for ${customerName} is overdue. Amount due: K${amount}`,
            priority: 'high',
            actionRequired: true
        });
    } catch (error) {
        console.error('Error creating overdue notification:', error);
        throw error;
    }
};

// Create payment reminder
const createPaymentReminder = async (customerId, loanId, customerName, amount, dueDate) => {
    try {
        return await createMessage({
            type: 'payment_reminder',
            customerId,
            loanId,
            title: 'Payment Reminder',
            message: `Payment for ${customerName} is due on ${dueDate.toDateString()}. Amount: K${amount}`,
            priority: 'medium',
            actionRequired: true
        });
    } catch (error) {
        console.error('Error creating payment reminder:', error);
        throw error;
    }
};

// Create loan completion notification
const createLoanCompletionNotification = async (customerId, loanId, customerName) => {
    try {
        return await createMessage({
            type: 'loan_completed',
            customerId,
            loanId,
            title: 'Loan Completed',
            message: `Loan for ${customerName} has been fully paid and completed`,
            priority: 'low'
        });
    } catch (error) {
        console.error('Error creating loan completion notification:', error);
        throw error;
    }
};

// Create new customer notification
const createNewCustomerNotification = async (customerId, customerName) => {
    try {
        return await createMessage({
            type: 'new_customer',
            customerId,
            title: 'New Customer Added',
            message: `New customer ${customerName} has been added to the system`,
            priority: 'low'
        });
    } catch (error) {
        console.error('Error creating new customer notification:', error);
        throw error;
    }
};

// Get unread messages count
const getUnreadMessagesCount = async (userId = null) => {
    try {
        const filter = { isRead: false };
        if (userId) {
            filter.userId = userId;
        }
        
        return await Message.countDocuments(filter);
    } catch (error) {
        console.error('Error getting unread messages count:', error);
        throw error;
    }
};

// Mark messages as read
const markMessagesAsRead = async (messageIds, userId = null) => {
    try {
        const filter = { _id: { $in: messageIds } };
        if (userId) {
            filter.userId = userId;
        }
        
        const result = await Message.updateMany(filter, { 
            isRead: true,
            $push: { readBy: { userId, readAt: new Date() } }
        });
        
        return result;
    } catch (error) {
        console.error('Error marking messages as read:', error);
        throw error;
    }
};

// Get messages by type
const getMessagesByType = async (type, limit = 50) => {
    try {
        return await Message.find({ type })
            .populate('customerId', 'fullName phoneNumber')
            .populate('loanId', 'loanAmount loanType')
            .sort({ createdAt: -1 })
            .limit(limit);
    } catch (error) {
        console.error('Error getting messages by type:', error);
        throw error;
    }
};

// Get messages by priority
const getMessagesByPriority = async (priority, limit = 50) => {
    try {
        return await Message.find({ priority })
            .populate('customerId', 'fullName phoneNumber')
            .populate('loanId', 'loanAmount loanType')
            .sort({ createdAt: -1 })
            .limit(limit);
    } catch (error) {
        console.error('Error getting messages by priority:', error);
        throw error;
    }
};

// Clean up old messages
const cleanupOldMessages = async (daysOld = 30) => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        
        const result = await Message.deleteMany({
            createdAt: { $lt: cutoffDate },
            priority: 'low',
            isRead: true
        });
        
        console.log(`Cleaned up ${result.deletedCount} old messages`);
        return result;
    } catch (error) {
        console.error('Error cleaning up old messages:', error);
        throw error;
    }
};

export {
    createMessage,
    createSystemAlert,
    createOverdueNotification,
    createPaymentReminder,
    createLoanCompletionNotification,
    createNewCustomerNotification,
    getUnreadMessagesCount,
    markMessagesAsRead,
    getMessagesByType,
    getMessagesByPriority,
    cleanupOldMessages
};