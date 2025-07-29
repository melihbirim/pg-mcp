# PostgreSQL MCP Server

A Model Context Protocol (MCP) server that enables AI assistants to interact with PostgreSQL databases using natural language queries. This server provides secure, read-only access to database schemas and allows for natural language to SQL translation.

<a href="https://glama.ai/mcp/servers/@melihbirim/pg-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@melihbirim/pg-mcp/badge" alt="PostgreSQL Server MCP server" />
</a>

## Features

- 🔒 **Secure**: Read-only operations only (SELECT, SHOW, DESCRIBE, EXPLAIN, WITH)
- 🗄️ **Schema Inspection**: List tables, describe structures, view relationships
- 🔍 **Query Execution**: Execute SQL queries with safety checks and result limits
- 🌐 **Natural Language**: Enables AI assistants to convert natural language to SQL
- ⚡ **Fast**: Built with TypeScript and the official MCP SDK

## Available Tools

### Database Connection
- `connect_database` - Connect to a PostgreSQL database
- `disconnect_database` - Disconnect from the current database

### Schema Inspection
- `list_tables` - List all tables in the current database
- `describe_table` - Get detailed information about a table's structure
- `get_schema` - Get an overview of the database schema and relationships

### Query Execution
- `execute_query` - Execute read-only SQL queries with safety checks

## Quick Test with Docker

### 1. Start Test Database
```bash
npm run docker:up
```

### 2. Run Tests
```bash
npm run test
```

### 3. Try Manual Testing
```bash
npm run test:manual
```

### 4. Clean Up
```bash
npm run docker:down
```

## Installation

### Prerequisites
- Node.js 16 or higher
- PostgreSQL database access
- Claude for Desktop (for testing with AI assistant)

### Setup

1. **Clone and build**:
   ```bash
   git clone https://github.com/melihbirim/pg-mcp.git
   cd pg-mcp
   npm install
   npm run build
   ```

2. **Configure Claude for Desktop**:
   Edit your Claude configuration file:
   ```bash
   # macOS
   code ~/Library/Application\ Support/Claude/claude_desktop_config.json
   
   # Windows
   code %APPDATA%\\Claude\\claude_desktop_config.json
   ```

3. **Add server configuration**:
   ```json
   {
     "mcpServers": {
       "postgresql": {
         "command": "node",
         "args": ["/ABSOLUTE/PATH/TO/pg-mcp/build/index.js"]
       }
     }
   }
   ```

4. **Restart Claude for Desktop**

## Usage Examples

Once connected to Claude for Desktop, you can use natural language to query your database:

### Connect to Database
"Connect to my PostgreSQL database named 'inventory' on localhost with username 'admin'"

### Schema Exploration
- "What tables are in this database?"
- "Describe the users table structure"
- "Show me the database schema"

### Natural Language Queries
- "How many users are in the system?"
- "Show me all products with price greater than $100"
- "What are the top 5 customers by order count?"
- "Find all orders placed in the last 30 days"

## Security Features

- **Read-only operations**: Only SELECT, SHOW, DESCRIBE, EXPLAIN, and WITH statements allowed
- **Query validation**: Automatic checking for dangerous operations
- **Result limits**: Automatic LIMIT clauses added to prevent large result sets
- **Error handling**: Secure error messages without exposing sensitive information

## Development

### Project Structure
```
pg-mcp/
├── src/
│   └── index.ts          # Main MCP server implementation
├── build/                # Compiled JavaScript output
├── .github/
│   └── copilot-instructions.md
├── .vscode/
│   └── mcp.json          # VS Code MCP configuration
├── package.json
├── tsconfig.json
└── README.md
```

### Building
```bash
npm run build
```

### Running Locally
```bash
npm run dev
```

### Testing
The server communicates via stdio, so you can test it by running:
```bash
echo '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0.0"}}}' | node build/index.js
```

## Environment Variables

You can optionally set these environment variables:
- `PG_HOST` - PostgreSQL host (default: localhost)
- `PG_PORT` - PostgreSQL port (default: 5432)
- `PG_DATABASE` - Default database name
- `PG_USER` - Default username
- `PG_PASSWORD` - Default password

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License

## Troubleshooting

### Claude for Desktop Issues
- Check Claude's logs: `~/Library/Logs/Claude/mcp*.log`
- Ensure absolute paths in configuration
- Restart Claude for Desktop after config changes

### Database Connection Issues
- Verify PostgreSQL is running
- Check connection credentials
- Ensure network access to database host

### Permission Issues
```bash
chmod +x build/index.js
```