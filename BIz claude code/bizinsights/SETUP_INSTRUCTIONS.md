# 🚨 Database Connection Issue - How to Fix

The database connection is currently failing. Here are the steps to resolve this:

## Option 1: Fix Supabase Connection

1. **Check your Supabase dashboard**:
   - Go to https://supabase.com/dashboard
   - Select your project `tpgkwfkgfqdpldiqgonz`
   - Navigate to Settings > Database

2. **Verify the connection details**:
   - Host should be: `db.tpgkwfkgfqdpldiqgonz.supabase.co`
   - Port: `5432`
   - Database: `postgres`
   - Username: `postgres.tpgkwfkgfqdpldiqgonz`
   - Password: `premkumar@5599`

3. **Check if database is paused**:
   - Supabase pauses inactive databases
   - Look for a "Resume" button in your dashboard
   - Click it to wake up the database

4. **Try the correct connection string**:
   ```
   DATABASE_URL='postgresql://postgres.tpgkwfkgfqdpldiqgonz:premkumar%405599@db.tpgkwfkgfqdpldiqgonz.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1'
   ```

## Option 2: Use Local PostgreSQL

1. **Install PostgreSQL locally**:
   - Download from https://www.postgresql.org/download/
   - Or use Docker: `docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres`

2. **Update .env file**:
   ```
   DATABASE_URL="postgresql://postgres:password@localhost:5432/bizinsights?schema=public"
   ```

3. **Create database and run migrations**:
   ```bash
   cd bizinsights
   npx prisma db push
   ```

## Option 3: Temporary File-Based Solution

I've created a temporary solution that will show you better error messages. Try creating an account now and you should see a more detailed error that will help us debug the issue.

## Current Status

✅ **Working without database**:
- Landing page
- Sign-up page with validation
- Sign-in page
- Dashboard UI (with mock data)

❌ **Needs database**:
- User registration
- User authentication
- Data persistence

## Quick Test

1. Visit `http://localhost:3001`
2. Click "Get Started"
3. Try to create an account
4. You should now see a detailed error message that will help us fix the database connection

## Next Steps

Once the database is connected, run:
```bash
cd bizinsights
npx prisma db push
npx prisma generate
```

This will create all the necessary tables and you'll be able to create accounts successfully!