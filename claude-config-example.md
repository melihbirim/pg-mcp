# Example Claude Desktop Configuration

Copy this configuration to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "postgresql": {
      "command": "node",
      "args": ["/Users/melihbirim/code/pg-mcp/build/index.js"]
    }
  }
}
```

**Important**: Replace `/Users/melihbirim/code/pg-mcp/build/index.js` with the absolute path to your built server.

## Quick Start with Docker Test Database

If you want to test immediately with the included Docker PostgreSQL setup:

1. **Start the test database**:
   ```bash
   npm run docker:up
   ```

2. **Configure Claude Desktop** with the config above

3. **Test the connection** in Claude Desktop:
   ```
   Connect to my PostgreSQL database called "testdb" on localhost with username "testuser" and password "testpass"
   ```

## Usage Examples

After configuring Claude Desktop, you can use natural language queries like:

1. **Connect to your database**:
   ```
   Connect to my PostgreSQL database called "testdb" on localhost with username "testuser" and password "testpass"
   ```

2. **Explore schema**:
   ```
   What tables are available in this database?
   ```
   ```
   Describe the structure of the users table
   ```

3. **Query data**:
   ```
   Show me all users from the users table
   ```
   ```
   How many orders were placed in total?
   ```
   ```
   What are the most expensive products?
   ```
   ```
   Who is our best customer by total order value?
   ```

## Security Note

This MCP server only allows read-only operations (SELECT, SHOW, DESCRIBE, EXPLAIN, WITH) for security. It will reject any INSERT, UPDATE, DELETE, or other modifying operations.
