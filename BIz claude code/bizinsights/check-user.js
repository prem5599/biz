// Quick script to check user's organization
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./dev.db');

console.log('Checking user and organization...\n');

// Check if test user exists
db.get('SELECT id, email FROM User WHERE email = ?', ['test@example.com'], (err, user) => {
  if (err) {
    console.error('Error:', err);
    return;
  }

  if (!user) {
    console.log('❌ User test@example.com not found');
    db.close();
    return;
  }

  console.log('✅ User found:', user.email, '(ID:', user.id + ')');

  // Check if user has organization membership
  db.get(`
    SELECT o.id, o.name, om.role
    FROM Organization o
    JOIN OrganizationMember om ON om.organizationId = o.id
    WHERE om.userId = ?
  `, [user.id], (err, org) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }

    if (!org) {
      console.log('❌ No organization found for this user');
      console.log('\nSolution: Run the seed script to create organization');
      console.log('Or create one manually in the database');
    } else {
      console.log('✅ Organization found:', org.name, '(ID:', org.id + ')');
      console.log('✅ User role:', org.role);
      console.log('\n🎉 Everything looks good! You can connect Shopify.');
    }

    db.close();
  });
});
