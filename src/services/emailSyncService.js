const emailService = require('./emailService');
const transactionParser = require('./transactionParser');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

class EmailSyncService {
    /**
     * Sync emails for a specific user
     */
    async syncUserEmails(userId) {
        const startTime = Date.now();
        console.log(`[EmailSync] Starting sync for user: ${userId}`);

        try {
            const user = await User.findById(userId);

            if (!user || !user.emailSyncEnabled || !user.autoSyncEnabled) {
                console.log(`[EmailSync] Sync disabled for user: ${userId}`);
                return {
                    success: false,
                    reason: 'Sync disabled',
                    userId,
                };
            }

            // Calculate date filter based on sync window
            const syncWindowDate = new Date();
            syncWindowDate.setHours(syncWindowDate.getHours() - (user.syncWindowHours || 24));
            const afterDate = syncWindowDate.toISOString().split('T')[0].replace(/-/g, '/');

            // Fetch emails
            const emails = await emailService.fetchTransactionEmails(userId, {
                maxResults: parseInt(process.env.EMAIL_SYNC_MAX_RESULTS) || 50,
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

                    const subject = emailService.getEmailSubject(email);
                    const body = emailService.getEmailBody(email);
                    const sender = emailService.getEmailSender(email);

                    // Parse transaction
                    const transactionData = transactionParser.parseTransaction(body, subject, sender);

                    if (transactionData) {
                        // Check for duplicates
                        const existingTransaction = await Transaction.findOne({
                            user: userId,
                            amount: transactionData.amount,
                            date: transactionData.date,
                            'metadata.emailSubject': subject,
                        });

                        if (!existingTransaction) {
                            const transaction = await Transaction.create({
                                user: userId,
                                ...transactionData,
                            });
                            createdTransactions.push(transaction);
                            createdCount++;
                        }
                    } else {
                        failedCount++;
                    }
                } catch (error) {
                    console.error(`[EmailSync] Error processing email:`, error.message);
                    failedCount++;
                }
            }

            // Update user sync status
            await User.findByIdAndUpdate(userId, {
                lastEmailSync: new Date(),
                lastSyncStatus: 'success',
                syncErrorCount: 0,
            });

            const duration = Date.now() - startTime;
            console.log(`[EmailSync] Completed for user ${userId}: ${createdCount} transactions created in ${duration}ms`);

            return {
                success: true,
                userId,
                stats: {
                    emailsProcessed: processedCount,
                    transactionsCreated: createdCount,
                    failedToParse: failedCount,
                    duration,
                },
                transactions: createdTransactions,
            };
        } catch (error) {
            console.error(`[EmailSync] Failed for user ${userId}:`, error.message);

            // Update error count
            const user = await User.findById(userId);
            if (user) {
                await User.findByIdAndUpdate(userId, {
                    lastSyncStatus: 'failed',
                    syncErrorCount: (user.syncErrorCount || 0) + 1,
                });
            }

            return {
                success: false,
                userId,
                error: error.message,
            };
        }
    }

    /**
     * Sync emails for all users with auto-sync enabled
     */
    async syncAllUsers() {
        console.log('[EmailSync] Starting sync for all users...');
        const startTime = Date.now();

        try {
            // Find all users with Gmail connected and auto-sync enabled
            const users = await User.find({
                emailSyncEnabled: true,
                autoSyncEnabled: true,
                gmailRefreshToken: { $exists: true, $ne: null },
            });

            console.log(`[EmailSync] Found ${users.length} users to sync`);

            const results = [];
            let successCount = 0;
            let failureCount = 0;

            // Sync each user
            for (const user of users) {
                const result = await this.syncUserEmails(user._id);
                results.push(result);

                if (result.success) {
                    successCount++;
                } else {
                    failureCount++;
                }

                // Add small delay between users to avoid rate limiting
                await this.sleep(1000);
            }

            const duration = Date.now() - startTime;
            console.log(`[EmailSync] Completed all users: ${successCount} succeeded, ${failureCount} failed in ${duration}ms`);

            return {
                success: true,
                totalUsers: users.length,
                successCount,
                failureCount,
                duration,
                results,
            };
        } catch (error) {
            console.error('[EmailSync] Error syncing all users:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Get sync statistics for a user
     */
    async getUserSyncStats(userId) {
        const user = await User.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        // Get transaction count from last sync
        const lastSyncDate = user.lastEmailSync || new Date(0);
        const transactionsSinceLastSync = await Transaction.countDocuments({
            user: userId,
            source: 'email',
            createdAt: { $gte: lastSyncDate },
        });

        return {
            emailSyncEnabled: user.emailSyncEnabled || false,
            autoSyncEnabled: user.autoSyncEnabled || false,
            lastEmailSync: user.lastEmailSync,
            lastSyncStatus: user.lastSyncStatus || 'pending',
            syncErrorCount: user.syncErrorCount || 0,
            emailSyncFrequency: user.emailSyncFrequency || '6h',
            syncWindowHours: user.syncWindowHours || 24,
            transactionsSinceLastSync,
        };
    }

    /**
     * Update user sync preferences
     */
    async updateSyncPreferences(userId, preferences) {
        const allowedFields = ['autoSyncEnabled', 'emailSyncFrequency', 'syncWindowHours'];
        const updates = {};

        for (const field of allowedFields) {
            if (preferences[field] !== undefined) {
                updates[field] = preferences[field];
            }
        }

        // Validate frequency
        if (updates.emailSyncFrequency) {
            const validFrequencies = ['1h', '6h', '12h', '24h'];
            if (!validFrequencies.includes(updates.emailSyncFrequency)) {
                throw new Error('Invalid sync frequency. Must be one of: 1h, 6h, 12h, 24h');
            }
        }

        // Validate sync window
        if (updates.syncWindowHours) {
            if (updates.syncWindowHours < 1 || updates.syncWindowHours > 168) {
                throw new Error('Sync window must be between 1 and 168 hours (7 days)');
            }
        }

        await User.findByIdAndUpdate(userId, updates);

        return {
            message: 'Sync preferences updated successfully',
            preferences: updates,
        };
    }

    /**
     * Helper: Sleep for specified milliseconds
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new EmailSyncService();
