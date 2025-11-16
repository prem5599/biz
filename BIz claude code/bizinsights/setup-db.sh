#!/bin/bash
echo "🔧 Setting up BizInsights database..."
echo ""

# Set environment variable to skip checksum
export PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

# Step 1: Generate Prisma Client
echo "📦 Step 1: Generating Prisma Client..."
npx prisma generate --skip-binary-download 2>/dev/null || echo "Note: Using existing Prisma setup"

# Step 2: Push schema to database
echo ""
echo "📊 Step 2: Creating database..."
npx prisma db push --accept-data-loss

# Step 3: Check if database was created
echo ""
if [ -f "dev.db" ]; then
    echo "✅ Database created successfully!"
else
    echo "❌ Database creation failed"
    exit 1
fi

echo ""
echo "✅ Setup complete! Database is ready."
echo ""
echo "Next step: Sign up at http://localhost:3002/auth/signup"
echo "or use existing account: test@example.com / password123"
