const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, adminOnly, adminOrSubAdmin, checkWorkingHours } = require('../middleware/auth');

// User management routes (Admin only)
router.get('/users', authenticateToken, adminOnly, adminController.getAllUsers);
router.get('/users/:id', authenticateToken, adminOnly, adminController.getUserById);
router.post('/users', authenticateToken, adminOnly, adminController.createUser);
router.put('/users/:id', authenticateToken, adminOnly, adminController.updateUser);
router.delete('/users/:id', authenticateToken, adminOnly, adminController.deleteUser);

// Subadmin management routes (Admin only)
router.get('/subadmins', authenticateToken, adminOnly, adminController.getAllSubAdmins);
router.post('/subadmins', authenticateToken, adminOnly, adminController.createSubAdmin);
router.put('/subadmins/:id', authenticateToken, adminOnly, adminController.updateSubAdmin);
router.delete('/subadmins/:id', authenticateToken, adminOnly, adminController.deleteSubAdmin);

// User restrictions and permissions (Admin only)
router.put('/users/:id/permissions', authenticateToken, adminOnly, adminController.updateUserPermissions);
router.put('/users/:id/restrictions', authenticateToken, adminOnly, adminController.updateUserRestrictions);
router.put('/users/:id/activate', authenticateToken, adminOnly, adminController.activateUser);
router.put('/users/:id/deactivate', authenticateToken, adminOnly, adminController.deactivateUser);

// System management routes (Admin or SubAdmin)
router.get('/system-stats', authenticateToken, adminOrSubAdmin, adminController.getSystemStats);
router.get('/activity-log', authenticateToken, adminOrSubAdmin, adminController.getActivityLog);
router.get('/user-sessions', authenticateToken, adminOrSubAdmin, adminController.getUserSessions);

// Bulk operations (Admin only)
router.post('/users/bulk-create', authenticateToken, adminOnly, adminController.bulkCreateUsers);
router.put('/users/bulk-update', authenticateToken, adminOnly, adminController.bulkUpdateUsers);
router.delete('/users/bulk-delete', authenticateToken, adminOnly, adminController.bulkDeleteUsers);

// System configuration (Admin only)
router.get('/config', authenticateToken, adminOnly, adminController.getSystemConfig);
router.put('/config', authenticateToken, adminOnly, adminController.updateSystemConfig);

module.exports = router;