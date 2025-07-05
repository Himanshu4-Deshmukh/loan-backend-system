import mongoose from 'mongoose';

const loanSchema = new mongoose.Schema({
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
    customerNRC: { 
        type: String, 
        required: true,
        trim: true,
        uppercase: true
    },
    loanAmount: { 
        type: Number, 
        required: true,
        min: 0
    },
    loanPeriod: { 
        type: String, 
        enum: ['1 Month', '2 Months', '3 Months', '6 Months', '12 Months'], 
        required: true 
    },
    loanType: { 
        type: String, 
        required: true,
        enum: ['Personal', 'Business', 'Emergency', 'Education', 'Medical']
    },
    interestRate: { 
        type: Number, 
        default: 10,
        min: 0,
        max: 50
    },
    totalAmount: { 
        type: Number,
        min: 0
    },
    monthlyPayment: { 
        type: Number,
        min: 0
    },
    remainingBalance: { 
        type: Number,
        min: 0
    },
    status: { 
        type: String, 
        enum: ['Not Paid', 'Active', 'Completed', 'Overdue', 'Defaulted', 'Cancelled'], 
        default: 'Not Paid',
        index: true
    },
    startDate: { 
        type: Date, 
        default: Date.now 
    },
    endDate: { 
        type: Date 
    },
    dueDate: { 
        type: Date,
        index: true
    },
    lastPaymentDate: { 
        type: Date 
    },
    
    // Reloan functionality
    isReloan: { 
        type: Boolean, 
        default: false 
    },
    parentLoanId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Loan' 
    },
    
    // Approval and tracking
    approvedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    approvedAt: { 
        type: Date 
    },
    approvalStatus: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Approved'
    },
    rejectionReason: {
        type: String,
        trim: true
    },
    
    // Payment tracking
    totalPaid: {
        type: Number,
        default: 0,
        min: 0
    },
    paymentCount: {
        type: Number,
        default: 0,
        min: 0
    },
    
    // System fields
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    updatedBy: { 
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
    purpose: {
        type: String,
        trim: true
    },
    collateral: {
        type: String,
        trim: true
    },
    notes: {
        type: String,
        trim: true
    }
});

// Indexes for better performance
loanSchema.index({ customerId: 1, status: 1 });
loanSchema.index({ dueDate: 1, status: 1 });
loanSchema.index({ createdAt: -1 });
loanSchema.index({ customerNRC: 1 });

// Pre-save middleware to update timestamps
loanSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual for days overdue
loanSchema.virtual('daysOverdue').get(function() {
    if (this.status !== 'Overdue') return 0;
    const today = new Date();
    const dueDate = new Date(this.dueDate);
    const diffTime = today - dueDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
});

// Virtual for completion percentage
loanSchema.virtual('completionPercentage').get(function() {
    if (this.totalAmount === 0) return 0;
    const paidAmount = this.totalAmount - this.remainingBalance;
    return Math.round((paidAmount / this.totalAmount) * 100);
});

// Method to calculate loan details
loanSchema.methods.calculateLoanDetails = function() {
    const months = parseInt(this.loanPeriod.split(' ')[0]);
    const interest = (this.loanAmount * this.interestRate * months) / 100;
    const totalAmount = this.loanAmount + interest;
    const monthlyPayment = totalAmount / months;
    
    return {
        totalAmount: Math.round(totalAmount * 100) / 100,
        monthlyPayment: Math.round(monthlyPayment * 100) / 100,
        remainingBalance: Math.round(totalAmount * 100) / 100,
        endDate: new Date(Date.now() + (months * 30 * 24 * 60 * 60 * 1000)),
        dueDate: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000))
    };
};

// Method to check if loan is overdue
loanSchema.methods.isOverdue = function() {
    const today = new Date();
    const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dueDate = new Date(this.dueDate);
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    
    return currentDate > dueDateOnly && this.remainingBalance > 0;
};

// Method to get loan summary
loanSchema.methods.getSummary = function() {
    return {
        id: this._id,
        customerName: this.customerName,
        customerNRC: this.customerNRC,
        loanAmount: this.loanAmount,
        remainingBalance: this.remainingBalance,
        status: this.status,
        dueDate: this.dueDate,
        completionPercentage: this.completionPercentage,
        isOverdue: this.isOverdue(),
        daysOverdue: this.daysOverdue
    };
};

export default mongoose.model('Loan', loanSchema);