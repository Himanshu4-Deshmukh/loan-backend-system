const Payment = require('../models/Payment');
const Loan = require('../models/Loan');
const Customer = require('../models/Customer');
const { createMessage } = require('../services/messageService');
const PDFDocument = require('pdfkit');

const paymentController = {
    // Get all payments
    getAllPayments: async (req, res) => {
        try {
            const { page = 1, limit = 10, status, method, search } = req.query;
            const filter = {};
            
            if (status) filter.status = status;
            if (method) filter.paymentMethod = method;
            if (search) {
                filter.$or = [
                    { customerName: { $regex: search, $options: 'i' } },
                    { receiptNumber: { $regex: search, $options: 'i' } }
                ];
            }

            const payments = await Payment.find(filter)
                .populate('loanId', 'loanAmount loanType')
                .populate('customerId', 'fullName nrcNumber')
                .populate('recordedBy', 'name userid')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await Payment.countDocuments(filter);

            res.json({
                success: true,
                payments,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error('Get all payments error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting payments' 
            });
        }
    },

    // Get payment by ID
    getPaymentById: async (req, res) => {
        try {
            const payment = await Payment.findById(req.params.id)
                .populate('loanId')
                .populate('customerId')
                .populate('recordedBy', 'name userid');

            if (!payment) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Payment not found' 
                });
            }

            res.json({
                success: true,
                payment
            });
        } catch (error) {
            console.error('Get payment by ID error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting payment' 
            });
        }
    },

    // Create payment
    createPayment: async (req, res) => {
        try {
            const { loanId, paymentAmount, paymentMethod, mobileMoneyDetails, bankDetails, notes } = req.body;

            if (!loanId || !paymentAmount) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Loan ID and payment amount are required' 
                });
            }

            const amount = parseFloat(paymentAmount);
            if (isNaN(amount) || amount <= 0) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Invalid payment amount' 
                });
            }

            const loan = await Loan.findById(loanId).populate('customerId');
            if (!loan) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Loan not found' 
                });
            }

            if (amount > loan.remainingBalance) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Payment amount cannot exceed remaining balance' 
                });
            }

            // Calculate new balance
            const balanceBeforePayment = loan.remainingBalance;
            const newBalance = Math.max(0, loan.remainingBalance - amount);

            const payment = new Payment({
                loanId,
                customerId: loan.customerId._id,
                customerName: loan.customerId.fullName || loan.customerName,
                paymentAmount: amount,
                paymentMethod: paymentMethod || 'Cash',
                balanceBeforePayment,
                balanceAfterPayment: newBalance,
                mobileMoneyDetails,
                bankDetails,
                notes,
                recordedBy: req.user.id,
                receiptNumber: generateReceiptNumber()
            });

            await payment.save();

            // Update loan
            loan.remainingBalance = newBalance;
            loan.lastPaymentDate = new Date();
            loan.totalPaid = (loan.totalPaid || 0) + amount;
            loan.paymentCount = (loan.paymentCount || 0) + 1;
            
            // Change status from 'Not Paid' to 'Active' on first payment
            if (loan.status === 'Not Paid') {
                loan.status = 'Active';
            }
            
            // Check if loan is fully paid
            if (newBalance === 0) {
                loan.status = 'Completed';
                
                // Create completion message
                await createMessage({
                    type: 'loan_completed',
                    customerId: loan.customerId._id,
                    loanId: loan._id,
                    title: 'Loan Completed',
                    message: `Loan for ${loan.customerName} has been fully paid`,
                    priority: 'low'
                });
            }

            await loan.save();

            res.status(201).json({ 
                success: true,
                message: 'Payment recorded successfully', 
                payment,
                loanStatus: loan.status,
                remainingBalance: newBalance
            });

        } catch (error) {
            console.error('Payment creation error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error creating payment' 
            });
        }
    },

    // Update payment
    updatePayment: async (req, res) => {
        try {
            const payment = await Payment.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true, runValidators: true }
            );

            if (!payment) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Payment not found' 
                });
            }

            res.json({ 
                success: true,
                message: 'Payment updated successfully', 
                payment 
            });
        } catch (error) {
            console.error('Update payment error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error updating payment' 
            });
        }
    },

    // Delete payment
    deletePayment: async (req, res) => {
        try {
            const payment = await Payment.findById(req.params.id);
            if (!payment) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Payment not found' 
                });
            }

            if (payment.status === 'Completed') {
                return res.status(400).json({ 
                    success: false,
                    message: 'Cannot delete completed payment. Use reverse instead.' 
                });
            }

            await Payment.findByIdAndDelete(req.params.id);

            res.json({ 
                success: true,
                message: 'Payment deleted successfully' 
            });
        } catch (error) {
            console.error('Delete payment error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error deleting payment' 
            });
        }
    },

    // Reverse payment
    reversePayment: async (req, res) => {
        try {
            const { reversalReason } = req.body;

            if (!reversalReason || reversalReason.trim() === '') {
                return res.status(400).json({ 
                    success: false,
                    message: 'Reversal reason is required' 
                });
            }

            const payment = await Payment.findById(req.params.id);
            if (!payment) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Payment not found' 
                });
            }

            if (payment.status === 'Reversed') {
                return res.status(400).json({ 
                    success: false,
                    message: 'Payment is already reversed' 
                });
            }

            // Update payment status
            payment.status = 'Reversed';
            payment.reversalReason = reversalReason;
            payment.reversedBy = req.user.id;
            payment.reversedAt = new Date();
            await payment.save();

            // Update loan balance
            const loan = await Loan.findById(payment.loanId);
            if (loan) {
                loan.remainingBalance = Math.min(loan.totalAmount, loan.remainingBalance + payment.paymentAmount);
                loan.totalPaid = Math.max(0, (loan.totalPaid || 0) - payment.paymentAmount);
                loan.paymentCount = Math.max(0, (loan.paymentCount || 0) - 1);
                
                // Update loan status
                if (loan.remainingBalance > 0) {
                    loan.status = loan.remainingBalance === loan.totalAmount ? 'Not Paid' : 'Active';
                }
                
                await loan.save();
            }

            res.json({ 
                success: true,
                message: 'Payment reversed successfully', 
                payment,
                loanStatus: loan ? loan.status : undefined
            });

        } catch (error) {
            console.error('Payment reversal error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error reversing payment' 
            });
        }
    },

    // Confirm payment
    confirmPayment: async (req, res) => {
        try {
            const payment = await Payment.findById(req.params.id);
            if (!payment) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Payment not found' 
                });
            }

            payment.status = 'Completed';
            await payment.save();

            res.json({ 
                success: true,
                message: 'Payment confirmed successfully' 
            });
        } catch (error) {
            console.error('Confirm payment error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error confirming payment' 
            });
        }
    },

    // Fail payment
    failPayment: async (req, res) => {
        try {
            const { failureReason } = req.body;
            
            const payment = await Payment.findById(req.params.id);
            if (!payment) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Payment not found' 
                });
            }

            payment.status = 'Failed';
            payment.notes = failureReason;
            await payment.save();

            res.json({ 
                success: true,
                message: 'Payment marked as failed' 
            });
        } catch (error) {
            console.error('Fail payment error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error failing payment' 
            });
        }
    },

    // Process cash payment
    processCashPayment: async (req, res) => {
        try {
            const paymentData = {
                ...req.body,
                paymentMethod: 'Cash',
                status: 'Completed'
            };

            return await paymentController.createPayment({ ...req, body: paymentData }, res);
        } catch (error) {
            console.error('Process cash payment error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error processing cash payment' 
            });
        }
    },

    // Process mobile money payment
    processMobileMoneyPayment: async (req, res) => {
        try {
            const { phoneNumber, provider, transactionId } = req.body;
            
            const paymentData = {
                ...req.body,
                paymentMethod: 'Mobile Money',
                status: 'Pending', // Mobile money payments start as pending
                mobileMoneyDetails: {
                    phoneNumber,
                    provider,
                    transactionId
                }
            };

            return await paymentController.createPayment({ ...req, body: paymentData }, res);
        } catch (error) {
            console.error('Process mobile money payment error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error processing mobile money payment' 
            });
        }
    },

    // Process bank transfer payment
    processBankTransferPayment: async (req, res) => {
        try {
            const { bankName, accountNumber, referenceNumber } = req.body;
            
            const paymentData = {
                ...req.body,
                paymentMethod: 'Bank Transfer',
                status: 'Pending',
                bankDetails: {
                    bankName,
                    accountNumber,
                    referenceNumber
                }
            };

            return await paymentController.createPayment({ ...req, body: paymentData }, res);
        } catch (error) {
            console.error('Process bank transfer payment error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error processing bank transfer payment' 
            });
        }
    },

    // Get payments by method
    getPaymentsByMethod: async (req, res) => {
        try {
            const { method } = req.params;
            const payments = await Payment.find({ paymentMethod: method })
                .populate('loanId', 'loanAmount loanType')
                .populate('customerId', 'fullName nrcNumber')
                .sort({ createdAt: -1 });

            res.json({
                success: true,
                payments
            });
        } catch (error) {
            console.error('Get payments by method error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting payments by method' 
            });
        }
    },

    // Get payments by status
    getPaymentsByStatus: async (req, res) => {
        try {
            const { status } = req.params;
            const payments = await Payment.find({ status })
                .populate('loanId', 'loanAmount loanType')
                .populate('customerId', 'fullName nrcNumber')
                .sort({ createdAt: -1 });

            res.json({
                success: true,
                payments
            });
        } catch (error) {
            console.error('Get payments by status error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting payments by status' 
            });
        }
    },

    // Get payments by date range
    getPaymentsByDateRange: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;
            
            if (!startDate || !endDate) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Start date and end date are required' 
                });
            }

            const payments = await Payment.find({
                paymentDate: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            })
            .populate('loanId', 'loanAmount loanType')
            .populate('customerId', 'fullName nrcNumber')
            .sort({ paymentDate: -1 });

            res.json({
                success: true,
                payments
            });
        } catch (error) {
            console.error('Get payments by date range error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting payments by date range' 
            });
        }
    },

    // Search payments
    searchPayments: async (req, res) => {
        try {
            const { query } = req.params;
            const searchRegex = new RegExp(query, 'i');

            const payments = await Payment.find({
                $or: [
                    { customerName: searchRegex },
                    { receiptNumber: searchRegex },
                    { transactionId: searchRegex }
                ]
            })
            .populate('loanId', 'loanAmount loanType')
            .populate('customerId', 'fullName nrcNumber')
            .limit(20);

            res.json({
                success: true,
                payments
            });
        } catch (error) {
            console.error('Search payments error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error searching payments' 
            });
        }
    },

    // Get payment statistics
    getPaymentStats: async (req, res) => {
        try {
            const totalPayments = await Payment.countDocuments({ status: 'Completed' });
            const totalAmount = await Payment.aggregate([
                { $match: { status: 'Completed' } },
                { $group: { _id: null, total: { $sum: '$paymentAmount' } } }
            ]);

            const todayPayments = await Payment.countDocuments({
                status: 'Completed',
                paymentDate: {
                    $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    $lt: new Date(new Date().setHours(23, 59, 59, 999))
                }
            });

            const todayAmount = await Payment.aggregate([
                {
                    $match: {
                        status: 'Completed',
                        paymentDate: {
                            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                            $lt: new Date(new Date().setHours(23, 59, 59, 999))
                        }
                    }
                },
                { $group: { _id: null, total: { $sum: '$paymentAmount' } } }
            ]);

            const pendingPayments = await Payment.countDocuments({ status: 'Pending' });
            const reversedPayments = await Payment.countDocuments({ status: 'Reversed' });

            res.json({
                success: true,
                stats: {
                    totalPayments,
                    totalAmount: totalAmount.length > 0 ? totalAmount[0].total : 0,
                    todayPayments,
                    todayAmount: todayAmount.length > 0 ? todayAmount[0].total : 0,
                    pendingPayments,
                    reversedPayments
                }
            });
        } catch (error) {
            console.error('Get payment stats error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting payment stats' 
            });
        }
    },

    // Get payment method statistics
    getPaymentMethodStats: async (req, res) => {
        try {
            const methodStats = await Payment.aggregate([
                { $match: { status: 'Completed' } },
                {
                    $group: {
                        _id: '$paymentMethod',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$paymentAmount' },
                        avgAmount: { $avg: '$paymentAmount' }
                    }
                }
            ]);

            res.json({
                success: true,
                methodStats
            });
        } catch (error) {
            console.error('Get payment method stats error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting payment method stats' 
            });
        }
    },

    // Get daily payment statistics
    getDailyPaymentStats: async (req, res) => {
        try {
            const { days = 30 } = req.query;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const dailyStats = await Payment.aggregate([
                {
                    $match: {
                        status: 'Completed',
                        paymentDate: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$paymentDate' },
                            month: { $month: '$paymentDate' },
                            day: { $dayOfMonth: '$paymentDate' }
                        },
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$paymentAmount' }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
            ]);

            res.json({
                success: true,
                dailyStats
            });
        } catch (error) {
            console.error('Get daily payment stats error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting daily payment stats' 
            });
        }
    },

    // Generate receipt
    generateReceipt: async (req, res) => {
        try {
            const payment = await Payment.findById(req.params.id)
                .populate('loanId')
                .populate('customerId');

            if (!payment) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Payment not found' 
                });
            }

            const receipt = {
                receiptNumber: payment.receiptNumber,
                paymentDate: payment.paymentDate,
                customerName: payment.customerName,
                paymentAmount: payment.paymentAmount,
                paymentMethod: payment.paymentMethod,
                balanceAfterPayment: payment.balanceAfterPayment,
                loanDetails: payment.loanId
            };

            res.json({
                success: true,
                receipt
            });
        } catch (error) {
            console.error('Generate receipt error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error generating receipt' 
            });
        }
    },

    // Generate receipt PDF
    generateReceiptPDF: async (req, res) => {
        try {
            const payment = await Payment.findById(req.params.id)
                .populate('loanId')
                .populate('customerId');

            if (!payment) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Payment not found' 
                });
            }

            const doc = new PDFDocument({ margin: 50 });
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="receipt-${payment.receiptNumber}.pdf"`);
            
            doc.pipe(res);

            // Header
            doc.fontSize(20).text('PAYMENT RECEIPT', { align: 'center' });
            doc.moveDown();

            // Receipt details
            doc.fontSize(12);
            doc.text(`Receipt Number: ${payment.receiptNumber}`);
            doc.text(`Date: ${payment.paymentDate.toLocaleDateString()}`);
            doc.text(`Customer: ${payment.customerName}`);
            doc.text(`Payment Amount: K${payment.paymentAmount}`);
            doc.text(`Payment Method: ${payment.paymentMethod}`);
            doc.text(`Balance After Payment: K${payment.balanceAfterPayment}`);
            
            if (payment.loanId) {
                doc.moveDown();
                doc.text('LOAN DETAILS:');
                doc.text(`Loan Amount: K${payment.loanId.loanAmount}`);
                doc.text(`Loan Type: ${payment.loanId.loanType}`);
            }

            doc.end();
        } catch (error) {
            console.error('Generate receipt PDF error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error generating receipt PDF' 
            });
        }
    },

    // Bulk create payments
    bulkCreatePayments: async (req, res) => {
        try {
            const { payments } = req.body;
            
            if (!Array.isArray(payments) || payments.length === 0) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Payments array is required' 
                });
            }

            const createdPayments = [];
            const errors = [];

            for (const paymentData of payments) {
                try {
                    const loan = await Loan.findById(paymentData.loanId);
                    if (!loan) {
                        errors.push(`Loan not found for payment ${paymentData.loanId}`);
                        continue;
                    }

                    const payment = new Payment({
                        ...paymentData,
                        recordedBy: req.user.id,
                        receiptNumber: generateReceiptNumber()
                    });

                    await payment.save();
                    createdPayments.push(payment);
                } catch (error) {
                    errors.push(`Error creating payment: ${error.message}`);
                }
            }

            res.json({
                success: true,
                message: `Created ${createdPayments.length} payments`,
                created: createdPayments.length,
                errors
            });
        } catch (error) {
            console.error('Bulk create payments error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error bulk creating payments' 
            });
        }
    },

    // Bulk confirm payments
    bulkConfirmPayments: async (req, res) => {
        try {
            const { paymentIds } = req.body;
            
            const result = await Payment.updateMany(
                { _id: { $in: paymentIds } },
                { $set: { status: 'Completed' } }
            );

            res.json({
                success: true,
                message: `Confirmed ${result.modifiedCount} payments`,
                modified: result.modifiedCount
            });
        } catch (error) {
            console.error('Bulk confirm payments error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error bulk confirming payments' 
            });
        }
    },

    // Bulk reverse payments
    bulkReversePayments: async (req, res) => {
        try {
            const { paymentIds, reversalReason } = req.body;
            
            if (!reversalReason) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Reversal reason is required' 
                });
            }

            const result = await Payment.updateMany(
                { _id: { $in: paymentIds } },
                { 
                    $set: { 
                        status: 'Reversed',
                        reversalReason,
                        reversedBy: req.user.id,
                        reversedAt: new Date()
                    } 
                }
            );

            res.json({
                success: true,
                message: `Reversed ${result.modifiedCount} payments`,
                modified: result.modifiedCount
            });
        } catch (error) {
            console.error('Bulk reverse payments error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error bulk reversing payments' 
            });
        }
    }
};

// Helper function to generate receipt number
function generateReceiptNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timestamp = date.getTime().toString().slice(-6);
    
    return `RCP-${year}${month}${day}-${timestamp}`;
}

module.exports = paymentController;