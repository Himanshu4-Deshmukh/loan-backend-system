const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken, checkPermission } = require('../middleware/auth');

// Customer reports
router.get('/customers/:format', authenticateToken, checkPermission('read_reports'), reportController.generateCustomerReport);
router.get('/customers/demographics/:format', authenticateToken, checkPermission('read_reports'), reportController.generateCustomerDemographicsReport);

// Loan reports
router.get('/loans/:format', authenticateToken, checkPermission('read_reports'), reportController.generateLoanReport);
router.get('/loans/overdue/:format', authenticateToken, checkPermission('read_reports'), reportController.generateOverdueReport);
router.get('/loans/active/:format', authenticateToken, checkPermission('read_reports'), reportController.generateActiveLoansReport);
router.get('/loans/completed/:format', authenticateToken, checkPermission('read_reports'), reportController.generateCompletedLoansReport);

// Payment reports
router.get('/payments/:format', authenticateToken, checkPermission('read_reports'), reportController.generatePaymentReport);
router.get('/payments/methods/:format', authenticateToken, checkPermission('read_reports'), reportController.generatePaymentMethodReport);
router.get('/payments/daily/:format', authenticateToken, checkPermission('read_reports'), reportController.generateDailyPaymentReport);

// Reloan reports
router.get('/reloans/:format', authenticateToken, checkPermission('read_reports'), reportController.generateReloanReport);

// Monthly and period reports
router.get('/monthly/:year/:month/:format', authenticateToken, checkPermission('read_reports'), reportController.generateMonthlyReport);
router.get('/period/:startDate/:endDate/:format', authenticateToken, checkPermission('read_reports'), reportController.generatePeriodReport);

// Financial reports
router.get('/financial/portfolio/:format', authenticateToken, checkPermission('read_reports'), reportController.generatePortfolioReport);
router.get('/financial/profitability/:format', authenticateToken, checkPermission('read_reports'), reportController.generateProfitabilityReport);
router.get('/financial/cash-flow/:format', authenticateToken, checkPermission('read_reports'), reportController.generateCashFlowReport);

// Risk and compliance reports
router.get('/risk/default-analysis/:format', authenticateToken, checkPermission('read_reports'), reportController.generateDefaultAnalysisReport);
router.get('/risk/portfolio-health/:format', authenticateToken, checkPermission('read_reports'), reportController.generatePortfolioHealthReport);

// Custom reports
router.post('/custom/:format', authenticateToken, checkPermission('generate_reports'), reportController.generateCustomReport);

// Report templates
router.get('/templates', authenticateToken, checkPermission('read_reports'), reportController.getReportTemplates);
router.post('/templates', authenticateToken, checkPermission('generate_reports'), reportController.createReportTemplate);

module.exports = router;