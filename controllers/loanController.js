const Loan = require('../models/Loan');
const Customer = require('../models/Customer');
const Payment = require('../models/Payment');
const { createMessage } = require('../services/messageService');

// Helper function to calculate loan details
const calculateLoanDetails = (amount, period, interestRate = 10) => {
    const months = parseInt(period.split(' ')[0]);
    const interest = (amount * interestRate * months) / 100;
    const totalAmount = amount + interest;
    const monthlyPayment = totalAmount / months;
    
    return {
        totalAmount: Math.round(totalAmount * 100) / 100,
        monthlyPayment: Math.round(monthlyPayment * 100) / 100,
        remainingBalance: Math.round(totalAmount * 100) / 100,
        endDate: new Date(Date.now() + (months * 30 * 24 * 60 * 60 * 1000)),
        dueDate: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000))
    };
};

const loanController = {
    // Get all loans
    getAllLoans: async (req, res) => {
        try {
            const { page = 1, limit = 10, status, search } = req.query;
            const filter = {};
            
            if (status) filter.status = status;
            if (search) {
                filter.$or = [
                    { customerName: { $regex: search, $options: 'i' } },
                    { customerNRC: { $regex: search, $options: 'i' } }
                ];
            }

            const loans = await Loan.find(filter)
                .populate('customerId', 'fullName nrcNumber phoneNumber')
                .populate('createdBy', 'name userid')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await Loan.countDocuments(filter);

            res.json({
                success: true,
                loans,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error('Get all loans error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting loans' 
            });
        }
    },

    // Get loan by ID
    getLoanById: async (req, res) => {
        try {
            const loan = await Loan.findById(req.params.id)
                .populate('customerId')
                .populate('createdBy', 'name userid');

            if (!loan) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Loan not found' 
                });
            }

            res.json({
                success: true,
                loan
            });
        } catch (error) {
            console.error('Get loan by ID error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting loan' 
            });
        }
    },

    // Create loan
    createLoan: async (req, res) => {
        try {
            const { customerId, loanAmount, loanPeriod, loanType, interestRate, isReloan, parentLoanId } = req.body;

            if (!customerId || !loanAmount || !loanPeriod || !loanType) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Customer ID, loan amount, period, and type are required' 
                });
            }

            const customer = await Customer.findById(customerId);
            if (!customer) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Customer not found' 
                });
            }

            // Check subadmin restrictions
            if (req.user.role === 'subadmin' && req.user.restrictions.maxLoanAmount) {
                if (loanAmount > req.user.restrictions.maxLoanAmount) {
                    return res.status(403).json({ 
                        success: false,
                        message: `Loan amount exceeds your limit of ${req.user.restrictions.maxLoanAmount}` 
                    });
                }
            }

            const loanDetails = calculateLoanDetails(loanAmount, loanPeriod, interestRate);

            const loan = new Loan({
                customerId,
                customerName: customer.fullName,
                customerNRC: customer.nrcNumber,
                loanAmount,
                loanPeriod,
                loanType,
                interestRate: interestRate || 10,
                isReloan: isReloan || false,
                parentLoanId: parentLoanId || null,
                createdBy: req.user.id,
                ...loanDetails
            });

            await loan.save();

            res.status(201).json({ 
                success: true,
                message: 'Loan created successfully', 
                loan 
            });
        } catch (error) {
            console.error('Create loan error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error creating loan' 
            });
        }
    },

    // Update loan
    updateLoan: async (req, res) => {
        try {
            const loan = await Loan.findByIdAndUpdate(
                req.params.id,
                { ...req.body, updatedBy: req.user.id },
                { new: true, runValidators: true }
            );

            if (!loan) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Loan not found' 
                });
            }

            res.json({ 
                success: true,
                message: 'Loan updated successfully', 
                loan 
            });
        } catch (error) {
            console.error('Update loan error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error updating loan' 
            });
        }
    },

    // Delete loan
    deleteLoan: async (req, res) => {
        try {
            const loan = await Loan.findById(req.params.id);
            if (!loan) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Loan not found' 
                });
            }

            // Check if loan has payments
            const paymentCount = await Payment.countDocuments({ loanId: req.params.id });
            if (paymentCount > 0) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Cannot delete loan with existing payments' 
                });
            }

            await Loan.findByIdAndDelete(req.params.id);

            res.json({ 
                success: true,
                message: 'Loan deleted successfully' 
            });
        } catch (error) {
            console.error('Delete loan error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error deleting loan' 
            });
        }
    },

    // Get loan details with payment history
    getLoanDetails: async (req, res) => {
        try {
            const loan = await Loan.findById(req.params.id)
                .populate('customerId')
                .populate('createdBy', 'name userid');

            if (!loan) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Loan not found' 
                });
            }

            const payments = await Payment.find({ loanId: req.params.id })
                .populate('recordedBy', 'name userid')
                .sort({ createdAt: -1 });

            const totalPaid = payments
                .filter(p => p.status === 'Completed')
                .reduce((sum, payment) => sum + payment.paymentAmount, 0);

            res.json({
                success: true,
                loan,
                payments,
                totalPaid,
                paymentHistory: payments.map(p => ({
                    id: p._id,
                    date: p.paymentDate,
                    amount: p.paymentAmount,
                    method: p.paymentMethod,
                    status: p.status,
                    balanceAfter: p.balanceAfterPayment,
                    recordedBy: p.recordedBy
                }))
            });
        } catch (error) {
            console.error('Get loan details error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting loan details' 
            });
        }
    },

    // Get loan payments
    getLoanPayments: async (req, res) => {
        try {
            const payments = await Payment.find({ loanId: req.params.id })
                .populate('recordedBy', 'name userid')
                .sort({ createdAt: -1 });

            res.json({
                success: true,
                payments
            });
        } catch (error) {
            console.error('Get loan payments error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting loan payments' 
            });
        }
    },

    // Get loan summary
    getLoanSummary: async (req, res) => {
        try {
            const loan = await Loan.findById(req.params.id);
            if (!loan) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Loan not found' 
                });
            }

            const paymentCount = await Payment.countDocuments({ 
                loanId: req.params.id, 
                status: 'Completed' 
            });

            const totalPaid = await Payment.aggregate([
                { $match: { loanId: loan._id, status: 'Completed' } },
                { $group: { _id: null, total: { $sum: '$paymentAmount' } } }
            ]);

            res.json({
                success: true,
                summary: {
                    ...loan.getSummary(),
                    paymentCount,
                    totalPaid: totalPaid.length > 0 ? totalPaid[0].total : 0
                }
            });
        } catch (error) {
            console.error('Get loan summary error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting loan summary' 
            });
        }
    },

    // Create reloan
    createReloan: async (req, res) => {
        try {
            const { loanId } = req.params;
            const { loanAmount, loanPeriod, loanType, interestRate } = req.body;

            const parentLoan = await Loan.findById(loanId);
            if (!parentLoan) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Parent loan not found' 
                });
            }

            if (parentLoan.status !== 'Completed') {
                return res.status(400).json({ 
                    success: false,
                    message: 'Can only create reloan for completed loans' 
                });
            }

            const customer = await Customer.findById(parentLoan.customerId);
            if (!customer) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Customer not found' 
                });
            }

            const loanDetails = calculateLoanDetails(loanAmount, loanPeriod, interestRate);

            const reloan = new Loan({
                customerId: parentLoan.customerId,
                customerName: customer.fullName,
                customerNRC: customer.nrcNumber,
                loanAmount,
                loanPeriod,
                loanType,
                interestRate: interestRate || 10,
                isReloan: true,
                parentLoanId: loanId,
                createdBy: req.user.id,
                ...loanDetails
            });

            await reloan.save();

            res.status(201).json({ 
                success: true,
                message: 'Reloan created successfully', 
                loan: reloan 
            });
        } catch (error) {
            console.error('Create reloan error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error creating reloan' 
            });
        }
    },

    // Approve loan
    approveLoan: async (req, res) => {
        try {
            const loan = await Loan.findById(req.params.id);
            if (!loan) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Loan not found' 
                });
            }

            loan.approvalStatus = 'Approved';
            loan.approvedBy = req.user.id;
            loan.approvedAt = new Date();
            await loan.save();

            res.json({ 
                success: true,
                message: 'Loan approved successfully' 
            });
        } catch (error) {
            console.error('Approve loan error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error approving loan' 
            });
        }
    },

    // Reject loan
    rejectLoan: async (req, res) => {
        try {
            const { rejectionReason } = req.body;
            
            const loan = await Loan.findById(req.params.id);
            if (!loan) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Loan not found' 
                });
            }

            loan.approvalStatus = 'Rejected';
            loan.rejectionReason = rejectionReason;
            loan.approvedBy = req.user.id;
            loan.approvedAt = new Date();
            await loan.save();

            res.json({ 
                success: true,
                message: 'Loan rejected successfully' 
            });
        } catch (error) {
            console.error('Reject loan error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error rejecting loan' 
            });
        }
    },

    // Cancel loan
    cancelLoan: async (req, res) => {
        try {
            const loan = await Loan.findById(req.params.id);
            if (!loan) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Loan not found' 
                });
            }

            if (loan.status === 'Completed') {
                return res.status(400).json({ 
                    success: false,
                    message: 'Cannot cancel completed loan' 
                });
            }

            loan.status = 'Cancelled';
            await loan.save();

            res.json({ 
                success: true,
                message: 'Loan cancelled successfully' 
            });
        } catch (error) {
            console.error('Cancel loan error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error cancelling loan' 
            });
        }
    },

    // Get loans by status
    getLoansByStatus: async (req, res) => {
        try {
            const { status } = req.params;
            const loans = await Loan.find({ status })
                .populate('customerId', 'fullName nrcNumber phoneNumber')
                .sort({ createdAt: -1 });

            res.json({
                success: true,
                loans
            });
        } catch (error) {
            console.error('Get loans by status error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting loans by status' 
            });
        }
    },

    // Get overdue loans
    getOverdueLoans: async (req, res) => {
        try {
            const loans = await Loan.find({ status: 'Overdue' })
                .populate('customerId', 'fullName nrcNumber phoneNumber')
                .sort({ dueDate: 1 });

            res.json({
                success: true,
                loans
            });
        } catch (error) {
            console.error('Get overdue loans error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting overdue loans' 
            });
        }
    },

    // Get loans due soon
    getDueSoonLoans: async (req, res) => {
        try {
            const sevenDaysFromNow = new Date();
            sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

            const loans = await Loan.find({
                status: { $in: ['Active', 'Not Paid'] },
                dueDate: { $lte: sevenDaysFromNow, $gte: new Date() },
                remainingBalance: { $gt: 0 }
            })
            .populate('customerId', 'fullName nrcNumber phoneNumber')
            .sort({ dueDate: 1 });

            res.json({
                success: true,
                loans
            });
        } catch (error) {
            console.error('Get due soon loans error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting due soon loans' 
            });
        }
    },

    // Search loans
    searchLoans: async (req, res) => {
        try {
            const { query } = req.params;
            const searchRegex = new RegExp(query, 'i');

            const loans = await Loan.find({
                $or: [
                    { customerName: searchRegex },
                    { customerNRC: searchRegex },
                    { loanType: searchRegex }
                ]
            })
            .populate('customerId', 'fullName nrcNumber phoneNumber')
            .limit(20);

            res.json({
                success: true,
                loans
            });
        } catch (error) {
            console.error('Search loans error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error searching loans' 
            });
        }
    },

    // Get loan statistics
    getLoanStats: async (req, res) => {
        try {
            const totalLoans = await Loan.countDocuments();
            const activeLoans = await Loan.countDocuments({ status: 'Active' });
            const completedLoans = await Loan.countDocuments({ status: 'Completed' });
            const overdueLoans = await Loan.countDocuments({ status: 'Overdue' });
            const notPaidLoans = await Loan.countDocuments({ status: 'Not Paid' });

            const totalLoanAmount = await Loan.aggregate([
                { $group: { _id: null, total: { $sum: '$loanAmount' } } }
            ]);

            const totalOutstanding = await Loan.aggregate([
                { $match: { status: { $in: ['Active', 'Overdue', 'Not Paid'] } } },
                { $group: { _id: null, total: { $sum: '$remainingBalance' } } }
            ]);

            const loansByType = await Loan.aggregate([
                { $group: { _id: '$loanType', count: { $sum: 1 }, totalAmount: { $sum: '$loanAmount' } } }
            ]);

            res.json({
                success: true,
                stats: {
                    totalLoans,
                    activeLoans,
                    completedLoans,
                    overdueLoans,
                    notPaidLoans,
                    totalLoanAmount: totalLoanAmount.length > 0 ? totalLoanAmount[0].total : 0,
                    totalOutstanding: totalOutstanding.length > 0 ? totalOutstanding[0].total : 0,
                    loansByType
                }
            });
        } catch (error) {
            console.error('Get loan stats error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting loan stats' 
            });
        }
    },

    // Get loan performance
    getLoanPerformance: async (req, res) => {
        try {
            const performanceData = await Loan.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$loanAmount' },
                        avgAmount: { $avg: '$loanAmount' }
                    }
                }
            ]);

            const monthlyTrends = await Loan.aggregate([
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' }
                        },
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$loanAmount' }
                    }
                },
                { $sort: { '_id.year': -1, '_id.month': -1 } },
                { $limit: 12 }
            ]);

            res.json({
                success: true,
                performance: {
                    statusBreakdown: performanceData,
                    monthlyTrends
                }
            });
        } catch (error) {
            console.error('Get loan performance error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting loan performance' 
            });
        }
    },

    // Bulk update loan status
    bulkUpdateLoanStatus: async (req, res) => {
        try {
            const { loanIds, status } = req.body;
            
            const result = await Loan.updateMany(
                { _id: { $in: loanIds } },
                { $set: { status, updatedBy: req.user.id } }
            );

            res.json({
                success: true,
                message: `Updated ${result.modifiedCount} loans`,
                modified: result.modifiedCount
            });
        } catch (error) {
            console.error('Bulk update loan status error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error bulk updating loan status' 
            });
        }
    },

    // Bulk create loans
    bulkCreateLoans: async (req, res) => {
        try {
            const { loans } = req.body;
            
            if (!Array.isArray(loans) || loans.length === 0) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Loans array is required' 
                });
            }

            const createdLoans = [];
            const errors = [];

            for (const loanData of loans) {
                try {
                    const customer = await Customer.findById(loanData.customerId);
                    if (!customer) {
                        errors.push(`Customer not found for loan ${loanData.customerId}`);
                        continue;
                    }

                    const loanDetails = calculateLoanDetails(
                        loanData.loanAmount, 
                        loanData.loanPeriod, 
                        loanData.interestRate
                    );

                    const loan = new Loan({
                        ...loanData,
                        customerName: customer.fullName,
                        customerNRC: customer.nrcNumber,
                        createdBy: req.user.id,
                        ...loanDetails
                    });

                    await loan.save();
                    createdLoans.push(loan);
                } catch (error) {
                    errors.push(`Error creating loan: ${error.message}`);
                }
            }

            res.json({
                success: true,
                message: `Created ${createdLoans.length} loans`,
                created: createdLoans.length,
                errors
            });
        } catch (error) {
            console.error('Bulk create loans error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error bulk creating loans' 
            });
        }
    },

    // Calculate loan
    calculateLoan: async (req, res) => {
        try {
            const { loanAmount, loanPeriod, interestRate } = req.body;
            
            if (!loanAmount || !loanPeriod) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Loan amount and period are required' 
                });
            }

            const calculation = calculateLoanDetails(loanAmount, loanPeriod, interestRate);

            res.json({
                success: true,
                calculation
            });
        } catch (error) {
            console.error('Calculate loan error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error calculating loan' 
            });
        }
    },

    // Get interest rates
    getInterestRates: async (req, res) => {
        try {
            // In a real system, this would come from a configuration
            const interestRates = {
                personal: 10,
                business: 12,
                emergency: 8,
                education: 6,
                medical: 7
            };

            res.json({
                success: true,
                interestRates
            });
        } catch (error) {
            console.error('Get interest rates error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting interest rates' 
            });
        }
    }
};

module.exports = loanController;