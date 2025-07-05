const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticateToken, checkPermission } = require('../middleware/auth');

// Message CRUD routes
router.get('/', authenticateToken, messageController.getAllMessages);
router.get('/:id', authenticateToken, messageController.getMessageById);
router.post('/', authenticateToken, messageController.createMessage);
router.put('/:id', authenticateToken, messageController.updateMessage);
router.delete('/:id', authenticateToken, messageController.deleteMessage);

// Message actions
router.put('/:id/read', authenticateToken, messageController.markAsRead);
router.put('/:id/unread', authenticateToken, messageController.markAsUnread);
router.put('/bulk/read', authenticateToken, messageController.bulkMarkAsRead);
router.delete('/bulk/delete', authenticateToken, messageController.bulkDeleteMessages);

// Message filtering
router.get('/filter/unread', authenticateToken, messageController.getUnreadMessages);
router.get('/filter/type/:type', authenticateToken, messageController.getMessagesByType);
router.get('/filter/priority/:priority', authenticateToken, messageController.getMessagesByPriority);

// Message statistics
router.get('/stats/overview', authenticateToken, messageController.getMessageStats);
router.get('/stats/types', authenticateToken, messageController.getMessageTypeStats);

module.exports = router;