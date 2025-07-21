# PostgreSQL MCP - VS Code Extension

A Visual Studio Code extension that provides PostgreSQL database connectivity with natural language query capabilities using the Model Context Protocol (MCP).

## Features

- 🔌 **Easy Database Connection**: Connect to PostgreSQL databases with a simple UI
- 🌳 **Database Explorer**: Browse tables and columns in a tree view
- 🗣️ **Natural Language Queries**: Execute database queries using natural language (basic implementation)
- 🔍 **Schema Inspection**: View database schema and table structures
- 🛡️ **Read-Only Safety**: Only allows safe, read-only operations
- 📊 **Results Viewer**: View query results in formatted markdown tables

## Installation

1. Install the extension from the VS Code marketplace (when published)
2. Or install from VSIX:
   ```bash
   code --install-extension postgresql-mcp-1.0.0.vsix
   ```

## Usage

### Connecting to a Database

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run the command "PostgreSQL MCP: Connect to PostgreSQL Database"
3. Enter your database connection details:
   - Host (default: localhost)
   - Port (default: 5432)
   - Database name
   - Username
   - Password (optional)
   - SSL (Yes/No)

### Using the Database Explorer

1. After connecting, open the "PostgreSQL MCP" view in the Explorer panel
2. Browse tables and expand them to see columns
3. Use the toolbar buttons for quick actions

### Natural Language Queries

1. Connect to a database
2. Use the command "PostgreSQL MCP: Execute Natural Language Query"
3. Enter your query in plain English, for example:
   - "Show me all users"
   - "Count the number of orders"
   - "Show all tables"

### Available Commands

- `PostgreSQL MCP: Connect to PostgreSQL Database` - Connect to a database
- `PostgreSQL MCP: Disconnect from Database` - Disconnect from the current database
- `PostgreSQL MCP: Execute Natural Language Query` - Run a natural language query
- `PostgreSQL MCP: Show Database Schema` - Display the complete database schema
- `PostgreSQL MCP: List Tables` - Show all tables in the database
- `PostgreSQL MCP: Describe Table` - Show detailed information about a specific table

## Configuration

You can configure default connection settings in VS Code settings:

```json
{
  "postgresql-mcp.defaultHost": "localhost",
  "postgresql-mcp.defaultPort": 5432,
  "postgresql-mcp.defaultDatabase": "postgres",
  "postgresql-mcp.enableSsl": false
}
```

## Security

This extension prioritizes security:

- **Read-only operations**: Only SELECT, SHOW, DESCRIBE, EXPLAIN, and WITH statements are allowed
- **No data modification**: INSERT, UPDATE, DELETE operations are blocked
- **Password protection**: Passwords are handled securely and not stored

## Development

To develop this extension:

1. Clone the repository
2. Navigate to the `vscode-extension` folder
3. Install dependencies: `npm install`
4. Open in VS Code and press `F5` to launch a new Extension Development Host
5. Test the extension in the new VS Code window

### Building

```bash
npm run compile
```

### Packaging

```bash
npm run package
```

## Requirements

- VS Code 1.74.0 or higher
- PostgreSQL database (local or remote)
- Node.js (for development)

## Known Issues

- Natural language to SQL conversion is currently basic and supports limited queries
- Some complex SQL queries may not be supported
- Error handling could be improved for edge cases

## Contributing

Contributions are welcome! Please see the main repository for contribution guidelines.

## License

ISC License - see the main repository for details.

## Related Projects

This extension is part of the PostgreSQL MCP project:
- [Main MCP Server](../README.md) - Standalone MCP server
- [Docker Test Environment](../docker-compose.yml) - Local testing setup
