#!/usr/bin/env node

// Simple manual test to see detailed output from our MCP server

import { spawn } from 'child_process';

const mcpProcess = spawn('node', ['./build/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Initialize the server
const initRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "manual-test", version: "1.0.0" }
  }
};

mcpProcess.stdout.on('data', (data) => {
  const response = data.toString().trim();
  console.log('📦 Server Response:', response);
  console.log('');
});

mcpProcess.stderr.on('data', (data) => {
  console.log('📜 Server Log:', data.toString().trim());
});

mcpProcess.on('close', (code) => {
  console.log(`\n🏁 Process exited with code ${code}`);
});

// Send initialization request
console.log('🚀 Sending initialization request...');
mcpProcess.stdin.write(JSON.stringify(initRequest) + '\n');

// Send connection request after 1 second
setTimeout(() => {
  const connectRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "connect_database",
      arguments: {
        host: "localhost",
        port: 5432,
        database: "testdb",
        username: "testuser",
        password: "testpass"
      }
    }
  };
  
  console.log('🔌 Sending connect request...');
  mcpProcess.stdin.write(JSON.stringify(connectRequest) + '\n');
}, 1000);

// Send query request after 2 seconds
setTimeout(() => {
  const queryRequest = {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "execute_query",
      arguments: {
        query: "SELECT name, email, age FROM users WHERE age > 30 ORDER BY age DESC",
        limit: 3
      }
    }
  };
  
  console.log('📊 Sending query request...');
  mcpProcess.stdin.write(JSON.stringify(queryRequest) + '\n');
}, 2000);

// Clean exit after 4 seconds
setTimeout(() => {
  console.log('🛑 Stopping server...');
  mcpProcess.kill();
  process.exit(0);
}, 4000);

process.on('SIGINT', () => {
  mcpProcess.kill();
  process.exit(0);
});
