# Security Best Practices for Google Analytics OAuth Integration

## 🔐 OAuth Security

### State Parameter Validation
```javascript
// Generate cryptographically secure state
const state = crypto.randomBytes(32).toString('hex');

// Store with expiration
stateStore.set(state, {
  userId,
  expires: Date.now() + 10 * 60 * 1000 // 10 minutes
});

// Validate on callback
if (!stateData || Date.now() > stateData.expires) {
  throw new Error('Invalid or expired state');
}
```

### Token Security
```javascript
// Encrypt tokens at rest
const encryptedToken = encrypt(accessToken);

// Use environment variables for secrets
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Never log sensitive tokens
console.log('Token stored for user:', userId); // ✅ Good
console.log('Access token:', accessToken);     // ❌ Never do this
```

### Redirect URI Validation
```javascript
// Whitelist exact redirect URIs in Google Cloud Console
const ALLOWED_REDIRECTS = [
  'http://localhost:3000/oauth2callback',      // Development
  'https://yourdomain.com/oauth2callback'     // Production
];

// Validate redirect URI matches exactly
if (!ALLOWED_REDIRECTS.includes(req.query.redirect_uri)) {
  throw new Error('Invalid redirect URI');
}
```

## 🛡️ API Security

### Scope Validation
```javascript
// Request minimal required scopes
const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly'
];

// Validate granted scopes match requested
function validateScopes(grantedScopes, requiredScopes) {
  return requiredScopes.every(scope => 
    grantedScopes.includes(scope)
  );
}
```

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many API requests'
});

app.use('/analytics/', apiLimiter);
```

### Input Validation
```javascript
// Validate property ID format
function validatePropertyId(propertyId) {
  const regex = /^\d+$/;
  if (!regex.test(propertyId)) {
    throw new Error('Invalid property ID format');
  }
}

// Sanitize date inputs
function validateDateRange(startDate, endDate) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$|^\d+daysAgo$|^today$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    throw new Error('Invalid date format');
  }
}
```

## 🔄 Token Management

### Secure Storage
```javascript
// Use database with encryption for production
class SecureTokenStorage {
  static async storeTokens(userId, tokens) {
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = encrypt(tokens.refresh_token);
    
    await db.query(`
      INSERT INTO oauth_tokens (user_id, access_token, refresh_token) 
      VALUES ($1, $2, $3)
    `, [userId, encryptedAccessToken, encryptedRefreshToken]);
  }
}
```

### Token Refresh
```javascript
// Proactive token refresh before expiry
async function refreshTokenIfNeeded(tokens) {
  const BUFFER_TIME = 60000; // 1 minute buffer
  
  if (tokens.expiry_date && Date.now() >= tokens.expiry_date - BUFFER_TIME) {
    return await refreshAccessToken(tokens.refresh_token);
  }
  
  return tokens;
}
```

### Token Revocation
```javascript
// Proper token cleanup on logout/revoke
async function revokeUserAccess(userId) {
  const tokens = await getTokens(userId);
  
  // Revoke with Google
  if (tokens.access_token) {
    await oauth2Client.revokeToken(tokens.access_token);
  }
  
  // Remove from database
  await deleteUserTokens(userId);
}
```

## 🌐 Network Security

### HTTPS Enforcement
```javascript
// Force HTTPS in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});
```

### CORS Configuration
```javascript
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
```

### Security Headers
```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

## 📊 Monitoring & Logging

### Security Event Logging
```javascript
const winston = require('winston');

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'security.log' })
  ]
});

// Log security events
function logSecurityEvent(event, userId, details) {
  securityLogger.info({
    event,
    userId,
    details,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
}
```

### Failed Authentication Monitoring
```javascript
const failedAttempts = new Map();

function trackFailedAuth(identifier) {
  const attempts = failedAttempts.get(identifier) || 0;
  failedAttempts.set(identifier, attempts + 1);
  
  if (attempts > 5) {
    logSecurityEvent('SUSPICIOUS_AUTH_ATTEMPTS', identifier, { attempts });
    // Consider blocking or alerting
  }
}
```

## 🔒 Database Security

### Connection Security
```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### SQL Injection Prevention
```javascript
// Always use parameterized queries
async function getUserTokens(userId) {
  const result = await pool.query(
    'SELECT * FROM oauth_tokens WHERE user_id = $1',
    [userId] // ✅ Parameterized
  );
  
  // Never concatenate user input
  // const query = `SELECT * FROM tokens WHERE user_id = '${userId}'`; // ❌ Dangerous
}
```

### Data Encryption
```javascript
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
}
```

## 🚨 Error Handling

### Safe Error Responses
```javascript
// Don't expose internal errors to clients
function handleError(error, res) {
  console.error('Internal error:', error);
  
  // Generic error response
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
  
  // Never expose stack traces in production
  if (process.env.NODE_ENV === 'development') {
    console.error(error.stack);
  }
}
```

### Input Sanitization
```javascript
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML
    .substring(0, 1000);   // Limit length
}
```

## 📋 Security Checklist

### Pre-Production
- [ ] All secrets stored in environment variables
- [ ] Database connections encrypted
- [ ] Token storage encrypted
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] Security headers configured
- [ ] Logging implemented
- [ ] Error handling sanitized

### Google Cloud Console
- [ ] Redirect URIs whitelisted
- [ ] Client secrets secured
- [ ] Consent screen configured
- [ ] Scopes minimized
- [ ] API quotas set
- [ ] Usage monitoring enabled

### Regular Maintenance
- [ ] Rotate client secrets quarterly
- [ ] Monitor failed authentication attempts
- [ ] Review access logs monthly
- [ ] Update dependencies regularly
- [ ] Audit user permissions
- [ ] Clean expired tokens