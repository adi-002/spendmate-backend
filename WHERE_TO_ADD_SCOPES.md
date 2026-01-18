# Where to Add Gmail API Scopes - Quick Guide

## You're Looking at the Wrong Place! 

The screenshot shows you're in **"Credentials"** → **"Clients"**, but scopes are NOT configured there.

## ✅ Here's Where to Add Scopes:

### Go to OAuth Consent Screen (Not Credentials!)

1. **In Google Cloud Console**, click on the left sidebar menu
2. Click **"APIs & Services"**
3. Click **"OAuth consent screen"** (NOT "Credentials")
4. You should see your app listed (SpendMate or whatever you named it)
5. Click **"EDIT APP"** button

### Add the Scope

6. Click **"Save and Continue"** on the first page (App information)
7. On the **"Scopes"** page, click **"ADD OR REMOVE SCOPES"** button
8. A panel will slide in from the right
9. In the search/filter box at the top, type: **`gmail.readonly`**
10. You'll see: **`https://www.googleapis.com/auth/gmail.readonly`**
11. **Check the checkbox** next to it
12. Click **"UPDATE"** at the bottom of the panel
13. Click **"SAVE AND CONTINUE"**
14. Add your email as a test user if you haven't already
15. Click **"SAVE AND CONTINUE"** until you're done

## Visual Guide

```
Google Cloud Console
├── APIs & Services
    ├── OAuth consent screen  ← YOU NEED TO BE HERE!
    │   ├── Edit App
    │   └── Scopes page → Add or Remove Scopes
    │
    └── Credentials  ← You are currently here (wrong place for scopes)
        └── OAuth 2.0 Client IDs
```

## The Scope You Need

Copy this exact scope:
```
https://www.googleapis.com/auth/gmail.readonly
```

This gives read-only access to Gmail (cannot send or delete emails).

## After Adding the Scope

1. Your OAuth client (Web client 1) will automatically use this scope
2. No need to recreate the client
3. Just make sure you've added the redirect URI to the client:
   - `http://localhost:5001/api/email/auth/callback`

## Quick Checklist

- [ ] Go to "OAuth consent screen" (not Credentials)
- [ ] Click "EDIT APP"
- [ ] Navigate to "Scopes" page
- [ ] Click "ADD OR REMOVE SCOPES"
- [ ] Search for `gmail.readonly`
- [ ] Check the checkbox
- [ ] Click "UPDATE"
- [ ] Save and continue
- [ ] Add your email as test user
- [ ] Done!

Now you can proceed with testing the OAuth flow!
