const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken, checkPermission, checkWorkingHours } = require('../middleware/auth');

// Payment CRUD routes
router.get('/', authenticateToken, checkPermission('read_payments'), paymentController.getAllPayments);
router.get('/:id', authenticateToken, checkPermission('read_payments'), paymentController.getPaymentById);
router.post('/', authenticateToken, checkPermission('write_payments'), checkWorkingHours, paymentController.createPayment);
router.put('/:id', authenticateToken, checkPermission('write_payments'), checkWorkingHours, paymentController.updatePayment);
router.delete('/:id', authenticateToken, checkPermission('write_payments'), paymentController.deletePayment);

// Payment actions
router.put('/:id/reverse', authenticateToken, checkPermission('reverse_payments'), paymentController.reversePayment);
router.put('/:id/confirm', authenticateToken, checkPermission('write_payments'), paymentController.confirmPayment);
router.put('/:id/fail', authenticateToken, checkPermission('write_payments'), paymentController.failPayment);

// Payment methods
router.post('/cash', authenticateToken, checkPermission('write_payments'), checkWorkingHours, paymentController.processCashPayment);
router.post('/mobile-money', authenticateToken, checkPermission('write_payments'), checkWorkingHours, paymentController.processMobileMoneyPayment);
router.post('/bank-transfer', authenticateToken, checkPermission('write_payments'), checkWorkingHours, paymentController.processBankTransferPayment);

// Payment filtering and search
router.get('/filter/method/:method', authenticateToken, checkPermission('read_payments'), paymentController.getPaymentsByMethod);
router.get('/filter/status/:status', authenticateToken, checkPermission('read_payments'), paymentController.getPaymentsByStatus);
router.get('/filter/date-range', authenticateToken, checkPermission('read_payments'), paymentController.getPaymentsByDateRange);
router.get('/search/:query', authenticateToken, checkPermission('read_payments'), paymentController.searchPayments);

// Payment statistics
router.get('/stats/overview', authenticateToken, checkPermission('read_payments'), paymentController.getPaymentStats);
router.get('/stats/methods', authenticateToken, checkPermission('read_payments'), paymentController.getPaymentMethodStats);
router.get('/stats/daily', authenticateToken, checkPermission('read_payments'), paymentController.getDailyPaymentStats);

// Receipt generation
router.get('/:id/receipt', authenticateToken, checkPermission('read_payments'), paymentController.generateReceipt);
router.get('/:id/receipt/pdf', authenticateToken, checkPermission('read_payments'), paymentController.generateReceiptPDF);

// Bulk operations
router.post('/bulk/create', authenticateToken, checkPermission('write_payments'), paymentController.bulkCreatePayments);
router.put('/bulk/confirm', authenticateToken, checkPermission('write_payments'), paymentController.bulkConfirmPayments);
router.put('/bulk/reverse', authenticateToken, checkPermission('reverse_payments'), paymentController.bulkReversePayments);

module.exports = router;