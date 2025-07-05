import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    userid: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true
    },
    password: { 
        type: String, 
        required: true,
        minlength: 6
    },
    name: { 
        type: String, 
        required: true,
        trim: true
    },
    email: {
        type: String,
        sparse: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    role: { 
        type: String, 
        enum: ['admin', 'subadmin', 'user', 'viewer'], 
        default: 'user' 
    },
    permissions: [{
        type: String,
        enum: [
            'read_customers', 'write_customers', 'delete_customers',
            'read_loans', 'write_loans', 'delete_loans',
            'read_payments', 'write_payments', 'reverse_payments',
            'read_reports', 'generate_reports',
            'read_users', 'write_users', 'delete_users',
            'admin_access', 'subadmin_access'
        ]
    }],
    restrictions: {
        maxLoanAmount: { type: Number, default: null },
        canApproveLoans: { type: Boolean, default: true },
        canDeleteCustomers: { type: Boolean, default: true },
        canGenerateReports: { type: Boolean, default: true },
        workingHours: {
            start: { type: String, default: '09:00' },
            end: { type: String, default: '17:00' }
        }
    },
    profile: {
        phoneNumber: { type: String, trim: true },
        address: { type: String, trim: true },
        department: { type: String, trim: true },
        employeeId: { type: String, trim: true }
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastLogin: { type: Date },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date }
});

// Index for better performance
userSchema.index({ userid: 1, isActive: 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdBy: 1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }
    
    const updates = { $inc: { loginAttempts: 1 } };
    
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
    }
    
    return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 }
    });
};

// Static method to get default permissions by role
userSchema.statics.getDefaultPermissions = function(role) {
    const permissions = {
        admin: [
            'read_customers', 'write_customers', 'delete_customers',
            'read_loans', 'write_loans', 'delete_loans',
            'read_payments', 'write_payments', 'reverse_payments',
            'read_reports', 'generate_reports',
            'read_users', 'write_users', 'delete_users',
            'admin_access'
        ],
        subadmin: [
            'read_customers', 'write_customers',
            'read_loans', 'write_loans',
            'read_payments', 'write_payments',
            'read_reports', 'generate_reports',
            'subadmin_access'
        ],
        user: [
            'read_customers', 'write_customers',
            'read_loans', 'write_loans',
            'read_payments', 'write_payments'
        ],
        viewer: [
            'read_customers', 'read_loans', 'read_payments', 'read_reports'
        ]
    };
    
    return permissions[role] || permissions.user;
};

export default mongoose.model('User', userSchema);