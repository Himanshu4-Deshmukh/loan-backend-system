const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    type: { 
        type: String, 
        enum: ['overdue', 'payment_reminder', 'new_customer', 'loan_completed', 'loan_approved', 'loan_rejected', 'system_alert'], 
        required: true,
        index: true
    },
    customerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Customer',
        index: true
    },
    loanId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Loan' 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    title: { 
        type: String, 
        required: true,
        trim: true
    },
    message: { 
        type: String, 
        required: true,
        trim: true
    },
    priority: { 
        type: String, 
        enum: ['low', 'medium', 'high', 'urgent'], 
        default: 'medium',
        index: true
    },
    isRead: { 
        type: Boolean, 
        default: false,
        index: true
    },
    readBy: [{ 
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now }
    }],
    
    // Auto-generated flags
    isSystemGenerated: {
        type: Boolean,
        default: true
    },
    
    // Action tracking
    actionRequired: {
        type: Boolean,
        default: false
    },
    actionTaken: {
        type: Boolean,
        default: false
    },
    actionTakenBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    actionTakenAt: {
        type: Date
    },
    
    // Additional data
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // System fields
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    },
    
    // Expiry for automatic cleanup
    expiresAt: {
        type: Date,
        index: { expireAfterSeconds: 0 }
    }
});

// Indexes for better performance
messageSchema.index({ createdAt: -1 });
messageSchema.index({ isRead: 1, priority: 1 });
messageSchema.index({ type: 1, createdAt: -1 });

// Pre-save middleware to update timestamps
messageSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    
    // Set expiry for low priority messages (30 days)
    if (this.priority === 'low' && !this.expiresAt) {
        this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
    
    next();
});

// Method to mark as read by user
messageSchema.methods.markAsRead = function(userId) {
    if (!this.readBy.some(read => read.userId.toString() === userId.toString())) {
        this.readBy.push({ userId, readAt: new Date() });
    }
    this.isRead = true;
    return this.save();
};

// Method to get message summary
messageSchema.methods.getSummary = function() {
    return {
        id: this._id,
        type: this.type,
        title: this.title,
        priority: this.priority,
        isRead: this.isRead,
        createdAt: this.createdAt,
        actionRequired: this.actionRequired
    };
};

module.exports = mongoose.model('Message', messageSchema);