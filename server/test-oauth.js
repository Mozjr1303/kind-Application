// Using built-in fetch (Node 18+)

const BASE_URL = 'http://localhost:4000/api';
const JWT_SECRET = 'dev_secret_change_me'; // Must match .env
const jwt = require('jsonwebtoken'); // Need this to generate a fake registerToken

async function runOAuthTest() {
    console.log('🚀 Testing OAuth Completion with Phone Number...\n');

    // 1. Generate a fake registerToken (simulating what the backend does after OAuth callback)
    const fakeProfile = {
        name: 'OAuth User',
        email: `oauth_${Date.now()}@test.com`,
        provider: 'Google'
    };

    const registerToken = jwt.sign(fakeProfile, JWT_SECRET, { expiresIn: '1h' });
    console.log('1️⃣  Generated Register Token');

    // 2. Call oauth-complete endpoint
    console.log('2️⃣  Submitting OAuth Completion Form...');

    const res = await fetch(`${BASE_URL}/auth/oauth-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            registerToken,
            role: 'PROVIDER',
            phone_number: '+265991600735' // Admin phone for testing
        })
    });

    const data = await res.json();
    console.log(`   Response: ${res.status} ${res.statusText}`);

    if (res.status === 201) {
        console.log('   ✅ OAuth User Created Successfully');
        console.log(`   ID: ${data.id}`);
        console.log(`   Phone: ${data.phone_number}`);
        console.log(`   Role: ${data.role}`);

        if (data.phone_number === '+265991600735') {
            console.log('   ✅ Phone Number Saved Correctly');
        } else {
            console.error('   ❌ Phone Number Mismatch');
        }
    } else {
        console.error('   ❌ Registration Failed', data);
    }
}

runOAuthTest().catch(console.error);
