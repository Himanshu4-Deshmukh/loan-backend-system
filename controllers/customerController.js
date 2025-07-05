const Customer = require('../models/Customer');
const Loan = require('../models/Loan');
const Payment = require('../models/Payment');
const { createMessage } = require('../services/messageService');

const customerController = {
    // Get all customers
    getAllCustomers: async (req, res) => {
        try {
            const { page = 1, limit = 10, search, status } = req.query;
            const filter = { isActive: true };
            
            if (search) {
                filter.$or = [
                    { fullName: { $regex: search, $options: 'i' } },
                    { nrcNumber: { $regex: search, $options: 'i' } },
                    { phoneNumber: { $regex: search, $options: 'i' } }
                ];
            }
            
            if (status) {
                filter.isActive = status === 'active';
            }

            const customers = await Customer.find(filter)
                .populate('createdBy', 'name userid')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await Customer.countDocuments(filter);

            res.json({
                success: true,
                customers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error('Get all customers error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting customers' 
            });
        }
    },

    // Get customer by ID
    getCustomerById: async (req, res) => {
        try {
            const customer = await Customer.findById(req.params.id)
                .populate('createdBy', 'name userid');

            if (!customer) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Customer not found' 
                });
            }

            res.json({
                success: true,
                customer
            });
        } catch (error) {
            console.error('Get customer by ID error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting customer' 
            });
        }
    },

    // Create customer
    createCustomer: async (req, res) => {
        try {
            const customerData = {
                ...req.body,
                createdBy: req.user.id
            };

            const customer = new Customer(customerData);
            await customer.save();

            // Create notification message
            await createMessage({
                type: 'new_customer',
                customerId: customer._id,
                title: 'New Customer Added',
                message: `New customer ${customer.fullName} has been added to the system`,
                priority: 'low'
            });

            res.status(201).json({ 
                success: true,
                message: 'Customer created successfully', 
                customer 
            });
        } catch (error) {
            console.error('Create customer error:', error);
            if (error.code === 11000) {
                res.status(400).json({ 
                    success: false,
                    message: 'NRC number already exists' 
                });
            } else {
                res.status(500).json({ 
                    success: false,
                    message: 'Server error creating customer' 
                });
            }
        }
    },

    // Update customer
    updateCustomer: async (req, res) => {
        try {
            const customer = await Customer.findByIdAndUpdate(
                req.params.id,
                { ...req.body, updatedBy: req.user.id },
                { new: true, runValidators: true }
            );

            if (!customer) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Customer not found' 
                });
            }

            res.json({ 
                success: true,
                message: 'Customer updated successfully', 
                customer 
            });
        } catch (error) {
            console.error('Update customer error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error updating customer' 
            });
        }
    },

    // Delete customer (soft delete)
    deleteCustomer: async (req, res) => {
        try {
            const customer = await Customer.findById(req.params.id);
            if (!customer) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Customer not found' 
                });
            }

            // Check if customer has active loans
            const activeLoans = await Loan.countDocuments({
                customerId: req.params.id,
                status: { $in: ['Active', 'Not Paid', 'Overdue'] }
            });

            if (activeLoans > 0) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Cannot delete customer with active loans' 
                });
            }

            customer.isActive = false;
            customer.updatedBy = req.user.id;
            await customer.save();

            res.json({ 
                success: true,
                message: 'Customer deleted successfully' 
            });
        } catch (error) {
            console.error('Delete customer error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error deleting customer' 
            });
        }
    },

    // Get customer loans
    getCustomerLoans: async (req, res) => {
        try {
            const loans = await Loan.find({ customerId: req.params.id })
                .sort({ createdAt: -1 });

            res.json({
                success: true,
                loans
            });
        } catch (error) {
            console.error('Get customer loans error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting customer loans' 
            });
        }
    },

    // Get customer payments
    getCustomerPayments: async (req, res) => {
        try {
            const payments = await Payment.find({ customerId: req.params.id })
                .populate('loanId', 'loanAmount loanType')
                .sort({ createdAt: -1 });

            res.json({
                success: true,
                payments
            });
        } catch (error) {
            console.error('Get customer payments error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting customer payments' 
            });
        }
    },

    // Get customer summary
    getCustomerSummary: async (req, res) => {
        try {
            const customer = await Customer.findById(req.params.id);
            if (!customer) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Customer not found' 
                });
            }

            const totalLoans = await Loan.countDocuments({ customerId: req.params.id });
            const activeLoans = await Loan.countDocuments({ 
                customerId: req.params.id, 
                status: { $in: ['Active', 'Not Paid', 'Overdue'] }
            });
            const completedLoans = await Loan.countDocuments({ 
                customerId: req.params.id, 
                status: 'Completed' 
            });

            const totalBorrowed = await Loan.aggregate([
                { $match: { customerId: customer._id } },
                { $group: { _id: null, total: { $sum: '$loanAmount' } } }
            ]);

            const totalPaid = await Payment.aggregate([
                { $match: { customerId: customer._id, status: 'Completed' } },
                { $group: { _id: null, total: { $sum: '$paymentAmount' } } }
            ]);

            const totalOutstanding = await Loan.aggregate([
                { $match: { customerId: customer._id, status: { $in: ['Active', 'Not Paid', 'Overdue'] } } },
                { $group: { _id: null, total: { $sum: '$remainingBalance' } } }
            ]);

            res.json({
                success: true,
                summary: {
                    customer,
                    totalLoans,
                    activeLoans,
                    completedLoans,
                    totalBorrowed: totalBorrowed.length > 0 ? totalBorrowed[0].total : 0,
                    totalPaid: totalPaid.length > 0 ? totalPaid[0].total : 0,
                    totalOutstanding: totalOutstanding.length > 0 ? totalOutstanding[0].total : 0
                }
            });
        } catch (error) {
            console.error('Get customer summary error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting customer summary' 
            });
        }
    },

    // Search customers
    searchCustomers: async (req, res) => {
        try {
            const { query } = req.params;
            const searchRegex = new RegExp(query, 'i');

            const customers = await Customer.find({
                $or: [
                    { fullName: searchRegex },
                    { nrcNumber: searchRegex },
                    { phoneNumber: searchRegex },
                    { email: searchRegex }
                ],
                isActive: true
            }).limit(20);

            res.json({
                success: true,
                customers
            });
        } catch (error) {
            console.error('Search customers error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error searching customers' 
            });
        }
    },

    // Get active customers
    getActiveCustomers: async (req, res) => {
        try {
            const customers = await Customer.find({ isActive: true })
                .sort({ createdAt: -1 });

            res.json({
                success: true,
                customers
            });
        } catch (error) {
            console.error('Get active customers error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting active customers' 
            });
        }
    },

    // Get inactive customers
    getInactiveCustomers: async (req, res) => {
        try {
            const customers = await Customer.find({ isActive: false })
                .sort({ createdAt: -1 });

            res.json({
                success: true,
                customers
            });
        } catch (error) {
            console.error('Get inactive customers error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting inactive customers' 
            });
        }
    },

    // Get customer statistics
    getCustomerStats: async (req, res) => {
        try {
            const totalCustomers = await Customer.countDocuments({ isActive: true });
            const newThisMonth = await Customer.countDocuments({
                isActive: true,
                createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            });

            const byEmploymentStatus = await Customer.aggregate([
                { $match: { isActive: true } },
                { $group: { _id: '$employmentStatus', count: { $sum: 1 } } }
            ]);

            const byCity = await Customer.aggregate([
                { $match: { isActive: true } },
                { $group: { _id: '$city', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]);

            res.json({
                success: true,
                stats: {
                    totalCustomers,
                    newThisMonth,
                    byEmploymentStatus,
                    byCity
                }
            });
        } catch (error) {
            console.error('Get customer stats error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting customer stats' 
            });
        }
    },

    // Get customer demographics
    getCustomerDemographics: async (req, res) => {
        try {
            const ageGroups = await Customer.aggregate([
                { $match: { isActive: true } },
                {
                    $group: {
                        _id: {
                            $switch: {
                                branches: [
                                    { case: { $lt: ['$age', 25] }, then: '18-24' },
                                    { case: { $lt: ['$age', 35] }, then: '25-34' },
                                    { case: { $lt: ['$age', 45] }, then: '35-44' },
                                    { case: { $lt: ['$age', 55] }, then: '45-54' },
                                    { case: { $gte: ['$age', 55] }, then: '55+' }
                                ],
                                default: 'Unknown'
                            }
                        },
                        count: { $sum: 1 }
                    }
                }
            ]);

            const genderDistribution = await Customer.aggregate([
                { $match: { isActive: true } },
                { $group: { _id: '$gender', count: { $sum: 1 } } }
            ]);

            const maritalStatus = await Customer.aggregate([
                { $match: { isActive: true } },
                { $group: { _id: '$maritalStatus', count: { $sum: 1 } } }
            ]);

            res.json({
                success: true,
                demographics: {
                    ageGroups,
                    genderDistribution,
                    maritalStatus
                }
            });
        } catch (error) {
            console.error('Get customer demographics error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting customer demographics' 
            });
        }
    },

    // Bulk create customers
    bulkCreateCustomers: async (req, res) => {
        try {
            const { customers } = req.body;
            
            if (!Array.isArray(customers) || customers.length === 0) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Customers array is required' 
                });
            }

            const createdCustomers = [];
            const errors = [];

            for (const customerData of customers) {
                try {
                    const customer = new Customer({
                        ...customerData,
                        createdBy: req.user.id
                    });
                    await customer.save();
                    createdCustomers.push(customer);
                } catch (error) {
                    errors.push(`Error creating customer ${customerData.fullName}: ${error.message}`);
                }
            }

            res.json({
                success: true,
                message: `Created ${createdCustomers.length} customers`,
                created: createdCustomers.length,
                errors
            });
        } catch (error) {
            console.error('Bulk create customers error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error bulk creating customers' 
            });
        }
    },

    // Bulk update customers
    bulkUpdateCustomers: async (req, res) => {
        try {
            const { customerIds, updates } = req.body;
            
            const result = await Customer.updateMany(
                { _id: { $in: customerIds } },
                { $set: { ...updates, updatedBy: req.user.id } }
            );

            res.json({
                success: true,
                message: `Updated ${result.modifiedCount} customers`,
                modified: result.modifiedCount
            });
        } catch (error) {
            console.error('Bulk update customers error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error bulk updating customers' 
            });
        }
    },

    // Bulk delete customers
    bulkDeleteCustomers: async (req, res) => {
        try {
            const { customerIds } = req.body;
            
            // Soft delete - set isActive to false
            const result = await Customer.updateMany(
                { _id: { $in: customerIds } },
                { $set: { isActive: false, updatedBy: req.user.id } }
            );

            res.json({
                success: true,
                message: `Deleted ${result.modifiedCount} customers`,
                modified: result.modifiedCount
            });
        } catch (error) {
            console.error('Bulk delete customers error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error bulk deleting customers' 
            });
        }
    },

    // Validate NRC
    validateNRC: async (req, res) => {
        try {
            const { nrcNumber } = req.body;
            
            const existingCustomer = await Customer.findOne({ 
                nrcNumber: nrcNumber.toUpperCase(),
                isActive: true 
            });

            res.json({
                success: true,
                isValid: !existingCustomer,
                message: existingCustomer ? 'NRC number already exists' : 'NRC number is available'
            });
        } catch (error) {
            console.error('Validate NRC error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error validating NRC' 
            });
        }
    },

    // Validate phone
    validatePhone: async (req, res) => {
        try {
            const { phoneNumber } = req.body;
            
            const existingCustomer = await Customer.findOne({ 
                phoneNumber,
                isActive: true 
            });

            res.json({
                success: true,
                isValid: !existingCustomer,
                message: existingCustomer ? 'Phone number already exists' : 'Phone number is available'
            });
        } catch (error) {
            console.error('Validate phone error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error validating phone' 
            });
        }
    }
};

module.exports = customerController;