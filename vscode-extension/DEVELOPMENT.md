# VS Code Extension Development Guide

This guide will help you develop and test the PostgreSQL MCP VS Code extension.

## Setup for Development

1. **Prerequisites**
   - VS Code 1.74.0 or higher
   - Node.js 18.x or higher
   - PostgreSQL database (local or remote)

2. **Install Dependencies**
   ```bash
   cd vscode-extension
   npm install
   ```

3. **Compile the Extension**
   ```bash
   npm run compile
   ```

## Testing the Extension

### Method 1: Using F5 (Recommended)

1. Open the `vscode-extension` folder in VS Code
2. Press `F5` to launch a new Extension Development Host window
3. In the new window, test the extension commands

### Method 2: Using Build Script

```bash
./build-extension.sh
```

Then follow the instructions to launch the Extension Development Host.

## Extension Features

### Database Connection
- Connect to PostgreSQL databases with an intuitive UI
- Support for SSL connections
- Connection status in the status bar

### Database Explorer
- Tree view showing tables and columns
- Expandable table structure
- Visual icons for different database objects

### Natural Language Queries
- Basic natural language to SQL conversion
- Safe read-only query execution
- Results displayed in formatted markdown

### Schema Inspection
- View complete database schema
- List all tables with details
- Describe individual tables with column information

## Commands Available

| Command | Description | When Available |
|---------|-------------|----------------|
| `postgresql-mcp.connect` | Connect to PostgreSQL Database | Always |
| `postgresql-mcp.disconnect` | Disconnect from Database | When connected |
| `postgresql-mcp.query` | Execute Natural Language Query | When connected |
| `postgresql-mcp.showSchema` | Show Database Schema | When connected |
| `postgresql-mcp.listTables` | List Tables | When connected |
| `postgresql-mcp.describeTable` | Describe Table | When connected |

## Extension Configuration

Users can configure default settings in their VS Code settings:

```json
{
  "postgresql-mcp.defaultHost": "localhost",
  "postgresql-mcp.defaultPort": 5432,
  "postgresql-mcp.defaultDatabase": "postgres",
  "postgresql-mcp.enableSsl": false
}
```

## File Structure

```
vscode-extension/
├── .vscode/                 # VS Code configuration
│   ├── launch.json         # Debug configuration
│   └── tasks.json          # Build tasks
├── src/
│   └── extension.ts        # Main extension code
├── out/                    # Compiled JavaScript (auto-generated)
├── package.json           # Extension manifest
├── tsconfig.json          # TypeScript configuration
├── .eslintrc.json         # ESLint configuration
├── .vscodeignore          # Files to exclude from package
└── README.md              # Extension documentation
```

## Key Implementation Details

### Security
- Only read-only SQL operations are allowed
- Query validation prevents dangerous operations
- Passwords are handled securely

### Tree Data Provider
- Implements `vscode.TreeDataProvider` for database explorer
- Lazy loading of table columns
- Refresh functionality when connection changes

### Status Bar Integration
- Shows connection status
- Click to connect/disconnect
- Visual feedback for connection state

### Error Handling
- Comprehensive error messages
- Graceful degradation when database is unavailable
- User-friendly error notifications

## Development Tips

1. **Hot Reloading**: Use `npm run watch` for automatic compilation during development
2. **Debugging**: Set breakpoints in TypeScript and debug in the Extension Development Host
3. **Logging**: Use `console.log()` for debugging - output appears in the Extension Host's Developer Console
4. **Testing**: Test with different PostgreSQL versions and configurations

## Common Issues

### Extension Won't Load
- Ensure all dependencies are installed: `npm install`
- Check compilation succeeded: `npm run compile`
- Verify VS Code version compatibility

### Database Connection Fails
- Check PostgreSQL server is running
- Verify connection credentials
- Ensure network connectivity
- Check SSL requirements

### Natural Language Queries Don't Work
- Current implementation is basic and supports limited queries
- Consider integrating with AI services for better NL to SQL conversion
- Extend the `convertNaturalLanguageToSQL` function

## Future Enhancements

- [ ] Better natural language to SQL conversion using AI services
- [ ] Query history and favorites
- [ ] Export query results to CSV/JSON
- [ ] Visual query builder
- [ ] Multiple database connections
- [ ] Syntax highlighting for generated SQL
- [ ] Query performance metrics
- [ ] Database schema diff tools

## Contributing

1. Fork the repository
2. Make changes in the `vscode-extension` directory
3. Test thoroughly using the Extension Development Host
4. Submit a pull request with clear description of changes

## Publishing

To package the extension for distribution:

```bash
npm run package
```

This creates a `.vsix` file that can be installed in VS Code or published to the marketplace.
