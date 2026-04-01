const cheerio = require('cheerio');

class TransactionParser {
    /**
     * Parse transaction details from email
     */
    parseTransaction(emailBody, subject, sender) {
        // ── Clean HTML first ─────────────────────────────────────
        let cleanBody = emailBody;
        if (/<\/?[a-z][\s\S]*>/i.test(emailBody)) {
            cleanBody = this.cleanHtml(emailBody);
        }
        // Normalize whitespace
        cleanBody = cleanBody.replace(/\s+/g, ' ').trim();

        console.log('🔍 Parser input:');
        console.log('   Subject:', subject);
        console.log('   Sender:', sender);
        console.log('   Body (first 300 chars):', cleanBody.substring(0, 300));

        // Try different parsing strategies
        const parsers = [
            this.parseUPITransaction,
            this.parseCardTransaction,
            this.parseBankTransaction,
            this.parsePaymentAppTransaction,
            this.parseGenericTransaction,  // Fallback: catches anything with an amount
        ];

        for (const parser of parsers) {
            try {
                const result = parser.call(this, cleanBody, subject, sender);
                if (result) {
                    console.log('✅ Parsed transaction:', JSON.stringify(result, null, 2));
                    return result;
                }
            } catch (error) {
                console.error(`Parser error (${parser.name}):`, error.message);
            }
        }

        console.log('❌ No parser could extract a transaction from this email');
        return null;
    }

    /**
     * Parse UPI transaction emails
     * Handles: HDFC, ICICI, SBI, Axis etc. UPI alerts
     * Example: "Rs.360.00 has been debited from account 1164 to VPA paytmqr6kuk3v@ptys"
     */
    parseUPITransaction(emailBody, subject) {
        // Must mention UPI or VPA somewhere
        if (!/upi|vpa/i.test(emailBody) && !/upi/i.test(subject)) {
            return null;
        }

        const amount = this.extractAmount(emailBody);
        if (!amount) return null;

        const type = this.detectTransactionType(emailBody, subject);
        const counterparty = this.extractUpiCounterparty(emailBody);
        const merchant = counterparty || this.extractMerchant(emailBody);
        const upiId = this.extractUpiId(emailBody);
        const refNumber = this.extractRefNumber(emailBody);
        const accountLast4 = this.extractAccountLast4(emailBody);
        const date = this.extractDate(emailBody);

        return {
            amount,
            type,
            category: this.categorizeTransaction(merchant || subject, type),
            description: merchant || upiId || subject.substring(0, 100),
            date,
            source: 'email',
            metadata: {
                merchant: merchant || 'Unknown',
                counterparty,
                upiId,
                refNumber,
                accountLast4,
                emailSubject: subject,
                paymentMethod: 'UPI',
            },
        };
    }

    /**
     * Parse card transaction emails
     */
    parseCardTransaction(emailBody, subject) {
        // Must mention card
        if (!/card|credit card|debit card/i.test(emailBody) && !/card/i.test(subject)) {
            return null;
        }

        const amount = this.extractAmount(emailBody);
        if (!amount) return null;

        const type = this.detectTransactionType(emailBody, subject);
        const merchant = this.extractMerchant(emailBody);
        const cardMatch = emailBody.match(/(?:card|ending|xx|XX)[*\s]*(\d{4})/i);
        const cardLast4 = cardMatch ? cardMatch[1] : null;
        const date = this.extractDate(emailBody);

        return {
            amount,
            type,
            category: this.categorizeTransaction(merchant || subject, type),
            description: merchant || subject.substring(0, 100),
            date,
            source: 'email',
            metadata: {
                merchant: merchant || 'Unknown',
                cardLast4,
                counterparty: merchant || null,
                emailSubject: subject,
                paymentMethod: 'Card',
            },
        };
    }

    /**
     * Parse general bank transaction emails
     * Handles: IMPS, NEFT, RTGS, ATM etc.
     */
    parseBankTransaction(emailBody, subject) {
        // Must mention banking terms
        if (!/imps|neft|rtgs|atm|account|a\/c/i.test(emailBody)) {
            return null;
        }

        const amount = this.extractAmount(emailBody);
        if (!amount) return null;

        const type = this.detectTransactionType(emailBody, subject);
        const merchant = this.extractMerchant(emailBody);
        const accountMatch = emailBody.match(/(?:account|a\/c|acct)[*\s]*(?:no\.?\s*)?(?:ending\s*)?[*\sXx]*(\d{4})/i);
        const accountLast4 = accountMatch ? accountMatch[1] : null;
        const refNumber = this.extractRefNumber(emailBody);
        const date = this.extractDate(emailBody);

        return {
            amount,
            type,
            category: this.categorizeTransaction(merchant || subject, type),
            description: merchant || subject.substring(0, 100),
            date,
            source: 'email',
            metadata: {
                merchant: merchant || 'Unknown',
                accountLast4,
                refNumber,
                counterparty: merchant || null,
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
        let paymentApp = null;
        if (/paytm/i.test(sender)) paymentApp = 'Paytm';
        else if (/phonepe/i.test(sender)) paymentApp = 'PhonePe';
        else if (/googlepay|google pay/i.test(sender)) paymentApp = 'Google Pay';
        else if (/amazonpay|amazon/i.test(sender)) paymentApp = 'Amazon Pay';
        else if (/cred/i.test(sender)) paymentApp = 'CRED';

        if (!paymentApp) return null;

        const amount = this.extractAmount(emailBody);
        if (!amount) return null;

        const type = this.detectTransactionType(emailBody, subject);
        const merchant = this.extractMerchant(emailBody);
        const date = this.extractDate(emailBody);

        return {
            amount,
            type,
            category: this.categorizeTransaction(merchant || subject, type),
            description: merchant || subject.substring(0, 100),
            date,
            source: 'email',
            metadata: {
                merchant: merchant || 'Unknown',
                counterparty: merchant || null,
                emailSubject: subject,
                paymentMethod: paymentApp,
            },
        };
    }

    /**
     * Fallback parser — catches any email with a recognizable amount + debit/credit keyword
     */
    parseGenericTransaction(emailBody, subject, sender) {
        const amount = this.extractAmount(emailBody);
        if (!amount) return null;

        // Must at least have a debit/credit keyword somewhere
        if (!/debit|credit|paid|spent|received|sent|withdrawn|deposited|transaction/i.test(emailBody + ' ' + subject)) {
            return null;
        }

        const type = this.detectTransactionType(emailBody, subject);
        const merchant = this.extractMerchant(emailBody);
        const date = this.extractDate(emailBody);

        return {
            amount,
            type,
            category: this.categorizeTransaction(merchant || subject, type),
            description: merchant || subject.substring(0, 100),
            date,
            source: 'email',
            metadata: {
                merchant: merchant || 'Unknown',
                counterparty: merchant || null,
                emailSubject: subject,
                paymentMethod: 'Unknown',
            },
        };
    }

    // ══════════════════════════════════════════════════════════════
    // SHARED EXTRACTION HELPERS
    // ══════════════════════════════════════════════════════════════

    /**
     * Extract amount from text — tries multiple patterns
     */
    extractAmount(text) {
        const patterns = [
            // "Rs.360.00" or "Rs 1,200.50" or "Rs1200" or "INR 500" or "₹ 360"
            /(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
            // "amount: Rs 500" or "amt Rs.1200"
            /(?:amount|amt)[:\s]*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
            // "debited 360.00" or "credited 1,200.50" (amount right after keyword)
            /(?:debited|credited|paid|spent|received)\s+([0-9,]+(?:\.[0-9]{1,2})?)/i,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const amount = parseFloat(match[1].replace(/,/g, ''));
                if (amount > 0 && amount < 10000000) { // sanity check: 0 < amount < 1 crore
                    return amount;
                }
            }
        }
        return null;
    }

    /**
     * Detect if the transaction is income or expense
     */
    detectTransactionType(body, subject) {
        const combined = body + ' ' + subject;
        if (/credited|received|refund|cashback|deposited/i.test(combined)) {
            return 'income';
        }
        return 'expense'; // default to expense
    }

    /**
     * Extract merchant / payee name
     */
    extractMerchant(text) {
        const patterns = [
            // "to VPA merchant@bank" — extract name before @
            /to\s+VPA\s+([a-zA-Z0-9._-]+)@/i,
            // "to Name on" or "to Name via" or "to Name."
            /(?:to|from)\s+([A-Za-z][A-Za-z0-9\s]{2,30}?)(?:\s+on\s|\s+via\s|\s+using\s|\.|\s+at\s)/i,
            // "at Merchant Name on"
            /at\s+([A-Za-z][A-Za-z0-9\s]{2,30}?)(?:\s+on\s|\.|$)/i,
            // "merchant: Name"
            /(?:merchant|vendor|payee)[:\s]+([A-Za-z0-9\s.-]+)/i,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }
        return null;
    }

    /**
     * Extract UPI ID
     */
    extractUpiId(text) {
        const match = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+)/i);
        return match ? match[1] : null;
    }

    /**
     * Extract payee/counterparty name in UPI alerts
     * Example: "... to VPA abc@ptys Mohammad Uzair on 29-03-26"
     */
    extractUpiCounterparty(text) {
        const patterns = [
            // HDFC (and similar): "by VPA 7000385306@upi SANGITASHRIVASTVA on 05-03-26"
            // or "by VPA 8521610724@pthdfc POOJA KUMARI on 06-03-26"
            /by\s+VPA\s+[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\s+([A-Za-z][A-Za-z0-9\s.'-]{1,60}?)\s+on\s/i,
            /to\s+VPA\s+[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\s+([A-Za-z][A-Za-z\s.'-]{1,40}?)(?:\s+on\s|\.\s*|$)/i,
            /(?:paid\s+to|sent\s+to|to)\s+([A-Za-z][A-Za-z\s.'-]{1,40}?)(?:\s+on\s|\s+via\s|\.\s*|$)/i,
        ];
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }
        return null;
    }

    /**
     * Extract account last 4 digits from banking/UPI alerts
     */
    extractAccountLast4(text) {
        const patterns = [
            /(?:from|in)\s+account\s+(\d{4})/i,
            /(?:a\/c|acct|account)(?:\s*no\.?)?\s*(?:ending\s*)?[*xX]*(\d{4})/i,
        ];
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) return match[1];
        }
        return null;
    }

    /**
     * Extract reference / transaction number
     */
    extractRefNumber(text) {
        const patterns = [
            /(?:ref(?:erence)?|utr|txn|transaction)\s*(?:no\.?\s*)?[#:\s]*([A-Z0-9]{6,})/i,
            /(?:reference\s*number|transaction\s*id)[:\s]*([A-Z0-9]{6,})/i,
            /(?:upi\s+transaction\s+reference(?:\s+number)?)[:\s]*([A-Z0-9]{6,})/i,
        ];
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) return match[1];
        }
        return null;
    }

    /**
     * Extract date from email body
     */
    extractDate(text) {
        // Numeric date: always treat as DD-MM-YY(YY) / DD/MM/YY(YY)
        const numericPatterns = [
            /on\s+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
            /date[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
            /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\b/,
        ];

        for (const pattern of numericPatterns) {
            const match = text.match(pattern);
            if (!match) continue;

            const parts = match[1].split(/[-\/]/);
            if (parts.length !== 3) continue;

            let [day, month, year] = parts.map(Number);
            if (!day || !month || !year) continue;
            if (year < 100) year += 2000;

            // Validate DD-MM-YYYY bounds before constructing date
            if (day < 1 || day > 31 || month < 1 || month > 12) continue;

            const d = new Date(year, month - 1, day);
            if (!isNaN(d.getTime())) return d;
        }

        // Text month date: "29 Mar 2026" or "29-Mar-26"
        const textMonthMatch = text.match(/(\d{1,2}[\s-](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s-]\d{2,4})/i);
        if (textMonthMatch) {
            const parsed = new Date(textMonthMatch[1]);
            if (!isNaN(parsed.getTime())) return parsed;
        }

        return new Date(); // fallback to now
    }

    /**
     * Categorize transaction based on merchant/description
     */
    categorizeTransaction(text, type) {
        if (!text) return type === 'income' ? 'Repayments' : 'Other';

        const lowerText = text.toLowerCase();

        // Income-first classifications
        if (type === 'income' && /salary|wage|payroll|stipend|bonus|incentive/i.test(lowerText)) {
            return 'Salary';
        }
        if (type === 'income' && /interest|fd\s*interest|savings\s*interest|dividend|payout|redemption|mutual\s*fund/i.test(lowerText)) {
            return 'Investments';
        }
        if (type === 'income' && /refund|cashback|reversal|chargeback|repay/i.test(lowerText)) {
            return 'Repayments';
        }

        // Food & Dining
        if (/restaurant|cafe|food|zomato|swiggy|domino|pizza|burger|starbucks|mcdonalds|kfc|biryani|bakery|chai|dine|eatery|coffee/i.test(lowerText)) {
            return 'Food & Dining';
        }
        // Grocery
        if (/blinkit|zepto|bigbasket|instamart|dmart|grocery|grofers|reliance fresh|more supermarket|spencer/i.test(lowerText)) {
            return 'Grocery';
        }
        // Fashion
        if (/myntra|ajio|zara|hm\b|h&m|lifestyle|pantaloons|nykaa fashion|max fashion|westside|fabindia|bewakoof|clothing|apparel|fashion/i.test(lowerText)) {
            return 'Fashion';
        }
        // Electronics
        if (/croma|reliance digital|vijay sales|apple|samsung|oneplus|xiaomi|mi store|boat|noise|electronic|laptop|mobile phone|headphone/i.test(lowerText)) {
            return 'Electronics';
        }
        // Shopping (generic)
        if (/amazon|flipkart|shopping|store|mall|meesho|nykaa|purchase|order/i.test(lowerText)) {
            return 'Shopping';
        }
        // Fuel
        if (/petrol|diesel|fuel|hpcl|bpcl|indianoil|ioc|bharat petroleum|hindustan petroleum|shell/i.test(lowerText)) {
            return 'Fuel';
        }
        // Travel
        if (/irctc|makemytrip|goibibo|redbus|air india|indigo|spicejet|vistara|flight|hotel booking|booking\.com|agoda|oyo|trip|travel/i.test(lowerText)) {
            return 'Travel';
        }
        // Transport
        if (/uber|ola|rapido|metro|bus|local train|auto fare|cab|taxi|commute|parking|toll/i.test(lowerText)) {
            return 'Transport';
        }
        // Bills & Utilities
        if (/electricity|water|gas|bill|recharge|mobile|internet|broadband|jio|airtel|vi\b|wifi|dth|fastag/i.test(lowerText)) {
            return 'Bills & Utilities';
        }
        // Subscriptions
        if (/subscription|autopay|recurring|renewal|netflix|prime|hotstar|spotify|youtube premium|apple icloud|google one|membership/i.test(lowerText)) {
            return 'Subscriptions';
        }
        // Entertainment
        if (/movie|theater|cinema|gaming|playstation|xbox|steam|bookmyshow|concert/i.test(lowerText)) {
            return 'Entertainment';
        }
        // Health
        if (/hospital|pharmacy|medical|doctor|health|apollo|medplus|1mg|practo|clinic|diagnostic|lab test|medicine/i.test(lowerText)) {
            return 'Health';
        }
        // Education
        if (/school|college|university|course|tuition|udemy|coursera|education|exam|fees|byju|unacademy|upgrad/i.test(lowerText)) {
            return 'Education';
        }
        // Home & Living
        if (/furniture|ikea|home centre|home decor|appliance|rent|maintenance|society|interior/i.test(lowerText)) {
            return 'Home & Living';
        }
        // Insurance
        if (/insurance|premium|policy|lic|hdfc ergo|icici lombard|acko|renewbuy/i.test(lowerText)) {
            return 'Insurance';
        }
        // Loan & EMI
        if (/emi|loan|credit card bill|card payment due|installment|nbfc|bajaj finserv/i.test(lowerText)) {
            return 'Loan & EMI';
        }
        // Investments (expense side: buying)
        if (/sip|mutual fund|zerodha|groww|upstox|coin by zerodha|stock|nps|ppf/i.test(lowerText)) {
            return 'Investments';
        }
        // Transfers / Banking
        if (/upi|imps|neft|rtgs|bank transfer|self transfer|to account|to vpa|money sent/i.test(lowerText)) {
            return 'Transfers';
        }

        return type === 'income' ? 'Repayments' : 'Other';
    }

    /**
     * Clean HTML content to plain text
     */
    cleanHtml(html) {
        try {
            const $ = cheerio.load(html);
            // Remove style and script tags
            $('style, script').remove();
            return $.text();
        } catch {
            // Fallback: strip tags with regex
            return html.replace(/<[^>]+>/g, ' ');
        }
    }
}

module.exports = new TransactionParser();
