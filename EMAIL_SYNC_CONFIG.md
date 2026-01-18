# Email Sync Configuration

Add these to your `.env` file:

```env
# Email Sync Configuration
EMAIL_SYNC_ENABLED=true
EMAIL_SYNC_INTERVAL=6h
EMAIL_SYNC_WINDOW_HOURS=24
EMAIL_SYNC_MAX_RESULTS=50
```

## Configuration Options

### EMAIL_SYNC_ENABLED
- **Type:** Boolean (`true` or `false`)
- **Default:** `false`
- **Description:** Enable/disable automatic email syncing
- **Example:** `EMAIL_SYNC_ENABLED=true`

### EMAIL_SYNC_INTERVAL
- **Type:** String
- **Default:** `6h`
- **Options:** `1h`, `6h`, `12h`, `24h`, `1m` (for testing)
- **Description:** How often to run automatic email sync
- **Example:** `EMAIL_SYNC_INTERVAL=6h` (sync every 6 hours)

### EMAIL_SYNC_WINDOW_HOURS
- **Type:** Number
- **Default:** `24`
- **Description:** How many hours back to look for emails during sync
- **Example:** `EMAIL_SYNC_WINDOW_HOURS=24` (fetch emails from last 24 hours)

### EMAIL_SYNC_MAX_RESULTS
- **Type:** Number
- **Default:** `50`
- **Description:** Maximum number of emails to fetch per sync
- **Example:** `EMAIL_SYNC_MAX_RESULTS=50`

## Recommended Settings

### For Testing (Fast Syncing)
```env
EMAIL_SYNC_ENABLED=true
EMAIL_SYNC_INTERVAL=1m
EMAIL_SYNC_WINDOW_HOURS=24
EMAIL_SYNC_MAX_RESULTS=10
```

### For Production (Normal Usage)
```env
EMAIL_SYNC_ENABLED=true
EMAIL_SYNC_INTERVAL=6h
EMAIL_SYNC_WINDOW_HOURS=24
EMAIL_SYNC_MAX_RESULTS=50
```

### For Heavy Users (More Frequent)
```env
EMAIL_SYNC_ENABLED=true
EMAIL_SYNC_INTERVAL=1h
EMAIL_SYNC_WINDOW_HOURS=48
EMAIL_SYNC_MAX_RESULTS=100
```

## How It Works

1. **Server starts** → Scheduler initializes
2. **Cron job runs** at specified interval (e.g., every 6 hours)
3. **Finds all users** with `emailSyncEnabled: true` and `autoSyncEnabled: true`
4. **For each user:**
   - Fetches emails from last `EMAIL_SYNC_WINDOW_HOURS` hours
   - Parses transaction details
   - Creates transactions (avoiding duplicates)
   - Updates sync status
5. **Logs results** to console

## Monitoring

Check server logs for sync activity:
```
[Scheduler] Email sync scheduled: 6h (0 */6 * * *)
[EmailSync] Starting sync for all users...
[EmailSync] Found 5 users to sync
[EmailSync] Starting sync for user: 68c5967a47e30828cab23164
[EmailSync] Completed for user 68c5967a47e30828cab23164: 3 transactions created in 2543ms
[EmailSync] Completed all users: 5 succeeded, 0 failed in 12876ms
```

## User Preferences

Users can customize their sync settings via API:

```bash
curl -X PUT 'http://localhost:5001/api/email/sync/preferences' \
--header 'Authorization: Bearer TOKEN' \
--header 'Content-Type: application/json' \
--data '{
  "autoSyncEnabled": true,
  "emailSyncFrequency": "6h",
  "syncWindowHours": 24
}'
```

## Manual Triggers

### Sync Single User
```bash
curl -X POST 'http://localhost:5001/api/email/sync' \
--header 'Authorization: Bearer TOKEN'
```

### Sync All Users (Admin)
```bash
curl -X POST 'http://localhost:5001/api/email/sync/all' \
--header 'Authorization: Bearer ADMIN_TOKEN'
```

## Disabling Auto-Sync

To disable automatic syncing:

**Globally (all users):**
```env
EMAIL_SYNC_ENABLED=false
```

**Per user:**
```bash
curl -X PUT 'http://localhost:5001/api/email/sync/preferences' \
--header 'Authorization: Bearer TOKEN' \
--data '{"autoSyncEnabled": false}'
```
