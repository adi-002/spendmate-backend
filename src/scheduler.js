const cron = require('node-cron');
const emailSyncService = require('./services/emailSyncService');

class Scheduler {
    constructor() {
        this.jobs = [];
    }

    /**
     * Initialize all scheduled jobs
     */
    init() {
        console.log('[Scheduler] Initializing scheduled jobs...');

        // Check if email sync is enabled
        const syncEnabled = process.env.EMAIL_SYNC_ENABLED === 'true';
        if (!syncEnabled) {
            console.log('[Scheduler] Email sync is disabled in environment');
            return;
        }

        // Get sync interval from environment
        const syncInterval = process.env.EMAIL_SYNC_INTERVAL || '6h';
        const cronExpression = this.getCronExpression(syncInterval);

        if (!cronExpression) {
            console.error(`[Scheduler] Invalid sync interval: ${syncInterval}`);
            return;
        }

        // Schedule email sync job
        const emailSyncJob = cron.schedule(cronExpression, async () => {
            console.log('[Scheduler] Running scheduled email sync...');
            try {
                const result = await emailSyncService.syncAllUsers();
                console.log('[Scheduler] Email sync completed:', result);
            } catch (error) {
                console.error('[Scheduler] Email sync failed:', error);
            }
        });

        this.jobs.push({
            name: 'email-sync',
            job: emailSyncJob,
            schedule: cronExpression,
            interval: syncInterval,
        });

        console.log(`[Scheduler] Email sync scheduled: ${syncInterval} (${cronExpression})`);
        console.log('[Scheduler] All jobs initialized successfully');
    }

    /**
     * Convert interval to cron expression
     */
    getCronExpression(interval) {
        const expressions = {
            '1h': '0 * * * *',      // Every hour at minute 0
            '6h': '0 */6 * * *',    // Every 6 hours at minute 0
            '12h': '0 */12 * * *',  // Every 12 hours at minute 0
            '24h': '0 0 * * *',     // Every day at midnight
            '1m': '* * * * *',      // Every minute (for testing only)
        };

        return expressions[interval];
    }

    /**
     * Stop all scheduled jobs
     */
    stopAll() {
        console.log('[Scheduler] Stopping all jobs...');
        this.jobs.forEach(({ name, job }) => {
            job.stop();
            console.log(`[Scheduler] Stopped job: ${name}`);
        });
        this.jobs = [];
    }

    /**
     * Get status of all jobs
     */
    getStatus() {
        return this.jobs.map(({ name, schedule, interval }) => ({
            name,
            schedule,
            interval,
            running: true,
        }));
    }
}

module.exports = new Scheduler();
