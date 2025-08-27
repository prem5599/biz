# Google Cloud Console Setup for Analytics API

## Step 1: Create Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: "Analytics SaaS Platform"
4. Click "Create"

## Step 2: Enable APIs
1. Go to "APIs & Services" → "Library"
2. Search and enable:
   - **Google Analytics Data API**
   - **Google Analytics Reporting API** (optional)

## Step 3: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Configure consent screen first if prompted:
   - User Type: External
   - App name: "Your SaaS Platform"
   - User support email: your-email@domain.com
   - Scopes: Add `https://www.googleapis.com/auth/analytics.readonly`
   - Test users: Add your Google account

## Step 4: OAuth Client Configuration
1. Application type: **Web application**
2. Name: "Analytics OAuth Client"
3. Authorized redirect URIs:
   ```
   http://localhost:3000/oauth2callback
   https://yourdomain.com/oauth2callback
   ```
4. Click "Create"
5. Copy **Client ID** and **Client Secret**

## Step 5: Required Scopes
```
https://www.googleapis.com/auth/analytics.readonly
```

## Step 6: Consent Screen Details
- **Application name**: Your SaaS Platform
- **Application logo**: Upload your logo
- **Support email**: your-support@domain.com
- **Scopes**: Analytics readonly access
- **Privacy Policy**: Required for production
- **Terms of Service**: Required for production