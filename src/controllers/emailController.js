const emailService = require('../services/emailService');
const transactionParser = require('../services/transactionParser');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

/**
 * Get Gmail OAuth authorization URL
 */
exports.getAuthUrl = async (req, res) => {
    try {
        const authUrl = emailService.getAuthUrl();
        res.json({ authUrl });
    } catch (error) {
        console.error('Error generating auth URL:', error);
        res.status(500).json({ message: 'Failed to generate authorization URL', error: error.message });
    }
};

/**
 * Handle OAuth callback and save tokens
 */
exports.handleCallback = async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ message: 'Authorization code is required' });
        }

        // Exchange code for tokens
        const tokens = await emailService.getTokensFromCode(code);

        // Save tokens to user
        await emailService.saveTokens(req.user._id, tokens);

        const userAfter = await User.findById(req.user._id);
        if (!userAfter?.gmailRefreshToken) {
            return res.status(400).json({
                message:
                    'Gmail did not return a refresh token. Revoke app access in your Google account and connect again.',
            });
        }

        res.json({
            message: 'Gmail connected successfully',
            emailSyncEnabled: true,
        });
    } catch (error) {
        console.error('Error handling OAuth callback:', error);
        res.status(500).json({ message: 'Failed to connect Gmail', error: error.message });
    }
};

/**
 * Link Gmail using Google Sign-In serverAuthCode (single consent at app login).
 * Body: { serverAuthCode: string }
 */
exports.exchangeServerAuthCode = async (req, res) => {
    try {
        const { serverAuthCode } = req.body;
        if (!serverAuthCode || typeof serverAuthCode !== 'string') {
            return res.status(400).json({ message: 'serverAuthCode is required' });
        }

        const tokens = await emailService.getTokensFromServerAuthCode(serverAuthCode);
        await emailService.saveTokens(req.user._id, tokens);

        const userAfter = await User.findById(req.user._id);
        if (!userAfter?.gmailRefreshToken) {
            return res.status(400).json({
                message:
                    'Gmail did not return a refresh token. Sign out of the app and sign in again with Google, or reconnect Gmail from Profile.',
            });
        }

        res.json({
            message: 'Gmail connected successfully',
            emailSyncEnabled: true,
        });
    } catch (error) {
        console.error('Error exchanging server auth code:', error);
        res.status(500).json({ message: 'Failed to link Gmail', error: error.message });
    }
};

/**
 * Manually trigger email sync
 */
exports.syncEmails = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user.emailSyncEnabled || !user.gmailRefreshToken) {
            return res.status(400).json({ message: 'Gmail not connected. Please authorize first.' });
        }

        // Resolve date window: explicit query param wins, else use user sync preference.
        let afterDate = req.query.after;
        if (!afterDate) {
            const windowHours = Number(user.syncWindowHours) || 24;
            const start = new Date();
            start.setHours(start.getHours() - windowHours);
            afterDate = start.toISOString().split('T')[0].replace(/-/g, '/');
        }

        // Fetch transaction emails
        const emails = await emailService.fetchTransactionEmails(req.user._id, {
            maxResults: parseInt(req.query.maxResults, 10) || 100,
            after: afterDate,
        });

        let processedCount = 0;
        let createdCount = 0;
        let failedCount = 0;
        const createdTransactions = [];

        // Process each email
        for (const email of emails) {
            try {
                processedCount++;

                // Extract email details
                const subject = emailService.getEmailSubject(email);
                const body = emailService.getEmailBody(email);
                const sender = emailService.getEmailSender(email);
                const emailDate = emailService.getEmailDate(email);
                const emailMessageId = String(email?.id || '');

                console.log(`\n📩 Processing email ${processedCount}/${emails.length}: "${subject}" from ${sender}`);

                // Parse transaction
                const transactionData = transactionParser.parseTransaction(body, subject, sender);

                if (transactionData) {
                    // Use the email header date as source-of-truth instead of parsing date strings from body text.
                    transactionData.date = emailDate;
                    const docToInsert = {
                        user: req.user._id,
                        ...transactionData,
                        source: 'email',
                        metadata: {
                            ...(transactionData.metadata || {}),
                            emailMessageId,
                            emailSubject: subject,
                            emailSender: sender,
                            emailDate,
                        },
                    };

                    // Atomic dedupe by Gmail message id; handles repeated logins and concurrent syncs safely.
                    if (emailMessageId) {
                        const result = await Transaction.findOneAndUpdate(
                            {
                                user: req.user._id,
                                'metadata.emailMessageId': emailMessageId,
                            },
                            { $setOnInsert: docToInsert },
                            {
                                upsert: true,
                                new: true,
                                rawResult: true,
                            },
                        );

                        if (result?.lastErrorObject?.updatedExisting) {
                            console.log(`   ⏭️ Skipped (duplicate email id): ₹${transactionData.amount}`);
                        } else if (result?.value) {
                            createdTransactions.push(result.value);
                            createdCount++;
                            console.log(`   ✅ Created: ₹${transactionData.amount} (${transactionData.type})`);
                        }
                    } else {
                        // Fallback dedupe if message id is unavailable (rare).
                        const existingTransaction = await Transaction.findOne({
                            user: req.user._id,
                            amount: transactionData.amount,
                            type: transactionData.type,
                            description: transactionData.description,
                            'metadata.emailSubject': subject,
                            'metadata.emailSender': sender,
                        });

                        if (!existingTransaction) {
                            const transaction = await Transaction.create(docToInsert);
                            createdTransactions.push(transaction);
                            createdCount++;
                            console.log(`   ✅ Created: ₹${transactionData.amount} (${transactionData.type})`);
                        } else {
                            console.log(`   ⏭️ Skipped (duplicate fallback): ₹${transactionData.amount}`);
                        }
                    }
                } else {
                    failedCount++;
                    console.log(`   ❌ Could not parse transaction from this email`);
                }
            } catch (error) {
                console.error('Error processing email:', error);
                failedCount++;
            }
        }

        res.json({
            message: 'Email sync completed',
            stats: {
                emailsProcessed: processedCount,
                transactionsCreated: createdCount,
                failedToParse: failedCount,
            },
            transactions: createdTransactions,
        });
    } catch (error) {
        console.error('Error syncing emails:', error);
        res.status(500).json({ message: 'Failed to sync emails', error: error.message });
    }
};

/**
 * Get sync status
 */
exports.getSyncStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        res.json({
            emailSyncEnabled: user.emailSyncEnabled || false,
            lastEmailSync: user.lastEmailSync || null,
            gmailConnected: !!user.gmailRefreshToken,
        });
    } catch (error) {
        console.error('Error getting sync status:', error);
        res.status(500).json({ message: 'Failed to get sync status', error: error.message });
    }
};

/**
 * Disconnect Gmail integration
 */
exports.disconnect = async (req, res) => {
    try {
        await emailService.disconnect(req.user._id);

        res.json({
            message: 'Gmail disconnected successfully',
            emailSyncEnabled: false,
        });
    } catch (error) {
        console.error('Error disconnecting Gmail:', error);
        res.status(500).json({ message: 'Failed to disconnect Gmail', error: error.message });
    }
};

/**
 * Get list of recent emails
 */
exports.getRecentEmails = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user.emailSyncEnabled || !user.gmailRefreshToken) {
            return res.status(400).json({ message: 'Gmail not connected. Please authorize first.' });
        }

        // Resolve date window: explicit query param wins, else use user sync preference.
        let afterDate = req.query.after;
        if (!afterDate) {
            const windowHours = Number(user.syncWindowHours) || 24;
            const start = new Date();
            start.setHours(start.getHours() - windowHours);
            afterDate = start.toISOString().split('T')[0].replace(/-/g, '/');
        }

        // Fetch emails
        const emails = await emailService.fetchTransactionEmails(req.user._id, {
            maxResults: parseInt(req.query.maxResults) || 100,
            after: afterDate,
        });

        // Extract email metadata
        const emailList = emails.map(email => {
            const subject = emailService.getEmailSubject(email);
            const sender = emailService.getEmailSender(email);
            const date = emailService.getEmailDate(email);
            const snippet = email.snippet || '';

            return {
                id: email.id,
                subject,
                sender,
                date,
                snippet: snippet.substring(0, 150), // First 150 chars
            };
        });

        res.json({
            count: emailList.length,
            emails: emailList,
        });
    } catch (error) {
        console.error('Error fetching emails:', error);
        res.status(500).json({ message: 'Failed to fetch emails', error: error.message });
    }
};

/**
 * Get sync statistics
 */
exports.getSyncStats = async (req, res) => {
    try {
        const emailSyncService = require('../services/emailSyncService');
        const stats = await emailSyncService.getUserSyncStats(req.user._id);
        res.json(stats);
    } catch (error) {
        console.error('Error getting sync stats:', error);
        res.status(500).json({ message: 'Failed to get sync stats', error: error.message });
    }
};

/**
 * Update sync preferences
 */
exports.updateSyncPreferences = async (req, res) => {
    try {
        const emailSyncService = require('../services/emailSyncService');
        const result = await emailSyncService.updateSyncPreferences(req.user._id, req.body);
        res.json(result);
    } catch (error) {
        console.error('Error updating sync preferences:', error);
        res.status(400).json({ message: error.message });
    }
};

/**
 * Sync all users (admin only)
 */
exports.syncAllUsers = async (req, res) => {
    try {
        const emailSyncService = require('../services/emailSyncService');
        const result = await emailSyncService.syncAllUsers();
        res.json(result);
    } catch (error) {
        console.error('Error syncing all users:', error);
        res.status(500).json({ message: 'Failed to sync all users', error: error.message });
    }
};
