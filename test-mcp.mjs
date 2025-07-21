#!/usr/bin/env node

// Test script for the PostgreSQL MCP Server
// This script tests all MCP tools against the Docker PostgreSQL instance

import { spawn } from 'child_process';
import { promises as fs } from 'fs';

const MCP_SERVER_PATH = './build/index.js';

// Test cases for our MCP server
const testCases = [
  {
    name: "Initialize MCP Server",
    request: {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0.0" }
      }
    }
  },
  {
    name: "List Tools",
    request: {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {}
    }
  },
  {
    name: "Connect to Database",
    request: {
      jsonrpc: "2.0",
      id: 3,
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
    }
  },
  {
    name: "List Tables",
    request: {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "list_tables",
        arguments: {}
      }
    }
  },
  {
    name: "Describe Users Table",
    request: {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: "describe_table",
        arguments: {
          tableName: "users"
        }
      }
    }
  },
  {
    name: "Get Database Schema",
    request: {
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: {
        name: "get_schema",
        arguments: {}
      }
    }
  },
  {
    name: "Query Users",
    request: {
      jsonrpc: "2.0",
      id: 7,
      method: "tools/call",
      params: {
        name: "execute_query",
        arguments: {
          query: "SELECT name, email, age FROM users ORDER BY age DESC",
          limit: 10
        }
      }
    }
  },
  {
    name: "Query Order Summary",
    request: {
      jsonrpc: "2.0",
      id: 8,
      method: "tools/call",
      params: {
        name: "execute_query",
        arguments: {
          query: "SELECT customer_name, total_amount, status FROM order_summary",
          limit: 5
        }
      }
    }
  },
  {
    name: "Complex Query - Top Products",
    request: {
      jsonrpc: "2.0",
      id: 9,
      method: "tools/call",
      params: {
        name: "execute_query",
        arguments: {
          query: `
            SELECT 
              p.name as product_name,
              c.name as category,
              p.price,
              COUNT(oi.id) as times_ordered,
              SUM(oi.quantity) as total_quantity_sold
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN order_items oi ON p.id = oi.product_id
            GROUP BY p.id, p.name, c.name, p.price
            ORDER BY times_ordered DESC, total_quantity_sold DESC
          `,
          limit: 5
        }
      }
    }
  },
  {
    name: "Disconnect from Database",
    request: {
      jsonrpc: "2.0",
      id: 10,
      method: "tools/call",
      params: {
        name: "disconnect_database",
        arguments: {}
      }
    }
  }
];

async function runTest() {
  console.log('🧪 Testing PostgreSQL MCP Server with Docker PostgreSQL\n');

  // Start MCP server
  const mcpProcess = spawn('node', [MCP_SERVER_PATH], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let testIndex = 0;
  let responseBuffer = '';

  // Handle server responses
  mcpProcess.stdout.on('data', (data) => {
    responseBuffer += data.toString();
    
    // Process complete JSON responses
    const lines = responseBuffer.split('\n');
    responseBuffer = lines.pop() || ''; // Keep incomplete line
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const response = JSON.parse(line);
          console.log(`✅ ${testCases[testIndex - 1]?.name || 'Response'}:`);
          
          if (response.error) {
            console.log(`   ❌ Error: ${response.error.message}`);
          } else if (response.result) {
            // Format the result nicely
            if (response.result.content) {
              response.result.content.forEach(content => {
                if (content.type === 'text') {
                  console.log(`   📄 ${content.text.split('\n')[0]}...`);
                }
              });
            } else if (response.result.tools) {
              console.log(`   🔧 Found ${response.result.tools.length} tools`);
            } else {
              console.log(`   ✨ ${JSON.stringify(response.result).slice(0, 100)}...`);
            }
          }
          console.log('');
        } catch (e) {
          // Ignore non-JSON output (like stderr logs)
        }
      }
    }
  });

  // Handle server errors
  mcpProcess.stderr.on('data', (data) => {
    const message = data.toString();
    if (message.includes('PostgreSQL MCP Server running')) {
      console.log('🚀 MCP Server started successfully\n');
      runNextTest();
    } else if (!message.includes('shutting down gracefully')) {
      console.log(`🔍 Server log: ${message.trim()}`);
    }
  });

  function runNextTest() {
    if (testIndex < testCases.length) {
      const testCase = testCases[testIndex];
      console.log(`🔄 Running: ${testCase.name}`);
      
      mcpProcess.stdin.write(JSON.stringify(testCase.request) + '\n');
      testIndex++;
      
      // Auto-advance to next test after a delay
      setTimeout(() => {
        if (testIndex < testCases.length) {
          runNextTest();
        } else {
          // All tests done
          setTimeout(() => {
            console.log('🎉 All tests completed!');
            mcpProcess.kill();
            process.exit(0);
          }, 1000);
        }
      }, 1500);
    }
  }

  // Handle process exit
  mcpProcess.on('close', (code) => {
    console.log(`\n🏁 MCP Server exited with code ${code}`);
  });

  // Handle script termination
  process.on('SIGINT', () => {
    console.log('\n⏹️  Test interrupted');
    mcpProcess.kill();
    process.exit(0);
  });
}

// Check if MCP server build exists
try {
  await fs.access(MCP_SERVER_PATH);
  runTest();
} catch (error) {
  console.error('❌ MCP server build not found. Run "npm run build" first.');
  process.exit(1);
}
