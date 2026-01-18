const { google } = require('googleapis');
const User = require('../models/User');

class EmailService {
    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
    }

    /**
     * Generate Gmail authorization URL
     */
    getAuthUrl() {
        const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];

        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent', // Force consent to get refresh token
        });
    }

    /**
     * Exchange authorization code for tokens
     */
    async getTokensFromCode(code) {
        const { tokens } = await this.oauth2Client.getToken(code);
        return tokens;
    }

    /**
     * Save Gmail tokens to user
     */
    async saveTokens(userId, tokens) {
        await User.findByIdAndUpdate(userId, {
            gmailRefreshToken: tokens.refresh_token,
            gmailAccessToken: tokens.access_token,
            gmailTokenExpiry: new Date(tokens.expiry_date),
            emailSyncEnabled: true,
        });
    }

    /**
     * Get authenticated Gmail client for user
     */
    async getGmailClient(userId) {
        const user = await User.findById(userId);

        if (!user || !user.gmailRefreshToken) {
            throw new Error('Gmail not connected. Please authorize first.');
        }

        // Set credentials
        this.oauth2Client.setCredentials({
            refresh_token: user.gmailRefreshToken,
            access_token: user.gmailAccessToken,
            expiry_date: user.gmailTokenExpiry ? user.gmailTokenExpiry.getTime() : null,
        });

        // Refresh token if expired
        if (!user.gmailTokenExpiry || new Date() >= user.gmailTokenExpiry) {
            const { credentials } = await this.oauth2Client.refreshAccessToken();
            await User.findByIdAndUpdate(userId, {
                gmailAccessToken: credentials.access_token,
                gmailTokenExpiry: new Date(credentials.expiry_date),
            });
            this.oauth2Client.setCredentials(credentials);
        }

        return google.gmail({ version: 'v1', auth: this.oauth2Client });
    }

    /**
     * Fetch transaction-related emails
     */
    async fetchTransactionEmails(userId, options = {}) {
        const gmail = await this.getGmailClient(userId);
        const user = await User.findById(userId);

        // Build search query for transaction emails
        const query = this.buildSearchQuery(options);

        // Get message IDs
        const response = await gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: options.maxResults || 50,
        });

        if (!response.data.messages) {
            return [];
        }

        // Fetch full message details
        const emails = [];
        for (const message of response.data.messages) {
            try {
                const msg = await gmail.users.messages.get({
                    userId: 'me',
                    id: message.id,
                    format: 'full',
                });
                emails.push(msg.data);
            } catch (error) {
                console.error(`Error fetching message ${message.id}:`, error.message);
            }
        }

        // Update last sync time
        await User.findByIdAndUpdate(userId, {
            lastEmailSync: new Date(),
        });

        return emails;
    }

    /**
     * Build Gmail search query for transaction emails
     */
    buildSearchQuery(options = {}) {
        const queries = [];

        // Date filter - default to last 7 days if not specified
        if (options.after) {
            queries.push(`after:${options.after}`);
        } else {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const dateStr = sevenDaysAgo.toISOString().split('T')[0].replace(/-/g, '/');
            queries.push(`after:${dateStr}`);
        }

        // Common transaction email patterns
        const transactionKeywords = [
            'debited', 'credited', 'transaction', 'payment', 'spent', 'received',
            'UPI', 'IMPS', 'NEFT', 'RTGS', 'ATM', 'purchase', 'refund'
        ];

        // Common sender domains for Indian banks and payment apps
        const senderDomains = [
            'hdfcbank', 'icicibank', 'sbi.co.in', 'axisbank', 'kotak',
            'paytm', 'phonepe', 'googlepay', 'amazonpay', 'bhim',
            'alerts', 'notification', 'noreply'
        ];

        // Build keyword query
        const keywordQuery = transactionKeywords.map(k => `"${k}"`).join(' OR ');
        queries.push(`(${keywordQuery})`);

        return queries.join(' ');
    }

    /**
     * Disconnect Gmail integration
     */
    async disconnect(userId) {
        await User.findByIdAndUpdate(userId, {
            gmailRefreshToken: null,
            gmailAccessToken: null,
            gmailTokenExpiry: null,
            emailSyncEnabled: false,
        });
    }

    /**
     * Get email body content
     */
    getEmailBody(message) {
        const parts = message.payload.parts || [message.payload];

        for (const part of parts) {
            if (part.mimeType === 'text/plain' && part.body.data) {
                return Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
        }

        // Try HTML if plain text not found
        for (const part of parts) {
            if (part.mimeType === 'text/html' && part.body.data) {
                return Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
        }

        // Check nested parts
        for (const part of parts) {
            if (part.parts) {
                for (const subPart of part.parts) {
                    if (subPart.mimeType === 'text/plain' && subPart.body.data) {
                        return Buffer.from(subPart.body.data, 'base64').toString('utf-8');
                    }
                }
            }
        }

        return '';
    }

    /**
     * Get email subject
     */
    getEmailSubject(message) {
        const headers = message.payload.headers;
        const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject');
        return subjectHeader ? subjectHeader.value : '';
    }

    /**
     * Get email sender
     */
    getEmailSender(message) {
        const headers = message.payload.headers;
        const fromHeader = headers.find(h => h.name.toLowerCase() === 'from');
        return fromHeader ? fromHeader.value : '';
    }

    /**
     * Get email date
     */
    getEmailDate(message) {
        const headers = message.payload.headers;
        const dateHeader = headers.find(h => h.name.toLowerCase() === 'date');
        return dateHeader ? new Date(dateHeader.value) : new Date(parseInt(message.internalDate));
    }
}

module.exports = new EmailService();
