# Testing Email Integration - Quick Start Guide

## Prerequisites Check

Before testing the email integration, you need:

1. ✅ **Server running** - Your server is already running on port 5001
2. ⚠️ **Server needs restart** - To load the new email routes, restart your server
3. ❌ **Google OAuth credentials** - You need to set these up first

## Step-by-Step Testing

### Step 1: Restart the Server

Since we added new routes, restart your server to load them:

```bash
# Stop the current server (Ctrl+C in the terminal running npm start)
# Then restart:
npm start
```

Or if you want to use development mode with auto-reload:
```bash
npm run dev
```

### Step 2: Get a JWT Token

You need to be authenticated to use the email endpoints. If you don't have a token yet:

```bash
# Register a new user (if you haven't already)
curl --location 'http://localhost:5001/api/auth/register' \
--header 'Content-Type: application/json' \
--data-raw '{
  "name": "Your Name",
  "email": "your.email@example.com",
  "password": "yourpassword123"
}'

# Or login with existing credentials
curl --location 'http://localhost:5001/api/auth/login' \
--header 'Content-Type: application/json' \
--data-raw '{
  "email": "your.email@example.com",
  "password": "yourpassword123"
}'
```

Copy the `token` from the response. You'll use this in all subsequent requests.

### Step 3: Test Email Endpoints (Without OAuth Setup)

Even without Google OAuth credentials, you can test if the endpoints are accessible:

```bash
# Replace YOUR_JWT_TOKEN with your actual token from Step 2

# Test 1: Check sync status (should work, will show Gmail not connected)
curl --location 'http://localhost:5001/api/email/sync/status' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'

# Expected response:
# {
#   "emailSyncEnabled": false,
#   "lastEmailSync": null,
#   "gmailConnected": false
# }
```

### Step 4: Try to Get OAuth URL (Will Fail Without Credentials)

```bash
# Test 2: Try to get OAuth URL (will fail if credentials not set)
curl --location 'http://localhost:5001/api/email/auth/url' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'

# If credentials are NOT set, you'll get an error
# If credentials ARE set, you'll get a Google OAuth URL
```

### Step 5: Set Up Google OAuth (Required for Full Testing)

To actually use the email integration, you MUST set up Google OAuth credentials:

1. **Follow the setup guide**: See [GMAIL_SETUP.md](file:///Users/aditya/Desktop/spendmate-backend/GMAIL_SETUP.md)

2. **Add credentials to `.env`**:
   ```env
   GOOGLE_CLIENT_ID=your_actual_client_id_here
   GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:5001/api/email/auth/callback
   ```

3. **Restart the server** after adding credentials

### Step 6: Full OAuth Flow Testing (After Setup)

Once you have Google credentials set up:

```bash
# 1. Get the OAuth URL
curl --location 'http://localhost:5001/api/email/auth/url' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'

# 2. Copy the "authUrl" from the response
# 3. Open it in your browser
# 4. Grant Gmail read-only permissions
# 5. You'll be redirected to: http://localhost:5001/api/email/auth/callback?code=XXXXXX
# 6. Copy the "code" parameter from the URL
# 7. Complete the OAuth flow:

curl --location 'http://localhost:5001/api/email/auth/callback' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN' \
--data '{
  "code": "PASTE_THE_CODE_HERE"
}'

# Expected response:
# {
#   "message": "Gmail connected successfully",
#   "emailSyncEnabled": true
# }
```

### Step 7: Sync Your Emails

```bash
# Trigger email sync
curl --location --request POST 'http://localhost:5001/api/email/sync' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'

# This will:
# - Fetch transaction emails from your Gmail
# - Parse them for transaction details
# - Create transaction records automatically
# - Return stats and created transactions
```

### Step 8: Verify Transactions Were Created

```bash
# Get all your transactions
curl --location 'http://localhost:5001/api/transactions' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'

# Look for transactions with "source": "email"
```

## Quick Verification Checklist

- [ ] Server restarted successfully
- [ ] Health check works: `curl http://localhost:5001/health`
- [ ] You have a JWT token from login/register
- [ ] Sync status endpoint returns data
- [ ] Google OAuth credentials added to `.env` (for full testing)
- [ ] OAuth URL endpoint returns a Google URL
- [ ] OAuth flow completed successfully
- [ ] Email sync creates transactions
- [ ] Transactions appear in `/api/transactions` with `source: "email"`

## Common Issues

### "Cannot GET /api/email/..."
**Solution**: Restart your server to load the new routes

### "Gmail not connected. Please authorize first."
**Solution**: Complete the OAuth flow (Steps 6-7)

### "Failed to generate authorization URL"
**Solution**: Check that Google credentials are set in `.env` file

### No transactions created after sync
**Possible reasons**:
- No transaction emails in your Gmail (last 7 days)
- Emails are in a format the parser doesn't recognize yet
- Check the sync response for `failedToParse` count

## Need Help?

- **Setup Guide**: [GMAIL_SETUP.md](file:///Users/aditya/Desktop/spendmate-backend/GMAIL_SETUP.md)
- **API Documentation**: [README.md](file:///Users/aditya/Desktop/spendmate-backend/README.md)
- **Implementation Details**: See walkthrough artifact

## Testing Without Real Gmail (Development)

If you want to test the code structure without setting up Google OAuth:

```bash
# Just check if the routes are loaded
curl -I http://localhost:5001/api/email/sync/status

# Should return 401 Unauthorized (needs auth) or 200 OK (if authenticated)
# NOT 404 Not Found (which means routes aren't loaded)
```
