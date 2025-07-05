const Customer = require('../models/Customer');
const Loan = require('../models/Loan');
const Payment = require('../models/Payment');
const Message = require('../models/Message');
const User = require('../models/User');

const dashboardController = {
    // Get dashboard statistics
    getDashboardStats: async (req, res) => {
        try {
            const totalCustomers = await Customer.countDocuments({ isActive: true });
            const totalLoans = await Loan.countDocuments();
            const activeLoans = await Loan.countDocuments({ status: 'Active' });
            const completedLoans = await Loan.countDocuments({ status: 'Completed' });
            const overdueLoans = await Loan.countDocuments({ status: 'Overdue' });
            const notPaidLoans = await Loan.countDocuments({ status: 'Not Paid' });
            
            const totalPayments = await Payment.aggregate([
                { $match: { status: 'Completed' } },
                { $group: { _id: null, total: { $sum: '$paymentAmount' } } }
            ]);

            const totalOutstanding = await Loan.aggregate([
                { $match: { status: { $in: ['Active', 'Overdue', 'Not Paid'] } } },
                { $group: { _id: null, total: { $sum: '$remainingBalance' } } }
            ]);

            const totalLoanAmount = await Loan.aggregate([
                { $group: { _id: null, total: { $sum: '$loanAmount' } } }
            ]);

            const newCustomersThisMonth = await Customer.countDocuments({
                isActive: true,
                createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            });

            const unreadMessages = await Message.countDocuments({ isRead: false });

            res.json({
                success: true,
                stats: {
                    totalCustomers,
                    totalLoans,
                    activeLoans,
                    completedLoans,
                    overdueLoans,
                    notPaidLoans,
                    totalPayments: totalPayments.length > 0 ? totalPayments[0].total : 0,
                    totalOutstanding: totalOutstanding.length > 0 ? totalOutstanding[0].total : 0,
                    totalLoanAmount: totalLoanAmount.length > 0 ? totalLoanAmount[0].total : 0,
                    newCustomersThisMonth,
                    unreadMessages
                }
            });
        } catch (error) {
            console.error('Get dashboard stats error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting dashboard stats' 
            });
        }
    },

    // Get dashboard overview
    getDashboardOverview: async (req, res) => {
        try {
            const recentCustomers = await Customer.find({ isActive: true })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('fullName nrcNumber phoneNumber createdAt');

            const recentLoans = await Loan.find()
                .populate('customerId', 'fullName nrcNumber')
                .sort({ createdAt: -1 })
                .limit(5);

            const recentPayments = await Payment.find({ status: 'Completed' })
                .populate('customerId', 'fullName')
                .sort({ createdAt: -1 })
                .limit(5);

            const urgentMessages = await Message.find({ 
                priority: { $in: ['high', 'urgent'] },
                isRead: false 
            })
            .populate('customerId', 'fullName')
            .sort({ createdAt: -1 })
            .limit(5);

            res.json({
                success: true,
                overview: {
                    recentCustomers,
                    recentLoans,
                    recentPayments,
                    urgentMessages
                }
            });
        } catch (error) {
            console.error('Get dashboard overview error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting dashboard overview' 
            });
        }
    },

    // Get financial dashboard
    getFinancialDashboard: async (req, res) => {
        try {
            const totalLoanValue = await Loan.aggregate([
                { $group: { _id: null, total: { $sum: '$loanAmount' } } }
            ]);

            const totalInterestEarned = await Loan.aggregate([
                { $match: { status: 'Completed' } },
                { $group: { _id: null, total: { $sum: { $subtract: ['$totalAmount', '$loanAmount'] } } } }
            ]);

            const totalCollected = await Payment.aggregate([
                { $match: { status: 'Completed' } },
                { $group: { _id: null, total: { $sum: '$paymentAmount' } } }
            ]);

            const totalOutstanding = await Loan.aggregate([
                { $match: { status: { $in: ['Active', 'Overdue', 'Not Paid'] } } },
                { $group: { _id: null, total: { $sum: '$remainingBalance' } } }
            ]);

            const monthlyCollections = await Payment.aggregate([
                { $match: { status: 'Completed' } },
                {
                    $group: {
                        _id: {
                            year: { $year: '$paymentDate' },
                            month: { $month: '$paymentDate' }
                        },
                        total: { $sum: '$paymentAmount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': -1, '_id.month': -1 } },
                { $limit: 12 }
            ]);

            res.json({
                success: true,
                financial: {
                    totalLoanValue: totalLoanValue.length > 0 ? totalLoanValue[0].total : 0,
                    totalInterestEarned: totalInterestEarned.length > 0 ? totalInterestEarned[0].total : 0,
                    totalCollected: totalCollected.length > 0 ? totalCollected[0].total : 0,
                    totalOutstanding: totalOutstanding.length > 0 ? totalOutstanding[0].total : 0,
                    monthlyCollections
                }
            });
        } catch (error) {
            console.error('Get financial dashboard error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting financial dashboard' 
            });
        }
    },

    // Get revenue dashboard
    getRevenueDashboard: async (req, res) => {
        try {
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const startOfYear = new Date(today.getFullYear(), 0, 1);

            const todayRevenue = await Payment.aggregate([
                {
                    $match: {
                        status: 'Completed',
                        paymentDate: {
                            $gte: new Date(today.setHours(0, 0, 0, 0)),
                            $lt: new Date(today.setHours(23, 59, 59, 999))
                        }
                    }
                },
                { $group: { _id: null, total: { $sum: '$paymentAmount' } } }
            ]);

            const monthlyRevenue = await Payment.aggregate([
                {
                    $match: {
                        status: 'Completed',
                        paymentDate: { $gte: startOfMonth }
                    }
                },
                { $group: { _id: null, total: { $sum: '$paymentAmount' } } }
            ]);

            const yearlyRevenue = await Payment.aggregate([
                {
                    $match: {
                        status: 'Completed',
                        paymentDate: { $gte: startOfYear }
                    }
                },
                { $group: { _id: null, total: { $sum: '$paymentAmount' } } }
            ]);

            const revenueByMethod = await Payment.aggregate([
                { $match: { status: 'Completed' } },
                {
                    $group: {
                        _id: '$paymentMethod',
                        total: { $sum: '$paymentAmount' },
                        count: { $sum: 1 }
                    }
                }
            ]);

            res.json({
                success: true,
                revenue: {
                    today: todayRevenue.length > 0 ? todayRevenue[0].total : 0,
                    thisMonth: monthlyRevenue.length > 0 ? monthlyRevenue[0].total : 0,
                    thisYear: yearlyRevenue.length > 0 ? yearlyRevenue[0].total : 0,
                    byMethod: revenueByMethod
                }
            });
        } catch (error) {
            console.error('Get revenue dashboard error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting revenue dashboard' 
            });
        }
    },

    // Get performance metrics
    getPerformanceMetrics: async (req, res) => {
        try {
            const totalLoans = await Loan.countDocuments();
            const completedLoans = await Loan.countDocuments({ status: 'Completed' });
            const overdueLoans = await Loan.countDocuments({ status: 'Overdue' });
            const defaultedLoans = await Loan.countDocuments({ status: 'Defaulted' });

            const completionRate = totalLoans > 0 ? (completedLoans / totalLoans) * 100 : 0;
            const overdueRate = totalLoans > 0 ? (overdueLoans / totalLoans) * 100 : 0;
            const defaultRate = totalLoans > 0 ? (defaultedLoans / totalLoans) * 100 : 0;

            const avgLoanAmount = await Loan.aggregate([
                { $group: { _id: null, avg: { $avg: '$loanAmount' } } }
            ]);

            const avgPaymentAmount = await Payment.aggregate([
                { $match: { status: 'Completed' } },
                { $group: { _id: null, avg: { $avg: '$paymentAmount' } } }
            ]);

            const customerRetention = await Customer.aggregate([
                {
                    $lookup: {
                        from: 'loans',
                        localField: '_id',
                        foreignField: 'customerId',
                        as: 'loans'
                    }
                },
                {
                    $match: {
                        'loans.1': { $exists: true } // Customers with more than 1 loan
                    }
                },
                { $count: 'repeatCustomers' }
            ]);

            const totalCustomers = await Customer.countDocuments({ isActive: true });
            const retentionRate = totalCustomers > 0 && customerRetention.length > 0 
                ? (customerRetention[0].repeatCustomers / totalCustomers) * 100 
                : 0;

            res.json({
                success: true,
                performance: {
                    completionRate: completionRate.toFixed(2),
                    overdueRate: overdueRate.toFixed(2),
                    defaultRate: defaultRate.toFixed(2),
                    retentionRate: retentionRate.toFixed(2),
                    avgLoanAmount: avgLoanAmount.length > 0 ? avgLoanAmount[0].avg.toFixed(2) : 0,
                    avgPaymentAmount: avgPaymentAmount.length > 0 ? avgPaymentAmount[0].avg.toFixed(2) : 0
                }
            });
        } catch (error) {
            console.error('Get performance metrics error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting performance metrics' 
            });
        }
    },

    // Get trend analysis
    getTrendAnalysis: async (req, res) => {
        try {
            const { period = 12 } = req.query; // Default to 12 months

            const loanTrends = await Loan.aggregate([
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
                { $limit: parseInt(period) }
            ]);

            const paymentTrends = await Payment.aggregate([
                { $match: { status: 'Completed' } },
                {
                    $group: {
                        _id: {
                            year: { $year: '$paymentDate' },
                            month: { $month: '$paymentDate' }
                        },
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$paymentAmount' }
                    }
                },
                { $sort: { '_id.year': -1, '_id.month': -1 } },
                { $limit: parseInt(period) }
            ]);

            const customerTrends = await Customer.aggregate([
                { $match: { isActive: true } },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': -1, '_id.month': -1 } },
                { $limit: parseInt(period) }
            ]);

            res.json({
                success: true,
                trends: {
                    loans: loanTrends.reverse(),
                    payments: paymentTrends.reverse(),
                    customers: customerTrends.reverse()
                }
            });
        } catch (error) {
            console.error('Get trend analysis error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting trend analysis' 
            });
        }
    },

    // Get portfolio analysis
    getPortfolioAnalysis: async (req, res) => {
        try {
            const portfolioByStatus = await Loan.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$loanAmount' },
                        totalOutstanding: { $sum: '$remainingBalance' }
                    }
                }
            ]);

            const portfolioByType = await Loan.aggregate([
                {
                    $group: {
                        _id: '$loanType',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$loanAmount' },
                        avgAmount: { $avg: '$loanAmount' }
                    }
                }
            ]);

            const portfolioByPeriod = await Loan.aggregate([
                {
                    $group: {
                        _id: '$loanPeriod',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$loanAmount' }
                    }
                }
            ]);

            const riskDistribution = await Loan.aggregate([
                {
                    $lookup: {
                        from: 'customers',
                        localField: 'customerId',
                        foreignField: '_id',
                        as: 'customer'
                    }
                },
                { $unwind: '$customer' },
                {
                    $group: {
                        _id: '$customer.riskLevel',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$loanAmount' }
                    }
                }
            ]);

            res.json({
                success: true,
                portfolio: {
                    byStatus: portfolioByStatus,
                    byType: portfolioByType,
                    byPeriod: portfolioByPeriod,
                    riskDistribution
                }
            });
        } catch (error) {
            console.error('Get portfolio analysis error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting portfolio analysis' 
            });
        }
    },

    // Get risk metrics
    getRiskMetrics: async (req, res) => {
        try {
            const totalLoans = await Loan.countDocuments();
            const overdueLoans = await Loan.countDocuments({ status: 'Overdue' });
            const defaultedLoans = await Loan.countDocuments({ status: 'Defaulted' });

            const totalOutstanding = await Loan.aggregate([
                { $match: { status: { $in: ['Active', 'Overdue', 'Not Paid'] } } },
                { $group: { _id: null, total: { $sum: '$remainingBalance' } } }
            ]);

            const overdueAmount = await Loan.aggregate([
                { $match: { status: 'Overdue' } },
                { $group: { _id: null, total: { $sum: '$remainingBalance' } } }
            ]);

            const riskByCustomer = await Customer.aggregate([
                {
                    $group: {
                        _id: '$riskLevel',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const concentrationRisk = await Loan.aggregate([
                {
                    $group: {
                        _id: '$customerId',
                        totalExposure: { $sum: '$remainingBalance' },
                        loanCount: { $sum: 1 }
                    }
                },
                { $sort: { totalExposure: -1 } },
                { $limit: 10 }
            ]);

            res.json({
                success: true,
                risk: {
                    overdueRate: totalLoans > 0 ? ((overdueLoans / totalLoans) * 100).toFixed(2) : 0,
                    defaultRate: totalLoans > 0 ? ((defaultedLoans / totalLoans) * 100).toFixed(2) : 0,
                    totalOutstanding: totalOutstanding.length > 0 ? totalOutstanding[0].total : 0,
                    overdueAmount: overdueAmount.length > 0 ? overdueAmount[0].total : 0,
                    riskByCustomer,
                    topExposures: concentrationRisk
                }
            });
        } catch (error) {
            console.error('Get risk metrics error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting risk metrics' 
            });
        }
    },

    // Get recent activities
    getRecentActivities: async (req, res) => {
        try {
            const { limit = 20 } = req.query;

            const recentCustomers = await Customer.find({ isActive: true })
                .populate('createdBy', 'name userid')
                .sort({ createdAt: -1 })
                .limit(5);

            const recentLoans = await Loan.find()
                .populate('createdBy', 'name userid')
                .sort({ createdAt: -1 })
                .limit(5);

            const recentPayments = await Payment.find({ status: 'Completed' })
                .populate('recordedBy', 'name userid')
                .sort({ createdAt: -1 })
                .limit(5);

            const activities = [
                ...recentCustomers.map(c => ({
                    type: 'customer_created',
                    description: `Customer ${c.fullName} created`,
                    user: c.createdBy,
                    timestamp: c.createdAt,
                    icon: 'user-plus'
                })),
                ...recentLoans.map(l => ({
                    type: 'loan_created',
                    description: `Loan of K${l.loanAmount} created for ${l.customerName}`,
                    user: l.createdBy,
                    timestamp: l.createdAt,
                    icon: 'credit-card'
                })),
                ...recentPayments.map(p => ({
                    type: 'payment_recorded',
                    description: `Payment of K${p.paymentAmount} recorded for ${p.customerName}`,
                    user: p.recordedBy,
                    timestamp: p.createdAt,
                    icon: 'dollar-sign'
                }))
            ].sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);

            res.json({
                success: true,
                activities
            });
        } catch (error) {
            console.error('Get recent activities error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting recent activities' 
            });
        }
    },

    // Get notifications
    getNotifications: async (req, res) => {
        try {
            const notifications = await Message.find({ isRead: false })
                .populate('customerId', 'fullName phoneNumber')
                .populate('loanId', 'loanAmount loanType')
                .sort({ createdAt: -1 })
                .limit(10);

            const notificationCount = await Message.countDocuments({ isRead: false });

            res.json({
                success: true,
                notifications,
                count: notificationCount
            });
        } catch (error) {
            console.error('Get notifications error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting notifications' 
            });
        }
    },

    // Get loan status chart data
    getLoanStatusChart: async (req, res) => {
        try {
            const statusData = await Loan.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$loanAmount' }
                    }
                }
            ]);

            const chartData = statusData.map(item => ({
                label: item._id,
                value: item.count,
                amount: item.totalAmount
            }));

            res.json({
                success: true,
                chartData
            });
        } catch (error) {
            console.error('Get loan status chart error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting loan status chart' 
            });
        }
    },

    // Get payment trends chart data
    getPaymentTrendsChart: async (req, res) => {
        try {
            const { period = 12 } = req.query;

            const trendData = await Payment.aggregate([
                { $match: { status: 'Completed' } },
                {
                    $group: {
                        _id: {
                            year: { $year: '$paymentDate' },
                            month: { $month: '$paymentDate' }
                        },
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$paymentAmount' }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } },
                { $limit: parseInt(period) }
            ]);

            const chartData = trendData.map(item => ({
                period: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
                count: item.count,
                amount: item.totalAmount
            }));

            res.json({
                success: true,
                chartData
            });
        } catch (error) {
            console.error('Get payment trends chart error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting payment trends chart' 
            });
        }
    },

    // Get customer growth chart data
    getCustomerGrowthChart: async (req, res) => {
        try {
            const { period = 12 } = req.query;

            const growthData = await Customer.aggregate([
                { $match: { isActive: true } },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } },
                { $limit: parseInt(period) }
            ]);

            let cumulativeCount = 0;
            const chartData = growthData.map(item => {
                cumulativeCount += item.count;
                return {
                    period: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
                    newCustomers: item.count,
                    totalCustomers: cumulativeCount
                };
            });

            res.json({
                success: true,
                chartData
            });
        } catch (error) {
            console.error('Get customer growth chart error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting customer growth chart' 
            });
        }
    },

    // Get alerts
    getAlerts: async (req, res) => {
        try {
            const overdueLoans = await Loan.countDocuments({ status: 'Overdue' });
            const dueSoonLoans = await Loan.countDocuments({
                status: { $in: ['Active', 'Not Paid'] },
                dueDate: { 
                    $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    $gte: new Date()
                }
            });

            const highPriorityMessages = await Message.countDocuments({
                priority: { $in: ['high', 'urgent'] },
                isRead: false
            });

            const alerts = [];

            if (overdueLoans > 0) {
                alerts.push({
                    type: 'overdue',
                    message: `${overdueLoans} loan(s) are overdue`,
                    severity: 'high',
                    count: overdueLoans
                });
            }

            if (dueSoonLoans > 0) {
                alerts.push({
                    type: 'due_soon',
                    message: `${dueSoonLoans} loan(s) are due within 7 days`,
                    severity: 'medium',
                    count: dueSoonLoans
                });
            }

            if (highPriorityMessages > 0) {
                alerts.push({
                    type: 'messages',
                    message: `${highPriorityMessages} high priority message(s)`,
                    severity: 'medium',
                    count: highPriorityMessages
                });
            }

            res.json({
                success: true,
                alerts
            });
        } catch (error) {
            console.error('Get alerts error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting alerts' 
            });
        }
    },

    // Get reminders
    getReminders: async (req, res) => {
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);

            const dueTomorrow = await Loan.find({
                status: { $in: ['Active', 'Not Paid'] },
                dueDate: {
                    $gte: new Date(tomorrow.setHours(0, 0, 0, 0)),
                    $lt: new Date(tomorrow.setHours(23, 59, 59, 999))
                }
            }).populate('customerId', 'fullName phoneNumber');

            const dueNextWeek = await Loan.find({
                status: { $in: ['Active', 'Not Paid'] },
                dueDate: {
                    $gte: new Date(),
                    $lte: nextWeek
                }
            }).populate('customerId', 'fullName phoneNumber');

            const reminders = [
                ...dueTomorrow.map(loan => ({
                    type: 'payment_due_tomorrow',
                    message: `Payment due tomorrow for ${loan.customerName}`,
                    amount: loan.remainingBalance,
                    customer: loan.customerId,
                    dueDate: loan.dueDate
                })),
                ...dueNextWeek.map(loan => ({
                    type: 'payment_due_week',
                    message: `Payment due within a week for ${loan.customerName}`,
                    amount: loan.remainingBalance,
                    customer: loan.customerId,
                    dueDate: loan.dueDate
                }))
            ];

            res.json({
                success: true,
                reminders
            });
        } catch (error) {
            console.error('Get reminders error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting reminders' 
            });
        }
    }
};

module.exports = dashboardController;