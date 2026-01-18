# Gmail API Configuration Guide

## Required Environment Variables

Add the following to your `.env` file:

```env
# Gmail API Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5001/api/email/auth/callback
```

## How to Get Google OAuth Credentials

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name (e.g., "SpendMate Email Integration")
4. Click "Create"

### Step 2: Enable Gmail API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Gmail API"
3. Click on "Gmail API"
4. Click "Enable"

### Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" user type
3. Click "Create"
4. Fill in required fields:
   - App name: SpendMate
   - User support email: your email
   - Developer contact: your email
5. Click "Save and Continue"
6. On "Scopes" page, click "Add or Remove Scopes"
7. Add scope: `https://www.googleapis.com/auth/gmail.readonly`
8. Click "Update" → "Save and Continue"
9. On "Test users" page, add your email address
10. Click "Save and Continue"

### Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Web application"
4. Name: SpendMate Backend
5. Under "Authorized redirect URIs", add:
   - `http://localhost:5001/api/email/auth/callback`
6. Click "Create"
7. Copy the **Client ID** and **Client Secret**
8. Add them to your `.env` file

## Testing the Setup

After adding credentials to `.env`:

1. Restart your server: `npm start`
2. Get the OAuth URL:
   ```bash
   curl --location 'http://localhost:5001/api/email/auth/url' \
   --header 'Authorization: Bearer YOUR_JWT_TOKEN'
   ```
3. Open the returned URL in your browser
4. Grant permissions
5. You'll be redirected back (you'll see the auth code in the URL)
6. The integration is now ready!

## Important Notes

- Keep your Client ID and Client Secret secure
- Never commit `.env` file to version control
- The redirect URI must match exactly what you configured in Google Cloud Console
- For production, update the redirect URI to your production domain
