# 🚀 BizInsights - AI-Powered Business Analytics Platform

BizInsights is a comprehensive SaaS analytics platform that helps small businesses unify their scattered data from multiple sources (Shopify, Stripe, Google Analytics, Facebook Ads) into one unified dashboard with AI-powered insights.

## ✨ Features

### 🔐 Authentication & User Management
- Multi-provider authentication (Google OAuth, email/password)
- Role-based access control (Owner, Admin, Member, Viewer)
- Multi-tenant architecture with organization support
- Secure session management with NextAuth.js
- Team invitation system with expiring tokens

### 📊 Analytics Dashboard
- Real-time business metrics display
- Interactive charts with Recharts
- Revenue tracking and trend analysis
- Customer analytics and segmentation
- Product performance metrics
- Conversion rate tracking
- Average order value (AOV) calculations

### 🤖 AI-Powered Insights
- **Statistical Analysis**: Z-score calculation, standard deviation, moving averages
- **Trend Detection**: Automated revenue and performance trend analysis
- **Anomaly Detection**: Real-time spike/drop detection with severity classification
- **Cross-Platform Correlation**: Identify relationships between different metrics
- **Impact Scoring**: Weighted scoring system (1-10 scale) based on business impact
- **Natural Language Generation**: Plain-English business recommendations

### 📈 Forecasting Engine
- Linear regression forecasting
- Moving average predictions
- Exponential smoothing
- Seasonal adjustment
- Multi-scenario modeling (optimistic/realistic/pessimistic)
- 3-month forecast horizon with confidence scoring

### 🔌 Platform Integrations

#### Shopify
- OAuth authorization flow
- Order, product, and customer data syncing
- Inventory tracking and alerts
- Webhook support for real-time updates
- Revenue and sales analytics

#### Stripe
- Payment and subscription management
- Checkout session creation
- Webhook processing for payment events
- Revenue tracking and MRR calculations
- Customer lifetime value analysis

#### Google Analytics (GA4)
- OAuth and Service Account authentication
- Session, pageview, and user metrics
- Traffic source analysis
- Bounce rate and engagement tracking
- Top pages and conversion tracking

#### Facebook Ads
- Campaign performance tracking
- Ad account management
- ROAS calculations
- Audience insights
- Spend and conversion analytics

#### WooCommerce
- Store integration framework
- Order and product syncing
- Customer data collection

### 📧 Automated Reporting
- **Report Types**: Weekly, Monthly, Quarterly, Custom
- **PDF Generation**: Professional reports with jsPDF and AutoTable
- **Email Delivery**: Automated report delivery with Resend
- **Scheduled Reports**: Cron-based automation
- **Report Templates**: Multiple formats (Executive, Revenue, Customer, Performance)
- **Charts & Visualizations**: Embedded charts in PDF reports
- **Customization**: Include/exclude AI insights and forecasts

### 🔔 Alert System
- Real-time alert generation
- Multiple alert types (Inventory, Performance, Integration, Customer, Financial)
- Severity levels (LOW, MEDIUM, HIGH, CRITICAL)
- Alert status management (Active, Acknowledged, Resolved, Dismissed)
- Email notifications
- Cooldown periods to prevent spam
- Alert history tracking

### ⚙️ Background Job System
- Enterprise-grade Bull Queue implementation
- Job types: Data sync, Insights generation, Report generation, Webhook processing, Email sending
- Exponential backoff retry strategy
- Job monitoring and statistics
- Failed job retention and debugging
- Recurring job scheduling

### 🔒 Security & Compliance

#### Security Features
- AES-256 encryption for sensitive data
- TLS 1.3 for data in transit
- Password hashing with bcrypt
- JWT authentication
- API route protection middleware
- Rate limiting (100 req/min standard, configurable per endpoint)
- Input validation with Zod
- SQL injection prevention (Prisma ORM)
- XSS protection with Content Security Policy
- CSRF protection (NextAuth.js)

#### GDPR Compliance
- **Right to Access**: Complete data export in JSON format
- **Right to Erasure**: Account deletion with complete data removal
- **Data Portability**: Standardized export formats
- **Audit Logging**: Complete activity tracking
- **Privacy by Design**: Minimal data collection
- **Consent Management**: Granular data processing controls

### 🚀 Performance & Scalability
- Multi-tenant architecture
- Efficient database queries with Prisma
- Redis caching for frequently accessed data
- Connection pooling
- Indexed database queries
- Component-based architecture
- React Query for optimized data fetching
- Code splitting and lazy loading
- Image optimization with Next.js Image

### 🎨 UI/UX Components

#### Advanced Components
- Date Range Picker with presets (7d, 30d, 90d, custom)
- Search Input with autocomplete and debouncing
- Notification Center with real-time alerts
- Metric Cards with trend indicators
- Interactive Charts (Line, Bar, Pie, Area)
- Empty States
- Loading Skeletons
- Toast Notifications
- Modal Dialogs

### 👥 Team Collaboration
- Organization member management
- Role-based permissions
- Team invitations via email
- Activity tracking and audit logs
- Shared dashboards (framework)
- Multi-user support

### 💳 Billing & Subscriptions
- Stripe integration
- Subscription tiers:
  - **Free**: 1 integration, basic dashboard
  - **Pro ($29/month)**: 3 integrations, AI insights, weekly reports
  - **Business ($79/month)**: Unlimited integrations, team features, daily reports
  - **Enterprise ($199/month)**: Custom integrations, white-label, priority support
- Checkout session management
- Webhook processing
- Usage limits enforcement
- Customer portal framework

### 🛠️ Developer Experience
- TypeScript for type safety
- Prisma ORM for database operations
- Comprehensive error handling
- API middleware for auth and rate limiting
- Environment-based configuration
- Development and production builds
- Hot module replacement

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Library**: Shadcn/UI with Radix UI
- **Charts**: Recharts
- **State Management**: React Query, Zustand
- **Forms**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js 20+
- **API**: Next.js API Routes
- **Database**: PostgreSQL 15+ (SQLite for development)
- **ORM**: Prisma
- **Cache**: Redis (Upstash)
- **Queue**: Bull Queue
- **Authentication**: NextAuth.js

### Infrastructure
- **Frontend Hosting**: Vercel
- **Database**: Supabase (production)
- **Redis**: Upstash
- **Email**: Resend
- **Payments**: Stripe
- **File Storage**: Local (S3-ready)

### External APIs
- Shopify Admin API
- Stripe API
- Google Analytics Data API
- Facebook Marketing API
- WooCommerce REST API

## 📦 Installation

### Prerequisites
- Node.js 20+
- npm or yarn
- PostgreSQL (or use Supabase)
- Redis (or use Upstash)

### Local Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/your-username/bizinsights.git
cd bizinsights
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/bizinsights"
NEXTAUTH_URL="http://localhost:3002"
NEXTAUTH_SECRET="your-secret-key"
# Add other required environment variables
```

4. **Set up the database**
```bash
npx prisma generate
npx prisma migrate dev
npx prisma db seed  # Optional: Add sample data
```

5. **Run the development server**
```bash
npm run dev
```

6. **Start background workers** (in a separate terminal)
```bash
npm run worker:dev
```

Visit [http://localhost:3002](http://localhost:3002) to see the application.

## 🚀 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive production deployment instructions.

Quick deployment to Vercel:

```bash
npm install -g vercel
vercel login
vercel
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/signin` - User sign in
- `GET /api/auth/session` - Get current session
- `POST /api/auth/signout` - Sign out

### Organization Endpoints
- `GET /api/organizations` - List user organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations/[id]` - Get organization details
- `PATCH /api/organizations/[id]` - Update organization
- `DELETE /api/organizations/[id]` - Delete organization

### Dashboard Endpoints
- `GET /api/organizations/[id]/dashboard` - Get dashboard data
- `GET /api/organizations/[id]/analytics` - Get analytics data
- `GET /api/organizations/[id]/insights` - Get AI insights

### Integration Endpoints
- `GET /api/integrations/available` - List available integrations
- `POST /api/integrations/shopify/connect` - Connect Shopify
- `POST /api/integrations/stripe/connect` - Connect Stripe
- `POST /api/integrations/[platform]/sync` - Sync integration data
- `DELETE /api/integrations/[platform]/disconnect` - Disconnect integration

### Report Endpoints
- `GET /api/reports` - List reports
- `POST /api/reports/generate` - Generate new report
- `GET /api/reports/[id]` - Get specific report
- `POST /api/reports/schedule` - Schedule automated reports

### Alert Endpoints
- `GET /api/alerts` - Get alerts with filters
- `POST /api/alerts` - Create or update alert
- `PATCH /api/alerts/[id]` - Update alert status

### GDPR Endpoints
- `POST /api/gdpr/export` - Export user data
- `POST /api/gdpr/delete-account` - Delete account and data

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Generate coverage report
npm test:coverage
```

## 📖 Project Structure

```
bizinsights/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/               # API routes
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # Dashboard pages
│   │   └── page.tsx           # Landing page
│   ├── components/
│   │   ├── dashboard/         # Dashboard components
│   │   ├── layout/            # Layout components
│   │   └── ui/                # Reusable UI components
│   ├── contexts/              # React contexts
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities and services
│   │   ├── queue/            # Background job processors
│   │   ├── services/         # Business services
│   │   └── insights/         # AI insights engine
│   ├── middleware/            # API middleware
│   └── types/                 # TypeScript types
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Database migrations
├── public/                    # Static files
├── .github/
│   └── workflows/            # CI/CD pipelines
├── tests/                    # Test files
└── docs/                     # Documentation
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [Shadcn/UI](https://ui.shadcn.com/)
- Charts powered by [Recharts](https://recharts.org/)
- Database ORM by [Prisma](https://www.prisma.io/)
- Authentication by [NextAuth.js](https://next-auth.js.org/)

## 📞 Support

- Documentation: [docs.bizinsights.app](https://docs.bizinsights.app)
- Email: support@bizinsights.app
- GitHub Issues: [Create an issue](https://github.com/your-username/bizinsights/issues)

## 🗺️ Roadmap

- [ ] Mobile app (iOS & Android)
- [ ] Advanced team collaboration (comments, annotations)
- [ ] Custom dashboard builder
- [ ] API marketplace for third-party integrations
- [ ] Zapier integration
- [ ] White-label options
- [ ] Multi-language support
- [ ] Advanced predictive analytics
- [ ] Competitive benchmarking

---

**Built with ❤️ by the BizInsights Team**
