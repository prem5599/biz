# Report Cleanup Automation

This document explains how to set up automatic cleanup of expired reports.

## Manual Cleanup

You can manually run the cleanup script using:

```bash
npm run cleanup-reports
```

Or directly with tsx:

```bash
npx tsx scripts/cleanup-reports.ts
```

## Automatic Cleanup (Cron Job)

### Linux/macOS

Add to your crontab (`crontab -e`):

```bash
# Run cleanup daily at 2 AM
0 2 * * * cd /path/to/bizinsights && npm run cleanup-reports >> /var/log/bizinsights-cleanup.log 2>&1

# Run cleanup every 6 hours
0 */6 * * * cd /path/to/bizinsights && npm run cleanup-reports >> /var/log/bizinsights-cleanup.log 2>&1
```

### Windows (Task Scheduler)

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (e.g., Daily at 2:00 AM)
4. Set action to run:
   - Program: `cmd`
   - Arguments: `/c cd /d "C:\path\to\bizinsights" && npm run cleanup-reports`

### Docker/Production

Add to your Docker container or production environment:

```dockerfile
# Add to Dockerfile
RUN echo "0 2 * * * cd /app && npm run cleanup-reports" > /etc/cron.d/report-cleanup
RUN crontab /etc/cron.d/report-cleanup
```

### API Endpoint

You can also trigger cleanup via API:

```bash
# Get report statistics
curl -X GET http://localhost:3002/api/reports/cleanup \
  -H "Authorization: Bearer YOUR_TOKEN"

# Run cleanup manually
curl -X POST http://localhost:3002/api/reports/cleanup \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## How It Works

1. **Report Generation**: When a report is generated, it's saved to the database with an `expiresAt` field set to 7 days from creation
2. **Cleanup Process**: The cleanup script finds all reports where `expiresAt < now()` and deletes them
3. **API Protection**: All report retrieval APIs check `expiresAt` and only return non-expired reports
4. **Logging**: The cleanup process logs all deleted reports for audit purposes

## Configuration

The 7-day expiration is set in:
- `src/app/api/reports/generate/route.ts` (line 52-53)

To change the expiration period, modify:

```typescript
const expiresAt = new Date()
expiresAt.setDate(expiresAt.getDate() + 7) // Change 7 to desired days
```

## Monitoring

The cleanup script provides:
- Current report statistics
- Number of expired reports deleted
- Detailed logging with timestamps
- Error handling and exit codes

Monitor the logs to ensure cleanup is running successfully.