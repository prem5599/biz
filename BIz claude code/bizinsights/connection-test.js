// Test different connection strings
const connectionStrings = [
  // Original pooler
  'postgresql://postgres.tpgkwfkgfqdpldiqgonz:premkumar@5599@aws-0-ap-south-1.pooler.supabase.com:5432/postgres',
  
  // URL encoded
  'postgresql://postgres.tpgkwfkgfqdpldiqgonz:premkumar%405599@aws-0-ap-south-1.pooler.supabase.com:5432/postgres',
  
  // Direct connection
  'postgresql://postgres.tpgkwfkgfqdpldiqgonz:premkumar%405599@db.tpgkwfkgfqdpldiqgonz.supabase.co:5432/postgres',
  
  // With SSL and connection params
  'postgresql://postgres.tpgkwfkgfqdpldiqgonz:premkumar%405599@db.tpgkwfkgfqdpldiqgonz.supabase.co:5432/postgres?sslmode=require',
  
  // Transaction pooler (port 6543)
  'postgresql://postgres.tpgkwfkgfqdpldiqgonz:premkumar%405599@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  
  // With pgbouncer
  'postgresql://postgres.tpgkwfkgfqdpldiqgonz:premkumar%405599@db.tpgkwfkgfqdpldiqgonz.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1'
]

console.log('Try these connection strings in your .env file:')
connectionStrings.forEach((str, i) => {
  console.log(`\n${i + 1}. DATABASE_URL='${str}'`)
})