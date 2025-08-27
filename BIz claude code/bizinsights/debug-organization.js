// Debug script to check organization setup
async function debugOrganization() {
  try {
    console.log('🔍 Checking organizations endpoint...');
    
    // Test the organizations API
    const response = await fetch('http://localhost:3002/api/organizations');
    const data = await response.json();
    
    console.log('Organizations response:', data);
    
    if (!data.data || data.data.length === 0) {
      console.log('❌ No organizations found. Creating a default organization...');
      
      // Create a default organization
      const createResponse = await fetch('http://localhost:3002/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Default Organization',
          slug: 'default-org'
        })
      });
      
      const createData = await createResponse.json();
      console.log('✅ Created organization:', createData);
    } else {
      console.log('✅ Found organizations:', data.data.length);
      console.log('First organization ID:', data.data[0].id);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.status === 401) {
      console.log('🔐 Authentication required. Make sure you are signed in.');
    }
  }
}

debugOrganization();