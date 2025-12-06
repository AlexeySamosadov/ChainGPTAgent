const BASE_URL = 'http://localhost:3000';

async function testEndpoint(name, fn) {
    console.log(`\n🧪 Testing: ${name}...`);
    try {
        await fn();
        console.log(`✅ ${name} Passed`);
    } catch (error) {
        console.error(`❌ ${name} Failed:`, error.message);
        if (error.cause) console.error('   Response:', error.cause);
    }
}

async function post(path, body) {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}`, { cause: text });
    }
    return res.json();
}

async function runTests() {
    console.log('🚀 Starting API Verification...');

    // 1. General Chat
    await testEndpoint('General Chat', async () => {
        const data = await post('/api/agent', { message: 'Hello, are you online?' });
        console.log('   Response:', data.message);
        if (!data.message) throw new Error('No message returned');
    });

    // 2. Portfolio Check
    await testEndpoint('Portfolio Guardian', async () => {
        const data = await post('/api/agent', { message: 'Check my portfolio risk' });
        console.log('   Risk Score:', data.currentStep?.result?.riskScore);
        console.log('   Message:', data.message);

        if (!data.plan) throw new Error('No plan returned');
        const step = data.plan.steps.find(s => s.type === 'portfolio_check');
        if (!step) throw new Error('Portfolio check step not found in plan');
    });

    // 3. Multi-Step Planner (Create Token)
    await testEndpoint('Planner: Create Token', async () => {
        const data = await post('/api/agent', { message: 'Create a token named MEME and deploy it' });
        console.log('   Plan Steps:', data.plan.steps.map(s => s.type).join(' -> '));

        if (data.plan.steps[0].type !== 'generate_contract') throw new Error('First step is not generate_contract');
        if (data.plan.steps[1].type !== 'audit_contract') throw new Error('Second step is not audit_contract');
    });

    console.log('\n✨ All Tests Completed.');
}

runTests().catch(console.error);
