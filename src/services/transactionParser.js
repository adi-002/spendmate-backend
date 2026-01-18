const cheerio = require('cheerio');

class TransactionParser {
    /**
     * Parse transaction details from email
     */
    parseTransaction(emailBody, subject, sender) {
        // Try different parsing strategies
        const parsers = [
            this.parseUPITransaction,
            this.parseCardTransaction,
            this.parseBankTransaction,
            this.parsePaymentAppTransaction,
        ];

        for (const parser of parsers) {
            try {
                const result = parser.call(this, emailBody, subject, sender);
                if (result) {
                    return result;
                }
            } catch (error) {
                console.error(`Parser error: ${error.message}`);
            }
        }

        return null;
    }

    /**
     * Parse UPI transaction emails
     */
    parseUPITransaction(emailBody, subject) {
        const patterns = {
            // Amount patterns
            amount: [
                /(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.[0-9]{2})?)/i,
                /(?:amount|amt)[\s:]*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/i,
            ],
            // Transaction type
            debit: /debited|sent|paid|spent|transferred/i,
            credit: /credited|received|refund/i,
            // Merchant/recipient
            merchant: [
                /(?:to|from)\s+([A-Za-z0-9\s@.-]+?)(?:\s+on|\s+via|\s+using|\.)/i,
                /(?:merchant|vendor)[\s:]+([A-Za-z0-9\s.-]+)/i,
            ],
            // UPI ID
            upiId: /([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+)/,
            // Reference number
            refNumber: /(?:ref|reference|utr|txn)[\s#:]*([A-Z0-9]+)/i,
            // Date
            date: /(?:on|date)[\s:]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
        };

        // Extract amount
        let amount = null;
        for (const pattern of patterns.amount) {
            const match = emailBody.match(pattern);
            if (match) {
                amount = parseFloat(match[1].replace(/,/g, ''));
                break;
            }
        }

        if (!amount) return null;

        // Determine transaction type
        let type = 'expense';
        if (patterns.credit.test(emailBody) || patterns.credit.test(subject)) {
            type = 'income';
        }

        // Extract merchant/recipient
        let merchant = null;
        for (const pattern of patterns.merchant) {
            const match = emailBody.match(pattern);
            if (match) {
                merchant = match[1].trim();
                break;
            }
        }

        // Extract UPI ID
        const upiMatch = emailBody.match(patterns.upiId);
        const upiId = upiMatch ? upiMatch[1] : null;

        // Extract reference number
        const refMatch = emailBody.match(patterns.refNumber);
        const refNumber = refMatch ? refMatch[1] : null;

        // Extract date
        let transactionDate = new Date();
        const dateMatch = emailBody.match(patterns.date);
        if (dateMatch) {
            transactionDate = new Date(dateMatch[1]);
        }

        return {
            amount,
            type,
            category: this.categorizeTransaction(merchant || subject, type),
            description: merchant || subject.substring(0, 100),
            date: transactionDate,
            source: 'email',
            metadata: {
                merchant: merchant || 'Unknown',
                upiId,
                refNumber,
                emailSubject: subject,
                paymentMethod: 'UPI',
            },
        };
    }

    /**
     * Parse card transaction emails
     */
    parseCardTransaction(emailBody, subject) {
        const patterns = {
            amount: [
                /(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.[0-9]{2})?)/i,
                /(?:amount|amt)[\s:]*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/i,
            ],
            debit: /debited|spent|purchase|transaction/i,
            credit: /credited|refund|cashback/i,
            merchant: /(?:at|merchant)[\s:]+([A-Za-z0-9\s.-]+?)(?:\s+on|\.|$)/i,
            cardLast4: /(?:card|ending)[\s*]*(\d{4})/i,
            date: /(?:on|date)[\s:]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
        };

        // Extract amount
        let amount = null;
        for (const pattern of patterns.amount) {
            const match = emailBody.match(pattern);
            if (match) {
                amount = parseFloat(match[1].replace(/,/g, ''));
                break;
            }
        }

        if (!amount) return null;

        // Determine transaction type
        let type = 'expense';
        if (patterns.credit.test(emailBody) || patterns.credit.test(subject)) {
            type = 'income';
        }

        // Extract merchant
        const merchantMatch = emailBody.match(patterns.merchant);
        const merchant = merchantMatch ? merchantMatch[1].trim() : null;

        // Extract card last 4 digits
        const cardMatch = emailBody.match(patterns.cardLast4);
        const cardLast4 = cardMatch ? cardMatch[1] : null;

        // Extract date
        let transactionDate = new Date();
        const dateMatch = emailBody.match(patterns.date);
        if (dateMatch) {
            transactionDate = new Date(dateMatch[1]);
        }

        return {
            amount,
            type,
            category: this.categorizeTransaction(merchant || subject, type),
            description: merchant || subject.substring(0, 100),
            date: transactionDate,
            source: 'email',
            metadata: {
                merchant: merchant || 'Unknown',
                cardLast4,
                emailSubject: subject,
                paymentMethod: 'Card',
            },
        };
    }

    /**
     * Parse general bank transaction emails
     */
    parseBankTransaction(emailBody, subject) {
        const patterns = {
            amount: [
                /(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.[0-9]{2})?)/i,
                /(?:amount|amt)[\s:]*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/i,
            ],
            debit: /debited|withdrawn|debit/i,
            credit: /credited|deposited|credit/i,
            balance: /(?:balance|bal)[\s:]*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/i,
        };

        // Extract amount
        let amount = null;
        for (const pattern of patterns.amount) {
            const match = emailBody.match(pattern);
            if (match) {
                amount = parseFloat(match[1].replace(/,/g, ''));
                break;
            }
        }

        if (!amount) return null;

        // Determine transaction type
        let type = 'expense';
        if (patterns.credit.test(emailBody) || patterns.credit.test(subject)) {
            type = 'income';
        }

        return {
            amount,
            type,
            category: this.categorizeTransaction(subject, type),
            description: subject.substring(0, 100),
            date: new Date(),
            source: 'email',
            metadata: {
                emailSubject: subject,
                paymentMethod: 'Bank Transfer',
            },
        };
    }

    /**
     * Parse payment app transaction emails (Paytm, PhonePe, etc.)
     */
    parsePaymentAppTransaction(emailBody, subject, sender) {
        // Detect payment app from sender
        let paymentApp = 'Unknown';
        if (/paytm/i.test(sender)) paymentApp = 'Paytm';
        else if (/phonepe/i.test(sender)) paymentApp = 'PhonePe';
        else if (/googlepay|google pay/i.test(sender)) paymentApp = 'Google Pay';
        else if (/amazonpay/i.test(sender)) paymentApp = 'Amazon Pay';

        const patterns = {
            amount: [
                /(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.[0-9]{2})?)/i,
                /(?:amount|amt)[\s:]*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/i,
            ],
            debit: /sent|paid|debited/i,
            credit: /received|credited/i,
            merchant: /(?:to|from)\s+([A-Za-z0-9\s@.-]+?)(?:\s+on|\s+via|\.)/i,
        };

        // Extract amount
        let amount = null;
        for (const pattern of patterns.amount) {
            const match = emailBody.match(pattern);
            if (match) {
                amount = parseFloat(match[1].replace(/,/g, ''));
                break;
            }
        }

        if (!amount) return null;

        // Determine transaction type
        let type = 'expense';
        if (patterns.credit.test(emailBody) || patterns.credit.test(subject)) {
            type = 'income';
        }

        // Extract merchant
        const merchantMatch = emailBody.match(patterns.merchant);
        const merchant = merchantMatch ? merchantMatch[1].trim() : null;

        return {
            amount,
            type,
            category: this.categorizeTransaction(merchant || subject, type),
            description: merchant || subject.substring(0, 100),
            date: new Date(),
            source: 'email',
            metadata: {
                merchant: merchant || 'Unknown',
                emailSubject: subject,
                paymentMethod: paymentApp,
            },
        };
    }

    /**
     * Categorize transaction based on merchant/description
     */
    categorizeTransaction(text, type) {
        if (!text) return type === 'income' ? 'Income' : 'Expense';

        const lowerText = text.toLowerCase();

        // Food & Dining
        if (/restaurant|cafe|food|zomato|swiggy|domino|pizza|burger|starbucks/i.test(lowerText)) {
            return 'Food & Dining';
        }

        // Shopping
        if (/amazon|flipkart|myntra|shopping|store|mall/i.test(lowerText)) {
            return 'Shopping';
        }

        // Transportation
        if (/uber|ola|rapido|metro|fuel|petrol|diesel/i.test(lowerText)) {
            return 'Transportation';
        }

        // Utilities
        if (/electricity|water|gas|bill|recharge|mobile|internet/i.test(lowerText)) {
            return 'Utilities';
        }

        // Entertainment
        if (/netflix|prime|hotstar|movie|theater|cinema/i.test(lowerText)) {
            return 'Entertainment';
        }

        // Salary
        if (type === 'income' && /salary|wage|payroll/i.test(lowerText)) {
            return 'Salary';
        }

        return type === 'income' ? 'Income' : 'Expense';
    }

    /**
     * Clean HTML content
     */
    cleanHtml(html) {
        const $ = cheerio.load(html);
        return $.text();
    }
}

module.exports = new TransactionParser();
