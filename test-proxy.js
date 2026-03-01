#!/usr/bin/env node

/**
 * Test script for Cloudflare Worker proxy
 */

const https = require('https');
const http = require('http');

// Load .env file if it exists
try {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
} catch (e) {
  // dotenv not installed, skip
}

const PROXY_URL = process.env.PROXY_URL || 'https://helloworld-proxy.workers.dev';

console.log('🧪 Testing Cloudflare Worker Proxy (Open/No Auth)\n');
console.log(`Proxy URL: ${PROXY_URL}\n`);

const tests = [
  {
    name: 'Basic GET request',
    target: 'https://httpbin.org/get',
    method: 'GET',
  },
  {
    name: 'GET with query parameters',
    target: 'https://httpbin.org/get?foo=bar&test=123',
    method: 'GET',
  },
  {
    name: 'POST request with JSON',
    target: 'https://httpbin.org/post',
    method: 'POST',
    body: JSON.stringify({ test: 'data', timestamp: Date.now() }),
    headers: { 'Content-Type': 'application/json' },
  },
  {
    name: 'Request with custom headers',
    target: 'https://httpbin.org/headers',
    method: 'GET',
    headers: { 'X-Custom-Header': 'test-value' },
  },
  {
    name: 'User-Agent forwarding',
    target: 'https://httpbin.org/user-agent',
    method: 'GET',
    headers: { 'User-Agent': 'helloworld-Test/1.0' },
  },
];

async function makeRequest(test) {
  return new Promise((resolve, reject) => {
    const proxyUrl = new URL(PROXY_URL);
    const isHttps = proxyUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: proxyUrl.hostname,
      port: proxyUrl.port || (isHttps ? 443 : 80),
      path: proxyUrl.pathname || '/',
      method: test.method,
      headers: {
        'X-Proxy-Target': test.target,
        ...test.headers,
      },
    };

    if (test.body) {
      options.headers['Content-Length'] = Buffer.byteLength(test.body);
    }

    const startTime = Date.now();

    const req = client.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          duration,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (test.body) {
      req.write(test.body);
    }

    req.end();
  });
}

async function runTests() {
  console.log('Running tests...\n');

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    process.stdout.write(`  ${test.name}... `);

    try {
      const response = await makeRequest(test);

      if (response.statusCode === 200) {
        console.log(`✅ PASS (${response.duration}ms)`);

        // Show proxy headers
        const proxyHeaders = Object.entries(response.headers)
          .filter(([key]) => key.startsWith('x-proxy'))
          .map(([key, value]) => `    ${key}: ${value}`)
          .join('\n');

        if (proxyHeaders) {
          console.log(proxyHeaders);
        }

        passed++;
      } else {
        console.log(`❌ FAIL (status: ${response.statusCode})`);
        console.log(`    Response: ${response.body.substring(0, 200)}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR`);
      console.log(`    ${error.message}`);
      failed++;
    }

    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (failed > 0) {
    console.log('❌ Some tests failed. Check your configuration:\n');
    console.log('  1. Is the worker deployed?');
    console.log('     npm run deploy');
    console.log('  2. Is the API key correct?');
    console.log('     Check your .env file or wrangler secret');
    console.log('  3. Is the proxy URL correct?');
    console.log(`     Current: ${PROXY_URL}\n`);
    process.exit(1);
  }

  console.log('✅ All tests passed!\n');
  console.log('Your proxy is ready to use with Playwright.');
  console.log('Update your backend/.env with:');
  console.log(`  CLOUDFLARE_PROXY_ENABLED=true`);
  console.log(`  CLOUDFLARE_PROXY_URL=${PROXY_URL}\n`);
}

async function main() {
  if (!PROXY_URL || PROXY_URL === 'https://helloworld-proxy.workers.dev') {
    console.log('⚠️  Warning: Using default proxy URL');
    console.log('Set PROXY_URL in .env file after deployment\n');
  }

  await runTests();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
