const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Get Gmail OAuth authorization URL
router.get('/auth/url', emailController.getAuthUrl);

// Handle OAuth callback
router.post('/auth/callback', emailController.handleCallback);

// Manually trigger email sync
router.post('/sync', emailController.syncEmails);

// Get sync status
router.get('/sync/status', emailController.getSyncStatus);

// Disconnect Gmail integration
router.delete('/disconnect', emailController.disconnect);

// Get list of recent emails
router.get('/emails', emailController.getRecentEmails);

// Get sync statistics
router.get('/sync/stats', emailController.getSyncStats);

// Update sync preferences
router.put('/sync/preferences', emailController.updateSyncPreferences);

// Sync all users (admin - for now, no auth check, add later if needed)
router.post('/sync/all', emailController.syncAllUsers);

module.exports = router;
