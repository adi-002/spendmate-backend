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
     * Exchange authorization code for tokens (browser redirect flow)
     */
    async getTokensFromCode(code) {
        const { tokens } = await this.oauth2Client.getToken(code);
        return tokens;
    }

    /**
     * Exchange Google Sign-In `serverAuthCode` (from mobile) for tokens.
     * Must use the same Web OAuth client id/secret as the app `webClientId`.
     * redirect_uri must be empty for this grant type.
     */
    async getTokensFromServerAuthCode(serverAuthCode) {
        const { tokens } = await this.oauth2Client.getToken({
            code: serverAuthCode,
            redirect_uri: '',
        });
        return tokens;
    }

    /**
     * Save Gmail tokens to user
     */
    async saveTokens(userId, tokens) {
        const update = {
            gmailAccessToken: tokens.access_token,
            gmailTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600 * 1000),
            emailSyncEnabled: true,
        };
        if (tokens.refresh_token) {
            update.gmailRefreshToken = tokens.refresh_token;
        }
        await User.findByIdAndUpdate(userId, update);
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
                if (this.hasDebitOrCreditSignal(msg.data)) {
                    emails.push(msg.data);
                }
            } catch (error) {
                console.error(`Error fetching message ${message.id}:`, error.message);
            }
        }

        // Update last sync time
        await User.findByIdAndUpdate(userId, {
            lastEmailSync: new Date(),
        });

        console.log(`[EmailSync] Filtered emails with debit/credit signal: ${emails.length}`);
        return emails;
    }

    /**
     * Build Gmail search query for transaction emails
     */
    buildSearchQuery(options = {}) {
        const parts = [];

        // ── Date filter ──────────────────────────────────────────────
        if (options.after) {
            parts.push(`after:${options.after}`);
        } else {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const dateStr = sevenDaysAgo.toISOString().split('T')[0].replace(/-/g, '/');
            parts.push(`after:${dateStr}`);
        }

        // ── Known bank / payment app senders ─────────────────────────
        const senderAddresses = [
            // Major Indian banks
            'alerts@hdfcbank.net',
            'alerts@icicibank.com',
            'alerts@axisbank.com',
            'donotreply@sbi.co.in',
            'alerts@kotak.com',
            'alerts@indusind.com',
            'alerts@yesbank.in',
            'alerts@idbibank.co.in',
            'alerts@pnb.co.in',
            'alerts@rblbank.com',
            'alerts@federalbank.co.in',
            'alerts@idfcfirstbank.com',
            'alerts@canarabank.com',
            'alerts@unionbankofindia.co.in',
            'alerts@bobfinancial.com',
            // Payment apps & wallets
            'no-reply@paytm.com',
            'support@phonepe.com',
            'noreply@googleplay.com',
            'auto-confirm@amazon.in',
            'noreply@amazonpay.in',
            'no-reply@cred.club',
            'noreply@simpl.co',
            'noreply@lazypay.in',
            'support@slice.co',
            'noreply@jupiter.money',
            'noreply@fi.money',
            'noreply@niyo.co',
            // Credit cards
            'creditcards@hdfcbank.net',
            'cc.statements@icicibank.com',
        ];

        // ── Transaction keywords (body content) ─────────────────────
        const transactionKeywords = [
            'debited', 'credited', 'transaction', 'payment successful',
            'spent', 'received', 'transfer', 'withdrawn', 'deposited',
            'UPI', 'IMPS', 'NEFT', 'RTGS', 'ATM withdrawal',
            'purchase', 'refund', 'cashback', 'EMI', 'autopay',
            'account ending', 'a/c', 'INR', 'Rs.', 'Rs ',
        ];

        // ── Subject-line patterns ────────────────────────────────────
        const subjectKeywords = [
            'transaction alert', 'debit alert', 'credit alert',
            'payment received', 'payment confirmation', 'money sent',
            'money received', 'bank alert', 'account debited',
            'account credited', 'UPI transaction', 'order confirmed',
        ];

        // ── Build the combined query ─────────────────────────────────
        // Strategy: (from:bank1 OR from:bank2 ...) OR (keyword1 OR keyword2 ...) OR (subject:...)
        // This catches emails from known senders AND emails with transaction terms

        const fromQuery = senderAddresses.map(addr => `from:${addr}`).join(' OR ');
        const keywordQuery = transactionKeywords.map(k => `"${k}"`).join(' OR ');
        const subjectQuery = subjectKeywords.map(k => `subject:"${k}"`).join(' OR ');

        parts.push(`((${fromQuery}) OR (${keywordQuery}) OR (${subjectQuery}))`);
        // Hard requirement: transaction signal must mention debited/credited.
        parts.push(`("debited" OR "credited")`);

        const finalQuery = parts.join(' ');
        console.log('📧 Gmail search query:', finalQuery);
        return finalQuery;
    }

    /**
     * Keep only emails that clearly indicate money movement.
     * User requirement: snippet should contain "debited" or "credited".
     */
    hasDebitOrCreditSignal(message) {
        const snippet = String(message?.snippet || '').toLowerCase();
        return /\b(debited|credited)\b/.test(snippet);
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
