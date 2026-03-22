# BizInsights - Business Intelligence Platform

A modern business intelligence platform with separated client-server architecture.

## 🏗️ Architecture

This project uses a separated architecture:

- **biz-client/** - React + Vite frontend (Port 5173)
- **biz-server/** - Express.js backend (Port 5000)
- **prisma/** - Shared database schema

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or 20+
- npm or pnpm

### 1. Backend Setup

```bash
cd biz-server
npm install
npm run prisma:generate
npm run prisma:push
npm run dev
```

Backend will run on: http://localhost:5000

### 2. Frontend Setup

```bash
cd biz-client
npm install
npm run dev
```

Frontend will run on: http://localhost:5173

### 3. Access the Application

Open your browser and navigate to: **http://localhost:5173**

## 📁 Project Structure

```
bizinsights/
├── biz-client/              # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/           # Page components
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # API client & utilities
│   │   ├── contexts/        # React contexts
│   │   └── types/           # TypeScript types
│   ├── package.json
│   ├── vite.config.ts
│   └── .env
│
├── biz-server/              # Backend (Express.js)
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── middleware/      # Express middleware
│   │   ├── lib/             # Business logic & services
│   │   └── workers/         # Background jobs
│   ├── prisma/              # Database schema
│   ├── package.json
│   └── .env
│
├── prisma/                  # Shared database
│   └── dev.db              # SQLite database file
│
└── docs/                    # Documentation
    ├── MIGRATION-COMPLETE.md
    ├── DEPLOYMENT.md
    ├── BACKGROUND-JOBS-GUIDE.md
    ├── FACEBOOK-ADS-INTEGRATION-GUIDE.md
    ├── QUEUE_SYSTEM.md
    └── README-SEPARATED.md
```

## 🔑 Features

- **Authentication**: JWT-based authentication with bcrypt
- **Organizations**: Multi-organization support
- **Dashboard**: Real-time business metrics
- **Analytics**: Customer, product, and revenue analytics
- **Integrations**: Connect Shopify, Stripe, Google Analytics, Facebook Ads
- **Reports**: Generate and schedule business reports
- **Alerts**: Automated business alerts
- **Team Management**: Invite and manage team members
- **Billing**: Subscription management with Stripe

## 🛠️ Tech Stack

### Frontend
- React 18
- Vite
- React Router
- React Query (TanStack Query)
- Tailwind CSS
- Axios
- TypeScript

### Backend
- Express.js
- Prisma ORM
- SQLite (development) / PostgreSQL (production)
- JWT (jsonwebtoken)
- bcrypt
- TypeScript
- Bull (job queue)
- Redis (optional, for background jobs)

## 📚 API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Organizations
- `GET /api/organizations` - List organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations/:id` - Get organization details

### Dashboard
- `GET /api/dashboard/:organizationId` - Get dashboard data

### Analytics
- `GET /api/analytics` - Get analytics data
- `GET /api/analytics/customers` - Customer analytics
- `GET /api/analytics/products` - Product analytics

### Integrations
- `GET /api/integrations/available` - List available integrations
- `GET /api/integrations` - Get connected integrations
- `POST /api/integrations/:platform/connect` - Connect integration

### Reports
- `GET /api/reports` - List reports
- `POST /api/reports/generate` - Generate report
- `GET /api/reports/schedule` - Get scheduled reports

For complete API documentation, see [MIGRATION-COMPLETE.md](./MIGRATION-COMPLETE.md)

## ⚙️ Environment Variables

### Backend (.env)
```env
DATABASE_URL="file:../prisma/dev.db"
JWT_SECRET="your-secret-key"
PORT=5000
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

## 🧪 Development

### Run Backend in Development Mode
```bash
cd biz-server
npm run dev
```

### Run Frontend in Development Mode
```bash
cd biz-client
npm run dev
```

### Database Commands
```bash
cd biz-server

# Generate Prisma client
npm run prisma:generate

# Push schema to database
npm run prisma:push

# Open Prisma Studio
npm run prisma:studio

# Create migration
npm run prisma:migrate
```

## 📦 Build for Production

### Build Backend
```bash
cd biz-server
npm run build
npm start
```

### Build Frontend
```bash
cd biz-client
npm run build
npm run preview
```

## 🚢 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Recommended:**
- Frontend: Vercel, Netlify, or Cloudflare Pages
- Backend: Railway, Render, or Fly.io
- Database: PostgreSQL on Railway or Supabase

## 📖 Documentation

- [Migration Complete](./docs/MIGRATION-COMPLETE.md) - Full migration details
- [Separated Architecture](./docs/README-SEPARATED.md) - Architecture overview
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment
- [Background Jobs](./docs/BACKGROUND-JOBS-GUIDE.md) - Queue system setup
- [Facebook Ads Integration](./docs/FACEBOOK-ADS-INTEGRATION-GUIDE.md) - Integration guide
- [Queue System](./docs/QUEUE_SYSTEM.md) - Job queue documentation

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software.

## 🆘 Support

For support, please contact the development team or open an issue in the repository.

---

**Built with ❤️ using React, Express, and TypeScript**
