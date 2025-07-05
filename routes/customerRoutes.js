const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticateToken, checkPermission, checkWorkingHours } = require('../middleware/auth');

// Customer CRUD routes
router.get('/', authenticateToken, checkPermission('read_customers'), customerController.getAllCustomers);
router.get('/:id', authenticateToken, checkPermission('read_customers'), customerController.getCustomerById);
router.post('/', authenticateToken, checkPermission('write_customers'), checkWorkingHours, customerController.createCustomer);
router.put('/:id', authenticateToken, checkPermission('write_customers'), checkWorkingHours, customerController.updateCustomer);
router.delete('/:id', authenticateToken, checkPermission('delete_customers'), customerController.deleteCustomer);

// Customer relationships
router.get('/:id/loans', authenticateToken, checkPermission('read_loans'), customerController.getCustomerLoans);
router.get('/:id/payments', authenticateToken, checkPermission('read_payments'), customerController.getCustomerPayments);
router.get('/:id/summary', authenticateToken, checkPermission('read_customers'), customerController.getCustomerSummary);

// Search and filtering
router.get('/search/:query', authenticateToken, checkPermission('read_customers'), customerController.searchCustomers);
router.get('/filter/active', authenticateToken, checkPermission('read_customers'), customerController.getActiveCustomers);
router.get('/filter/inactive', authenticateToken, checkPermission('read_customers'), customerController.getInactiveCustomers);

// Customer statistics
router.get('/stats/overview', authenticateToken, checkPermission('read_customers'), customerController.getCustomerStats);
router.get('/stats/demographics', authenticateToken, checkPermission('read_customers'), customerController.getCustomerDemographics);

// Bulk operations
router.post('/bulk/create', authenticateToken, checkPermission('write_customers'), customerController.bulkCreateCustomers);
router.put('/bulk/update', authenticateToken, checkPermission('write_customers'), customerController.bulkUpdateCustomers);
router.delete('/bulk/delete', authenticateToken, checkPermission('delete_customers'), customerController.bulkDeleteCustomers);

// Customer validation
router.post('/validate/nrc', authenticateToken, checkPermission('read_customers'), customerController.validateNRC);
router.post('/validate/phone', authenticateToken, checkPermission('read_customers'), customerController.validatePhone);

module.exports = router;