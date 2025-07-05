import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
    loanId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Loan', 
        required: true,
        index: true
    },
    customerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Customer', 
        required: true,
        index: true
    },
    customerName: { 
        type: String, 
        required: true,
        trim: true
    },
    paymentAmount: { 
        type: Number, 
        required: true,
        min: 0
    },
    paymentDate: { 
        type: Date, 
        default: Date.now,
        index: true
    },
    paymentMethod: { 
        type: String, 
        enum: ['Cash', 'Mobile Money', 'Bank Transfer', 'Account Transfer', 'Cheque', 'Online'], 
        default: 'Cash' 
    },
    status: { 
        type: String, 
        enum: ['Completed', 'Reversed', 'Pending', 'Failed'], 
        default: 'Completed',
        index: true
    },
    
    // Reversal information
    reversalReason: { 
        type: String,
        trim: true
    },
    reversedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    reversedAt: { 
        type: Date 
    },
    
    // Balance tracking
    balanceAfterPayment: { 
        type: Number,
        min: 0
    },
    balanceBeforePayment: {
        type: Number,
        min: 0
    },
    
    // Transaction details
    transactionId: {
        type: String,
        trim: true,
        sparse: true
    },
    reference: {
        type: String,
        trim: true
    },
    receiptNumber: {
        type: String,
        trim: true
    },
    
    // Mobile Money details
    mobileMoneyDetails: {
        phoneNumber: { type: String, trim: true },
        provider: { type: String, enum: ['MTN', 'Airtel', 'Zamtel', 'Other'] },
        transactionId: { type: String, trim: true }
    },
    
    // Bank details
    bankDetails: {
        bankName: { type: String, trim: true },
        accountNumber: { type: String, trim: true },
        referenceNumber: { type: String, trim: true }
    },
    
    // System fields
    recordedBy: { 
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
    
    // Additional fields
    notes: {
        type: String,
        trim: true
    },
    isPartialPayment: {
        type: Boolean,
        default: false
    },
    paymentSequence: {
        type: Number,
        default: 1
    }
});

// Indexes for better performance
paymentSchema.index({ loanId: 1, paymentDate: -1 });
paymentSchema.index({ customerId: 1, paymentDate: -1 });
paymentSchema.index({ paymentDate: -1 });
paymentSchema.index({ status: 1 });

// Pre-save middleware to update timestamps
paymentSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Method to generate receipt number
paymentSchema.methods.generateReceiptNumber = function() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timestamp = date.getTime().toString().slice(-6);
    
    return `RCP-${year}${month}${day}-${timestamp}`;
};

// Method to get payment summary
paymentSchema.methods.getSummary = function() {
    return {
        id: this._id,
        customerName: this.customerName,
        paymentAmount: this.paymentAmount,
        paymentDate: this.paymentDate,
        paymentMethod: this.paymentMethod,
        status: this.status,
        balanceAfterPayment: this.balanceAfterPayment,
        receiptNumber: this.receiptNumber
    };
};

export default mongoose.model('Payment', paymentSchema);