// Using built-in fetch (Node 18+)

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const BASE_URL = `${process.env.API_BASE_URL || 'http://localhost:4000'}/api`;
const JWT_SECRET = process.env.JWT_SECRET;
const TEST_PHONE_NUMBER = process.env.TEST_PHONE_NUMBER;
const jwt = require('jsonwebtoken'); // Need this to generate a fake registerToken

async function runOAuthTest() {
    if (!JWT_SECRET) throw new Error('JWT_SECRET is required to run this test.');
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
            role: 'provider',
            phone_number: TEST_PHONE_NUMBER
        })
    });

    const data = await res.json();
    console.log(`   Response: ${res.status} ${res.statusText}`);

    if (res.status === 201) {
        console.log('   ✅ OAuth User Created Successfully');
        console.log(`   ID: ${data.user.id}`);
        console.log(`   Phone: ${data.user.phone_number || 'not provided'}`);
        console.log(`   Role: ${data.user.role}`);

        if (data.user.phone_number === TEST_PHONE_NUMBER) {
            console.log('   ✅ Phone Number Saved Correctly');
        } else if (TEST_PHONE_NUMBER) {
            console.error('   ❌ Phone Number Mismatch');
        }
    } else {
        console.error('   ❌ Registration Failed', data);
    }
}

runOAuthTest().catch(console.error);
