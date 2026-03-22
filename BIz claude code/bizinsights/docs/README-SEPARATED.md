# BizInsights - Separated Architecture

This project has been restructured into a client-server architecture:

## Project Structure

```
bizinsights/
├── biz-client/          # React + Vite frontend
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom hooks
│   │   ├── lib/         # Utilities (API client)
│   │   └── main.tsx     # Entry point
│   └── package.json
│
├── biz-server/          # Express.js backend
│   ├── src/
│   │   ├── routes/      # API routes
│   │   ├── middleware/  # Auth, error handling
│   │   ├── lib/         # Prisma, utilities
│   │   └── index.ts     # Server entry
│   ├── prisma/          # Database schema
│   └── package.json
│
└── src/                 # Original Next.js app (legacy)
```

## Setup Instructions

### 1. Backend Setup (biz-server)

```bash
cd biz-server

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Push database schema
npm run prisma:push

# Start development server (port 5000)
npm run dev
```

### 2. Frontend Setup (biz-client)

```bash
cd biz-client

# Install dependencies
npm install

# Start development server (port 5173)
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Organizations
- `GET /api/organizations` - List user organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations/:id` - Get organization details

### Dashboard
- `GET /api/dashboard/:organizationId` - Get dashboard data

### Integrations
- `GET /api/integrations/available` - List available integrations

## Environment Variables

### biz-server/.env
```
DATABASE_URL="file:../prisma/dev.db"
JWT_SECRET="your-secret-key"
PORT=5000
CLIENT_URL="http://localhost:5173"
```

### biz-client/.env
```
VITE_API_URL=http://localhost:5000/api
```

## Running Both Servers

Terminal 1 (Backend):
```bash
cd biz-server && npm run dev
```

Terminal 2 (Frontend):
```bash
cd biz-client && npm run dev
```

Access the app at: **http://localhost:5173**

## Migration from Next.js

The original Next.js monolithic app is still in the `src/` directory. The new separated architecture provides:

- **Better separation of concerns**
- **Independent scaling** of frontend and backend
- **Easier deployment** to different services
- **Technology flexibility** - can swap React for another framework
- **Clearer API contracts**

## Next Steps

1. Copy remaining components from `src/components` to `biz-client/src/components`
2. Migrate API routes from `src/app/api` to `biz-server/src/routes`
3. Update authentication to use JWT tokens
4. Add more dashboard features
5. Deploy frontend and backend separately
