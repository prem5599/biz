# 🛍️ Shopify OAuth SaaS Integration

Complete Shopify OAuth 2.0 integration for SaaS platforms with Express.js backend and frontend examples.

## 🚀 Features

- ✅ OAuth 2.0 Authorization Code Flow
- ✅ HMAC Security Validation
- ✅ GraphQL Admin API Integration
- ✅ Automatic Webhook Registration
- ✅ Database Token Storage
- ✅ Frontend Examples (Next.js & HTML)
- ✅ Production-Ready Error Handling

## 📋 Prerequisites

1. **Shopify Partner Account**: [Create one here](https://partners.shopify.com/)
2. **Shopify App**: Create a new app in Partner Dashboard
3. **Node.js**: Version 16+ required
4. **PostgreSQL**: For production database storage (optional)

## 🛠️ Quick Setup

### 1. Clone and Install
```bash
git clone <your-repo>
cd shopify-oauth
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your Shopify app credentials
```

### 3. Set Up Shopify App
1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Create new app → Choose "Build app"
3. Set App URL: `http://localhost:3000`
4. Set Redirect URL: `http://localhost:3000/callback`
5. Copy Client ID and Client Secret to `.env`

### 4. Run the Server
```bash
# In-memory storage (development)
npm run dev

# With database (production)
npm run dev:db
```

## 🔧 Environment Variables

```bash
# Required
SHOPIFY_CLIENT_ID=your_app_client_id
SHOPIFY_CLIENT_SECRET=your_app_client_secret
SHOPIFY_REDIRECT_URI=http://localhost:3000/callback

# Optional
PORT=3000
WEBHOOK_BASE_URL=http://localhost:3000
DATABASE_URL=postgresql://user:pass@localhost:5432/db
```

## 📚 API Endpoints

### OAuth Flow
- `GET /auth?shop=shop-name` - Generate install URL
- `GET /callback` - Handle OAuth callback

### Data Access
- `GET /products/:shop` - Fetch shop products (GraphQL)
- `GET /orders/:shop` - Fetch shop orders (GraphQL)
- `GET /shops` - List connected shops

### Webhooks
- `POST /webhooks/orders/create` - Handle new orders

## 🎯 Usage Examples

### 1. Generate Install URL
```javascript
const response = await fetch('/auth?shop=test-shop');
const { authURL } = await response.json();
window.location.href = authURL;
```

### 2. Fetch Products
```javascript
const response = await fetch('/products/test-shop');
const data = await response.json();
console.log(data.data.products.edges);
```

### 3. Handle Webhooks
```javascript
// Webhook automatically registered on app install
// Orders stored in database when received
```

## 🔒 Security Features

### HMAC Validation
```javascript
function validateHMAC(query, secret) {
  const { hmac, ...params } = query;
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  const computedHmac = crypto
    .createHmac('sha256', secret)
    .update(sortedParams)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(hmac, 'hex'),
    Buffer.from(computedHmac, 'hex')
  );
}
```

### State Parameter (CSRF Protection)
- Random state generated for each install
- Validated on callback
- Expires after 10 minutes

## 📱 Frontend Integration

### Next.js Component
```jsx
const handleInstall = async () => {
  const response = await axios.get(`/auth?shop=${shop}`);
  window.location.href = response.data.authURL;
};
```

### Plain HTML
```html
<button onclick="installShopifyApp()">
  Connect to Shopify
</button>
```

## 🗄️ Database Schema

```sql
-- Shops table
CREATE TABLE shops (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  scope TEXT NOT NULL,
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Webhooks table  
CREATE TABLE webhooks (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) REFERENCES shops(shop_domain),
  webhook_id BIGINT NOT NULL,
  topic VARCHAR(100) NOT NULL,
  address TEXT NOT NULL
);

-- Orders table
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) REFERENCES shops(shop_domain),
  shopify_order_id BIGINT NOT NULL,
  order_name VARCHAR(50),
  total_price DECIMAL(10,2),
  order_data JSONB
);
```

## 🚀 Deployment

### Heroku
```bash
heroku create your-app-name
heroku addons:create heroku-postgresql:mini
heroku config:set SHOPIFY_CLIENT_ID=your_id
heroku config:set SHOPIFY_CLIENT_SECRET=your_secret
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

## 🔍 Testing

### Test OAuth Flow
1. Visit `http://localhost:3000/frontend/index.html`
2. Enter test shop name
3. Complete OAuth flow
4. Test API endpoints

### Test Webhooks
```bash
# Use ngrok for webhook testing
npx ngrok http 3000
# Update WEBHOOK_BASE_URL in .env
```

## 📖 Shopify Scopes

Current scopes requested:
- `read_products` - Access products data
- `read_orders` - Access orders data  
- `write_orders` - Modify orders
- `read_customers` - Access customer data
- `write_webhooks` - Register webhooks

## 🛡️ Best Practices

1. **Never store client secret in frontend**
2. **Always validate HMAC on callbacks**
3. **Use HTTPS in production**
4. **Implement rate limiting**
5. **Log security events**
6. **Rotate access tokens periodically**

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add tests
4. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- [Shopify OAuth Docs](https://shopify.dev/docs/apps/build/authentication-authorization)
- [GraphQL Admin API](https://shopify.dev/docs/api/admin-graphql)
- [Webhooks Guide](https://shopify.dev/docs/apps/build/webhooks)