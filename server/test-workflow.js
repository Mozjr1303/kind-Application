// Using built-in fetch (Node 18+)

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const BASE_URL = `${process.env.API_BASE_URL || 'http://localhost:4000'}/api`;
const ADMIN_PHONE = process.env.ADMIN_PHONE_NUMBER;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Helper for delays
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
    console.log('🚀 Starting End-to-End SMS Workflow Test...\n');
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required to run this workflow test.');
    }

    const adminLoginRes = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    const adminLoginData = await adminLoginRes.json();
    if (!adminLoginRes.ok) throw new Error('Could not authenticate the configured admin user.');

    // 1. Register a New Provider
    console.log('1️⃣  Registering New Provider...');
    const providerEmail = `provider_${Date.now()}@test.com`;
    const providerPhone = ADMIN_PHONE;

    const providerRes = await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test Provider',
            email: providerEmail,
            password: 'password123',
            role: 'provider',
            phone_number: providerPhone
        })
    });

    const providerData = await providerRes.json();
    console.log(`   Response: ${providerRes.status} ${providerRes.statusText}`);
    console.log(`   Provider ID: ${providerData.user?.id}`);

    if (providerRes.status === 201) {
        console.log('   ✅ Provider Registered');
    } else {
        console.error('   ❌ Registration Failed', providerData);
        return;
    }

    await delay(2000);

    // 2. Register a New Client
    console.log('\n2️⃣  Registering New Client...');
    const clientEmail = `client_${Date.now()}@test.com`;
    const clientPhone = ADMIN_PHONE; // Use admin phone to receive the SMS for testing

    const clientRes = await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test Client',
            email: clientEmail,
            password: 'password123',
            role: 'client',
            phone_number: clientPhone
        })
    });

    const clientData = await clientRes.json();
    console.log(`   Response: ${clientRes.status} ${clientRes.statusText}`);
    console.log(`   Client ID: ${clientData.user?.id}`);

    if (clientRes.status === 201) {
        console.log('   ✅ Client Registered');
    } else {
        console.error('   ❌ Registration Failed', clientData);
        return;
    }

    await delay(2000);

    // 3. Approve Provider (as Admin)
    console.log('\n3️⃣  Approving Provider...');

    const approveRes = await fetch(`${BASE_URL}/admin/providers/${providerData.user.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminLoginData.token}` },
        body: JSON.stringify({ status: 'active' })
    });

    const approveData = await approveRes.json();
    console.log(`   Response: ${approveRes.status} ${approveRes.statusText}`);

    if (approveRes.status === 200) {
        console.log('   ✅ Provider Approved (Admin & Provider should receive SMS)');
    } else {
        console.error('   ❌ Approval Failed', approveData);
        return;
    }

    await delay(2000);

    // 4. Create Contact Request
    console.log('\n4️⃣  Creating Contact Request...');

    const requestRes = await fetch(`${BASE_URL}/contact-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientData.token}` },
        body: JSON.stringify({
            provider_id: providerData.user.id,
            message: 'I need your services'
        })
    });

    const requestData = await requestRes.json();
    console.log(`   Response: ${requestRes.status} ${requestRes.statusText}`);
    console.log(`   Request ID: ${requestData.id}`);

    if (requestRes.status === 201) {
        console.log('   ✅ Contact Request Created');
    } else {
        console.error('   ❌ Request Failed', requestData);
        return;
    }

    await delay(2000);

    // 5. Approve Contact Request
    console.log('\n5️⃣  Approving Contact Request...');

    const approveRequestRes = await fetch(`${BASE_URL}/contact-requests/${requestData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminLoginData.token}` },
        body: JSON.stringify({ status: 'accepted' })
    });

    const approveRequestData = await approveRequestRes.json();
    console.log(`   Response: ${approveRequestRes.status} ${approveRequestRes.statusText}`);

    if (approveRequestRes.status === 200) {
        console.log('   ✅ Contact Request Approved (Admin, Client & Provider should receive SMS)');
    } else {
        console.error('   ❌ Approval Failed', approveRequestData);
        return;
    }

    console.log('\n🎉 Test Workflow Completed!');
    console.log('Check your phone for multiple SMS notifications.');
}

runTest().catch(console.error);
