# How to Get List of Recent 50 Emails

## New Endpoint Added! 🎉

I've added a new endpoint that lets you fetch a list of recent emails from your Gmail without parsing them into transactions. This is useful for:
- Seeing what emails are available
- Debugging the email fetching
- Previewing before syncing

## Usage

### Step 1: Make sure you're authenticated and Gmail is connected

First, you need to:
1. Have a JWT token (from login/register)
2. Have completed the Gmail OAuth flow (see GMAIL_SETUP.md)

### Step 2: Fetch recent emails

```bash
# Get last 50 emails (default)
curl --location 'http://localhost:5001/api/email/emails' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'

# Get specific number of emails
curl --location 'http://localhost:5001/api/email/emails?maxResults=20' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'

# Get emails from a specific date
curl --location 'http://localhost:5001/api/email/emails?after=2026/01/10' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

## Response Format

```json
{
  "count": 25,
  "emails": [
    {
      "id": "18d4f2a1b2c3d4e5",
      "subject": "You paid Rs.250.00 to Swiggy",
      "sender": "PhonePe <alerts@phonepe.com>",
      "date": "2026-01-17T14:30:00.000Z",
      "snippet": "Your payment of Rs.250.00 to Swiggy via PhonePe was successful..."
    },
    {
      "id": "18d4f2a1b2c3d4e6",
      "subject": "Rs.1500.00 debited from your account",
      "sender": "HDFC Bank <alerts@hdfcbank.com>",
      "date": "2026-01-16T10:15:00.000Z",
      "snippet": "Dear Customer, Rs.1500.00 has been debited from your account..."
    }
  ]
}
```

## What You Get

For each email, you'll see:
- **id**: Gmail message ID
- **subject**: Email subject line
- **sender**: Who sent the email
- **date**: When the email was received
- **snippet**: First 150 characters of the email body

## Difference from Sync

| Feature | GET /api/email/emails | POST /api/email/sync |
|---------|----------------------|---------------------|
| Purpose | Just view emails | Parse and create transactions |
| Creates transactions | ❌ No | ✅ Yes |
| Shows email details | ✅ Yes | ❌ No (only stats) |
| Use case | Preview/Debug | Actual sync |

## Quick Test

Once your server is running and you have:
1. ✅ JWT token
2. ✅ Gmail connected (OAuth completed)

Run this:
```bash
curl --location 'http://localhost:5001/api/email/emails?maxResults=10' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

You should see a list of your recent transaction-related emails!

## Troubleshooting

### "Gmail not connected. Please authorize first."
**Solution**: Complete the OAuth flow first using `/api/email/auth/url` and `/api/email/auth/callback`

### Empty emails array
**Possible reasons**:
- No transaction-related emails in your Gmail (last 30 days by default)
- Try adjusting the date filter with `?after=2026/01/01`
- Check if you have bank/payment notification emails

### Error fetching emails
**Solution**: 
- Check if your OAuth token is still valid
- Try disconnecting and reconnecting Gmail
- Check server logs for detailed error messages
