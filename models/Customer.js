import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
    // Personal Details
    fullName: { 
        type: String, 
        required: true,
        trim: true,
        index: true
    },
    nrcNumber: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        uppercase: true,
        index: true
    },
    phoneNumber: { 
        type: String, 
        required: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        sparse: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    address: { 
        type: String, 
        required: true,
        trim: true
    },
    maritalStatus: { 
        type: String, 
        enum: ['Single', 'Married', 'Divorced', 'Widowed'],
        default: 'Single'
    },
    city: { 
        type: String, 
        required: true,
        trim: true
    },
    dateOfBirth: { 
        type: Date, 
        required: true 
    },
    age: { 
        type: Number, 
        required: true,
        min: 18,
        max: 100
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: true
    },
    
    // Employment Details
    companyName: { 
        type: String,
        trim: true
    },
    employeeNumber: { 
        type: String,
        trim: true
    },
    employmentStatus: { 
        type: String, 
        enum: ['Employed', 'Self-employed', 'Unemployed', 'Retired', 'Student'],
        default: 'Employed'
    },
    jobTitle: {
        type: String,
        trim: true
    },
    monthlyIncome: {
        type: Number,
        min: 0
    },
    contractEndDate: { 
        type: Date 
    },
    
    // Bank Details
    bankName: { 
        type: String,
        trim: true
    },
    accountType: { 
        type: String, 
        enum: ['Savings', 'Current', 'Fixed Deposit'],
        default: 'Savings'
    },
    accountNumber: { 
        type: String,
        trim: true
    },
    tpinNumber: { 
        type: String,
        trim: true
    },
    bankSortCode: { 
        type: String,
        trim: true
    },
    
    // Next of Kin
    nextOfKin: { 
        type: String,
        trim: true
    },
    relationship: { 
        type: String,
        trim: true
    },
    nextOfKinPhone: { 
        type: String,
        trim: true
    },
    nextOfKinAddress: {
        type: String,
        trim: true
    },
    
    // Additional Info
    loanType: { 
        type: String, 
        enum: ['Personal', 'Business', 'Emergency', 'Education', 'Medical'],
        default: 'Personal'
    },
    applicantAttachment: { 
        type: String 
    },
    additionalNotes: { 
        type: String,
        trim: true
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
    isActive: { 
        type: Boolean, 
        default: true 
    },
    
    // Credit Score and Risk Assessment
    creditScore: {
        type: Number,
        min: 300,
        max: 850,
        default: 650
    },
    riskLevel: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        default: 'Medium'
    }
});

// Indexes for better performance
customerSchema.index({ fullName: 'text', nrcNumber: 'text' });
customerSchema.index({ createdAt: -1 });
customerSchema.index({ isActive: 1 });

// Pre-save middleware to update timestamps
customerSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual for full contact info
customerSchema.virtual('contactInfo').get(function() {
    return {
        phone: this.phoneNumber,
        email: this.email,
        address: this.address,
        city: this.city
    };
});

// Method to calculate age from DOB
customerSchema.methods.calculateAge = function() {
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
};

// Method to get customer summary
customerSchema.methods.getSummary = function() {
    return {
        id: this._id,
        fullName: this.fullName,
        nrcNumber: this.nrcNumber,
        phoneNumber: this.phoneNumber,
        city: this.city,
        employmentStatus: this.employmentStatus,
        riskLevel: this.riskLevel,
        isActive: this.isActive
    };
};

export default mongoose.model('Customer', customerSchema);