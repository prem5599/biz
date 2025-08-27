#!/usr/bin/env node

// Simple functionality test script
const http = require('http');

const tests = [
  {
    name: 'Landing Page',
    path: '/',
    expectedStatus: 200
  },
  {
    name: 'Auth Sign In',
    path: '/auth/signin',
    expectedStatus: 200
  },
  {
    name: 'Auth Sign Up', 
    path: '/auth/signup',
    expectedStatus: 200
  },
  {
    name: 'Dashboard (redirects to auth)',
    path: '/dashboard',
    expectedStatus: 307,
    expectRedirect: true
  },
  {
    name: 'Analytics Page (redirects to auth)',
    path: '/dashboard/analytics',
    expectedStatus: 307,
    expectRedirect: true
  },
  {
    name: 'Reports Page (redirects to auth)',
    path: '/dashboard/reports', 
    expectedStatus: 307,
    expectRedirect: true
  },
  {
    name: 'Team Page (redirects to auth)',
    path: '/dashboard/team',
    expectedStatus: 307,
    expectRedirect: true
  },
  {
    name: 'Integrations Page (redirects to auth)',
    path: '/dashboard/integrations',
    expectedStatus: 307,
    expectRedirect: true
  },
  {
    name: 'Settings Page (redirects to auth)',
    path: '/dashboard/settings',
    expectedStatus: 307,
    expectRedirect: true
  },
  {
    name: 'API Organizations (requires auth)',
    path: '/api/organizations',
    expectedStatus: 401
  },
  {
    name: 'API Auth Register (validation)',
    path: '/api/auth/register',
    method: 'POST',
    expectedStatus: 400 // Should fail validation without proper data
  }
];

function makeRequest(test) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: test.path,
      method: test.method || 'GET'
    };

    if (test.method === 'POST') {
      options.headers = {
        'Content-Type': 'application/json'
      };
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const success = res.statusCode === test.expectedStatus;
        console.log(`${success ? '✅' : '❌'} ${test.name}: ${res.statusCode} ${success ? 'PASS' : 'FAIL'}`);
        
        if (test.expectRedirect && data.includes('/api/auth/signin')) {
          console.log(`   → Correctly redirecting to auth`);
        }
        
        resolve(success);
      });
    });

    req.on('error', (e) => {
      console.log(`❌ ${test.name}: ERROR - ${e.message}`);
      resolve(false);
    });

    if (test.method === 'POST') {
      req.write('{}'); // Send empty JSON for validation test
    }

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Running BizInsights Functionality Tests\n');
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    const result = await makeRequest(test);
    if (result) passed++;
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between requests
  }
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Application is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the output above for details.');
  }
}

runTests().catch(console.error);