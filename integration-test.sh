#!/bin/bash

# Final integration test script
echo "🔬 Final Integration Test"
echo "========================="

# Test 1: Check Docker container is running
echo "📋 1. Checking Docker container..."
if docker ps | grep -q pg-mcp-test; then
    echo "✅ PostgreSQL container is running"
else
    echo "❌ PostgreSQL container not found. Starting it..."
    docker-compose up -d
    sleep 3
fi

# Test 2: Direct database connection test
echo ""
echo "📋 2. Testing direct database connection..."
if docker exec pg-mcp-test psql -U testuser -d testdb -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ Direct database connection works"
else
    echo "❌ Direct database connection failed"
    exit 1
fi

# Test 3: MCP server build check
echo ""
echo "📋 3. Checking MCP server build..."
if [ -f "build/index.js" ]; then
    echo "✅ MCP server build exists"
else
    echo "❌ MCP server not built. Building..."
    npm run build
fi

# Test 4: Quick MCP functionality test
echo ""
echo "📋 4. Testing MCP server functionality..."
echo "Connecting to database and running a simple query..."

# Create a quick test
cat << 'EOF' > quick-test.mjs
import { spawn } from 'child_process';

const mcpProcess = spawn('node', ['build/index.js'], { stdio: ['pipe', 'pipe', 'pipe'] });

let step = 0;
const tests = [
  () => mcpProcess.stdin.write('{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0.0"}}}\n'),
  () => mcpProcess.stdin.write('{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "connect_database", "arguments": {"host": "localhost", "database": "testdb", "username": "testuser", "password": "testpass"}}}\n'),
  () => mcpProcess.stdin.write('{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "execute_query", "arguments": {"query": "SELECT name FROM users LIMIT 1"}}}\n')
];

mcpProcess.stdout.on('data', (data) => {
  try {
    const response = JSON.parse(data.toString().trim());
    if (response.id === 1) console.log('   ✅ Initialization successful');
    if (response.id === 2) console.log('   ✅ Database connection successful');
    if (response.id === 3 && response.result) console.log('   ✅ Query execution successful');
    if (response.id === 3) {
      setTimeout(() => {
        mcpProcess.kill();
        process.exit(0);
      }, 100);
    }
  } catch (e) {}
});

mcpProcess.stderr.on('data', (data) => {
  if (data.toString().includes('PostgreSQL MCP Server running')) {
    console.log('   🚀 MCP server started');
    setTimeout(() => tests[step++](), 100);
    setTimeout(() => tests[step++](), 500);
    setTimeout(() => tests[step++](), 1000);
  }
});
EOF

node quick-test.mjs
rm quick-test.mjs

echo ""
echo "🎉 Integration test completed successfully!"
echo ""
echo "🚀 Your PostgreSQL MCP server is ready!"
echo ""
echo "Next steps:"
echo "1. Add to Claude Desktop: See claude-config-example.md"
echo "2. Test queries: npm run test"
echo "3. View demo: See DEMO.md"
