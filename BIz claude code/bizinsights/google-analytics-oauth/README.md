# 📊 Google Analytics OAuth SaaS Integration

Complete Google Analytics OAuth 2.0 integration for SaaS platforms with Express.js backend and GA4 Analytics Data API.

## 🚀 Features

- ✅ **OAuth 2.0 Authorization Code Flow**
- ✅ **GA4 Analytics Data API Integration**
- ✅ **Automatic Token Refresh Logic**
- ✅ **Secure Token Storage with Encryption**
- ✅ **Report Caching System**
- ✅ **Frontend Examples (Next.js & HTML)**
- ✅ **Production Database Schema**
- ✅ **Comprehensive Security Measures**

## 📋 Prerequisites

1. **Google Cloud Console Account**
2. **Google Analytics GA4 Property**
3. **Node.js 16+**
4. **PostgreSQL** (for production)

## 🛠️ Quick Setup

### 1. Google Cloud Console Setup
Follow [SETUP.md](./SETUP.md) for detailed Google Cloud Console configuration.

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your Google OAuth credentials
```

### 4. Run the Server
```bash
# Development (in-memory storage)
npm run dev

# Production (with database)
npm run dev:db
```

## 🔧 Environment Variables

```bash
# Required
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback

# Optional
PORT=3000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://user:pass@localhost:5432/db
ENCRYPTION_KEY=your-32-character-encryption-key
```

## 📚 API Endpoints

### OAuth Flow
- `GET /auth-google?userId=USER_ID` - Generate authorization URL
- `GET /oauth2callback` - Handle OAuth callback

### Analytics Data
- `GET /analytics/accounts/:userId` - Get user's Analytics accounts
- `GET /analytics/pageviews/:userId/:propertyId` - Get page views report
- `POST /analytics/reports/:userId` - Custom GA4 reports

### Authentication Management
- `GET /auth/status/:userId` - Check authentication status
- `POST /auth/revoke/:userId` - Revoke user access

## 🎯 Usage Examples

### 1. Initialize OAuth Flow
```javascript
const response = await fetch('/auth-google?userId=user123');
const { authUrl } = await response.json();
window.location.href = authUrl;
```

### 2. Fetch Page Views
```javascript
const response = await fetch('/analytics/pageviews/user123/property456');
const data = await response.json();
console.log(data.pageViews);
```

### 3. Custom GA4 Report
```javascript
const reportConfig = {
  propertyId: '12345',
  startDate: '30daysAgo',
  endDate: 'today',
  metrics: [
    { name: 'screenPageViews' },
    { name: 'sessions' }
  ],
  dimensions: [
    { name: 'pagePath' },
    { name: 'country' }
  ],
  limit: 100
};

const response = await fetch('/analytics/reports/user123', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(reportConfig)
});
```

## 🔒 Security Features

### Token Management
- Encrypted token storage
- Automatic refresh before expiry
- Secure state parameter validation
- Token revocation support

### API Security
- Rate limiting
- Input validation
- CORS configuration
- Security headers

### Data Protection
- Database encryption
- Secure error handling
- Audit logging
- HTTS enforcement

See [SECURITY.md](./SECURITY.md) for detailed security practices.

## 🗄️ Database Schema

### OAuth Tokens Table
```sql
CREATE TABLE oauth_tokens (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,        -- Encrypted
  refresh_token TEXT,                -- Encrypted
  expiry_date BIGINT,
  scope TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Analytics Reports Cache
```sql
CREATE TABLE analytics_reports (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  property_id VARCHAR(255) NOT NULL,
  report_type VARCHAR(100) NOT NULL,
  date_range VARCHAR(50) NOT NULL,
  report_data JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL
);
```

## 📱 Frontend Integration

### Next.js Component
```jsx
import GoogleAnalyticsAuth from './components/GoogleAnalyticsAuth';

function Dashboard() {
  return (
    <GoogleAnalyticsAuth 
      userId="user123"
      onAuthSuccess={(data) => console.log('Connected!', data)}
    />
  );
}
```

### Plain HTML
```html
<!DOCTYPE html>
<html>
<head>
    <title>Analytics Dashboard</title>
</head>
<body>
    <div id="app">
        <button onclick="connectAnalytics()">
            Connect Google Analytics
        </button>
    </div>
    
    <script>
        async function connectAnalytics() {
            const response = await fetch('/auth-google?userId=user123');
            const { authUrl } = await response.json();
            window.location.href = authUrl;
        }
    </script>
</body>
</html>
```

## 🚀 Deployment

### Heroku
```bash
# Create app
heroku create your-analytics-app

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set GOOGLE_CLIENT_ID=your_id
heroku config:set GOOGLE_CLIENT_SECRET=your_secret
heroku config:set ENCRYPTION_KEY=$(openssl rand -hex 32)

# Deploy
git push heroku main
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📊 Available GA4 Metrics

### Standard Metrics
- `screenPageViews` - Page views
- `sessions` - Sessions
- `activeUsers` - Active users
- `bounceRate` - Bounce rate
- `averageSessionDuration` - Session duration
- `conversions` - Conversion events

### E-commerce Metrics
- `purchaseRevenue` - Revenue
- `purchases` - Purchase events
- `itemViews` - Product views
- `addToCarts` - Add to cart events

### Dimensions
- `pagePath` - Page URL
- `pageTitle` - Page title  
- `country` - User country
- `deviceCategory` - Device type
- `sessionSource` - Traffic source
- `sessionMedium` - Traffic medium

## 🔍 Testing

### Test OAuth Flow
1. Visit `http://localhost:3000/frontend/index.html`
2. Click "Connect Google Analytics"
3. Complete Google OAuth consent
4. Test API endpoints

### API Testing
```bash
# Check auth status
curl http://localhost:3000/auth/status/user123

# Get accounts
curl http://localhost:3000/analytics/accounts/user123

# Get page views
curl http://localhost:3000/analytics/pageviews/user123/property456
```

## 🛡️ Best Practices

### Security
- Store client secrets securely
- Use HTTPS in production
- Implement rate limiting
- Validate all inputs
- Encrypt sensitive data
- Monitor for suspicious activity

### Performance
- Cache report data appropriately
- Use database indexes
- Implement pagination for large datasets
- Set reasonable API limits
- Monitor quota usage

### Reliability
- Implement retry logic for API calls
- Handle token expiration gracefully
- Log errors appropriately
- Use database transactions
- Set up health checks

## 📖 Google Analytics Scopes

### Analytics Readonly
```
https://www.googleapis.com/auth/analytics.readonly
```
- Read Analytics account data
- View reports and configurations
- Access GA4 properties and data streams

### User Info (Optional)
```
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
```
- Get user email and profile information

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support & Resources

- [Google Analytics Data API Documentation](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Cloud Console](https://console.cloud.google.com/)
- [GA4 Query Explorer](https://developers.google.com/analytics/devguides/reporting/data/v1/query-explorer)

## 🐛 Troubleshooting

### Common Issues

**401 Unauthorized**
- Check client ID/secret configuration
- Verify redirect URI matches exactly
- Ensure tokens haven't expired

**403 Insufficient Permissions**
- Verify Analytics account access
- Check requested scopes
- Confirm property permissions

**Invalid Property ID**
- Use GA4 property ID (starts with numbers)
- Not Universal Analytics property ID
- Check property exists and is accessible

**Token Refresh Failures**
- Ensure refresh token was granted
- Check token storage/retrieval
- Verify client credentials