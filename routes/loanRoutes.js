const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const { authenticateToken, checkPermission, checkWorkingHours } = require('../middleware/auth');

// Loan CRUD routes
router.get('/', authenticateToken, checkPermission('read_loans'), loanController.getAllLoans);
router.get('/:id', authenticateToken, checkPermission('read_loans'), loanController.getLoanById);
router.post('/', authenticateToken, checkPermission('write_loans'), checkWorkingHours, loanController.createLoan);
router.put('/:id', authenticateToken, checkPermission('write_loans'), checkWorkingHours, loanController.updateLoan);
router.delete('/:id', authenticateToken, checkPermission('delete_loans'), loanController.deleteLoan);

// Loan details and relationships
router.get('/:id/details', authenticateToken, checkPermission('read_loans'), loanController.getLoanDetails);
router.get('/:id/payments', authenticateToken, checkPermission('read_payments'), loanController.getLoanPayments);
router.get('/:id/summary', authenticateToken, checkPermission('read_loans'), loanController.getLoanSummary);

// Loan actions
router.post('/:id/reloan', authenticateToken, checkPermission('write_loans'), checkWorkingHours, loanController.createReloan);
router.put('/:id/approve', authenticateToken, checkPermission('write_loans'), loanController.approveLoan);
router.put('/:id/reject', authenticateToken, checkPermission('write_loans'), loanController.rejectLoan);
router.put('/:id/cancel', authenticateToken, checkPermission('write_loans'), loanController.cancelLoan);

// Loan filtering and search
router.get('/filter/status/:status', authenticateToken, checkPermission('read_loans'), loanController.getLoansByStatus);
router.get('/filter/overdue', authenticateToken, checkPermission('read_loans'), loanController.getOverdueLoans);
router.get('/filter/due-soon', authenticateToken, checkPermission('read_loans'), loanController.getDueSoonLoans);
router.get('/search/:query', authenticateToken, checkPermission('read_loans'), loanController.searchLoans);

// Loan statistics
router.get('/stats/overview', authenticateToken, checkPermission('read_loans'), loanController.getLoanStats);
router.get('/stats/performance', authenticateToken, checkPermission('read_loans'), loanController.getLoanPerformance);

// Bulk operations
router.put('/bulk/update-status', authenticateToken, checkPermission('write_loans'), loanController.bulkUpdateLoanStatus);
router.post('/bulk/create', authenticateToken, checkPermission('write_loans'), loanController.bulkCreateLoans);

// Loan calculations
router.post('/calculate', authenticateToken, checkPermission('read_loans'), loanController.calculateLoan);
router.get('/interest-rates', authenticateToken, checkPermission('read_loans'), loanController.getInterestRates);

module.exports = router;