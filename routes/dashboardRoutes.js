const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, checkPermission } = require('../middleware/auth');

// Dashboard overview
router.get('/stats', authenticateToken, dashboardController.getDashboardStats);
router.get('/overview', authenticateToken, dashboardController.getDashboardOverview);

// Financial dashboard
router.get('/financial', authenticateToken, checkPermission('read_reports'), dashboardController.getFinancialDashboard);
router.get('/revenue', authenticateToken, checkPermission('read_reports'), dashboardController.getRevenueDashboard);

// Performance metrics
router.get('/performance', authenticateToken, checkPermission('read_reports'), dashboardController.getPerformanceMetrics);
router.get('/trends', authenticateToken, checkPermission('read_reports'), dashboardController.getTrendAnalysis);

// Portfolio analysis
router.get('/portfolio', authenticateToken, checkPermission('read_reports'), dashboardController.getPortfolioAnalysis);
router.get('/risk-metrics', authenticateToken, checkPermission('read_reports'), dashboardController.getRiskMetrics);

// Recent activities
router.get('/recent-activities', authenticateToken, dashboardController.getRecentActivities);
router.get('/notifications', authenticateToken, dashboardController.getNotifications);

// Charts and graphs data
router.get('/charts/loan-status', authenticateToken, dashboardController.getLoanStatusChart);
router.get('/charts/payment-trends', authenticateToken, dashboardController.getPaymentTrendsChart);
router.get('/charts/customer-growth', authenticateToken, dashboardController.getCustomerGrowthChart);

// Alerts and reminders
router.get('/alerts', authenticateToken, dashboardController.getAlerts);
router.get('/reminders', authenticateToken, dashboardController.getReminders);

module.exports = router;