import * as vscode from 'vscode';
import { Client } from 'pg';
import { z } from 'zod';

// Database configuration schema
const DatabaseConfigSchema = z.object({
  host: z.string().default("localhost"),
  port: z.number().default(5432),
  database: z.string(),
  username: z.string(),
  password: z.string().optional(),
  ssl: z.boolean().default(false),
});

type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

// Global state
let dbClient: Client | null = null;
let connectionStatus: vscode.StatusBarItem;
let currentConnection: DatabaseConfig | null = null;

// Tree data provider for database explorer
class PostgreSQLTreeDataProvider implements vscode.TreeDataProvider<DatabaseItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<DatabaseItem | undefined | null | void> = new vscode.EventEmitter<DatabaseItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<DatabaseItem | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: DatabaseItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: DatabaseItem): Promise<DatabaseItem[]> {
    if (!dbClient) {
      return [];
    }

    if (!element) {
      // Root level - show tables
      try {
        const query = `
          SELECT table_name, table_type 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name;
        `;
        const result = await dbClient.query(query);
        
        return result.rows.map(row => new DatabaseItem(
          row.table_name,
          row.table_type === 'BASE TABLE' ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
          'table',
          row.table_type
        ));
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to load tables: ${error}`);
        return [];
      }
    } else if (element.contextValue === 'table') {
      // Show columns for the table
      try {
        const query = `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position;
        `;
        const result = await dbClient.query(query, [element.label]);
        
        return result.rows.map(row => new DatabaseItem(
          `${row.column_name}: ${row.data_type}${row.is_nullable === 'NO' ? ' NOT NULL' : ''}`,
          vscode.TreeItemCollapsibleState.None,
          'column',
          row.data_type
        ));
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to load columns: ${error}`);
        return [];
      }
    }

    return [];
  }
}

class DatabaseItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string,
    public readonly description?: string
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label}-${this.description}`;
    this.description = description;
    
    // Set icons based on context
    if (contextValue === 'table') {
      this.iconPath = new vscode.ThemeIcon('table');
    } else if (contextValue === 'column') {
      this.iconPath = new vscode.ThemeIcon('symbol-field');
    }
  }
}

// Helper function to safely execute queries
async function executeQuery(query: string, params: any[] = []): Promise<any[]> {
  if (!dbClient) {
    throw new Error("Database not connected. Please connect to a database first.");
  }
  
  // Basic safety checks for read-only operations
  const normalizedQuery = query.trim().toLowerCase();
  const readOnlyPrefixes = ['select', 'show', 'describe', 'explain', 'with'];
  const isReadOnly = readOnlyPrefixes.some(prefix => normalizedQuery.startsWith(prefix));
  
  if (!isReadOnly) {
    throw new Error("Only read-only queries (SELECT, SHOW, DESCRIBE, EXPLAIN, WITH) are allowed for security.");
  }
  
  try {
    const result = await dbClient.query(query, params);
    return result.rows;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Query execution failed: ${errorMessage}`);
  }
}

// Connect to database command
async function connectToDatabase() {
  try {
    const config = vscode.workspace.getConfiguration('postgresql-mcp');
    
    // Get connection details from user
    const host = await vscode.window.showInputBox({
      prompt: 'Database Host',
      value: config.get('defaultHost', 'localhost'),
      placeHolder: 'localhost'
    });
    if (!host) return;

    const portStr = await vscode.window.showInputBox({
      prompt: 'Database Port',
      value: config.get('defaultPort', 5432).toString(),
      placeHolder: '5432'
    });
    if (!portStr) return;
    const port = parseInt(portStr);

    const database = await vscode.window.showInputBox({
      prompt: 'Database Name',
      value: config.get('defaultDatabase', 'postgres'),
      placeHolder: 'postgres'
    });
    if (!database) return;

    const username = await vscode.window.showInputBox({
      prompt: 'Username',
      placeHolder: 'postgres'
    });
    if (!username) return;

    const password = await vscode.window.showInputBox({
      prompt: 'Password',
      password: true,
      placeHolder: 'Enter password (optional)'
    });

    const sslOptions = ['Yes', 'No'];
    const sslChoice = await vscode.window.showQuickPick(sslOptions, {
      placeHolder: 'Use SSL connection?'
    });
    const ssl = sslChoice === 'Yes';

    // Close existing connection if any
    if (dbClient) {
      await dbClient.end();
    }

    // Create new connection
    dbClient = new Client({
      host,
      port,
      database,
      user: username,
      password: password || undefined,
      ssl
    });

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Connecting to PostgreSQL...",
      cancellable: false
    }, async () => {
      await dbClient!.connect();
    });

    currentConnection = { host, port, database, username, password, ssl };
    
    // Update UI
    connectionStatus.text = `$(database) Connected: ${database}@${host}`;
    connectionStatus.show();
    
    // Set context for when clauses
    vscode.commands.executeCommand('setContext', 'postgresql-mcp:connected', true);
    
    // Refresh tree view
    treeDataProvider.refresh();
    
    vscode.window.showInformationMessage(`Successfully connected to PostgreSQL database '${database}' on ${host}:${port}`);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown connection error";
    vscode.window.showErrorMessage(`Failed to connect to database: ${errorMessage}`);
  }
}

// Disconnect from database command
async function disconnectFromDatabase() {
  try {
    if (dbClient) {
      await dbClient.end();
      dbClient = null;
    }
    
    currentConnection = null;
    connectionStatus.text = `$(database) Disconnected`;
    connectionStatus.hide();
    
    // Set context for when clauses
    vscode.commands.executeCommand('setContext', 'postgresql-mcp:connected', false);
    
    // Refresh tree view
    treeDataProvider.refresh();
    
    vscode.window.showInformationMessage('Disconnected from PostgreSQL database');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown disconnection error";
    vscode.window.showErrorMessage(`Failed to disconnect: ${errorMessage}`);
  }
}

// Execute natural language query command
async function executeNaturalLanguageQuery() {
  if (!dbClient) {
    vscode.window.showErrorMessage('Please connect to a database first');
    return;
  }

  const naturalQuery = await vscode.window.showInputBox({
    prompt: 'Enter your natural language query',
    placeHolder: 'e.g., "Show me all users who placed orders in the last month"'
  });

  if (!naturalQuery) return;

  try {
    // This is a simplified example. In a real implementation, you'd use an AI service
    // to convert natural language to SQL
    const sqlQuery = await convertNaturalLanguageToSQL(naturalQuery);
    
    if (!sqlQuery) {
      vscode.window.showWarningMessage('Could not convert natural language to SQL query');
      return;
    }

    const results = await executeQuery(sqlQuery);
    
    // Show results in a new document
    await showQueryResults(naturalQuery, sqlQuery, results);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    vscode.window.showErrorMessage(`Query failed: ${errorMessage}`);
  }
}

// Simple natural language to SQL conversion (placeholder)
async function convertNaturalLanguageToSQL(naturalQuery: string): Promise<string | null> {
  // This is a very basic example. In practice, you'd integrate with an AI service
  const lowerQuery = naturalQuery.toLowerCase();
  
  if (lowerQuery.includes('show') && lowerQuery.includes('users')) {
    return 'SELECT * FROM users LIMIT 10;';
  }
  
  if (lowerQuery.includes('show') && lowerQuery.includes('tables')) {
    return `SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`;
  }
  
  if (lowerQuery.includes('count') && lowerQuery.includes('users')) {
    return 'SELECT COUNT(*) as user_count FROM users;';
  }
  
  // For demo purposes, return a basic query
  return 'SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' LIMIT 5;';
}

// Show database schema command
async function showDatabaseSchema() {
  if (!dbClient) {
    vscode.window.showErrorMessage('Please connect to a database first');
    return;
  }

  try {
    const query = `
      SELECT 
        t.table_name,
        t.table_type,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE t.table_schema = 'public'
      ORDER BY t.table_name, c.ordinal_position;
    `;
    
    const results = await executeQuery(query);
    await showQueryResults('Database Schema', query, results);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    vscode.window.showErrorMessage(`Failed to get schema: ${errorMessage}`);
  }
}

// List tables command
async function listTables() {
  if (!dbClient) {
    vscode.window.showErrorMessage('Please connect to a database first');
    return;
  }

  try {
    const query = `
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    const results = await executeQuery(query);
    await showQueryResults('Database Tables', query, results);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    vscode.window.showErrorMessage(`Failed to list tables: ${errorMessage}`);
  }
}

// Describe table command
async function describeTable() {
  if (!dbClient) {
    vscode.window.showErrorMessage('Please connect to a database first');
    return;
  }

  // Get list of tables first
  try {
    const tablesQuery = `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`;
    const tablesResult = await executeQuery(tablesQuery);
    
    if (tablesResult.length === 0) {
      vscode.window.showInformationMessage('No tables found in the database');
      return;
    }
    
    const tableNames = tablesResult.map(row => row.table_name);
    const selectedTable = await vscode.window.showQuickPick(tableNames, {
      placeHolder: 'Select a table to describe'
    });
    
    if (!selectedTable) return;
    
    const query = `
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns 
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    
    const results = await executeQuery(query, [selectedTable]);
    await showQueryResults(`Table Description: ${selectedTable}`, query, results);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    vscode.window.showErrorMessage(`Failed to describe table: ${errorMessage}`);
  }
}

// Show query results in a new document
async function showQueryResults(title: string, query: string, results: any[]) {
  const doc = await vscode.workspace.openTextDocument({
    content: formatQueryResults(title, query, results),
    language: 'markdown'
  });
  
  await vscode.window.showTextDocument(doc);
}

// Format query results for display
function formatQueryResults(title: string, query: string, results: any[]): string {
  let content = `# ${title}\n\n`;
  content += `## SQL Query\n\`\`\`sql\n${query}\n\`\`\`\n\n`;
  content += `## Results (${results.length} rows)\n\n`;
  
  if (results.length === 0) {
    content += '*No results found*\n';
    return content;
  }
  
  // Create markdown table
  const columns = Object.keys(results[0]);
  content += `| ${columns.join(' | ')} |\n`;
  content += `| ${columns.map(() => '---').join(' | ')} |\n`;
  
  results.forEach(row => {
    const values = columns.map(col => {
      const value = row[col];
      return value !== null && value !== undefined ? String(value) : 'NULL';
    });
    content += `| ${values.join(' | ')} |\n`;
  });
  
  return content;
}

// Tree data provider instance
let treeDataProvider: PostgreSQLTreeDataProvider;

export function activate(context: vscode.ExtensionContext) {
  console.log('PostgreSQL MCP extension is now active!');

  // Initialize tree data provider
  treeDataProvider = new PostgreSQLTreeDataProvider();
  vscode.window.registerTreeDataProvider('postgresql-mcp-explorer', treeDataProvider);

  // Create status bar item
  connectionStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  connectionStatus.text = `$(database) Disconnected`;
  connectionStatus.command = 'postgresql-mcp.connect';
  context.subscriptions.push(connectionStatus);

  // Register commands
  const commands = [
    vscode.commands.registerCommand('postgresql-mcp.connect', connectToDatabase),
    vscode.commands.registerCommand('postgresql-mcp.disconnect', disconnectFromDatabase),
    vscode.commands.registerCommand('postgresql-mcp.query', executeNaturalLanguageQuery),
    vscode.commands.registerCommand('postgresql-mcp.showSchema', showDatabaseSchema),
    vscode.commands.registerCommand('postgresql-mcp.listTables', listTables),
    vscode.commands.registerCommand('postgresql-mcp.describeTable', describeTable),
  ];

  context.subscriptions.push(...commands);

  // Set initial context
  vscode.commands.executeCommand('setContext', 'postgresql-mcp:connected', false);
}

export function deactivate() {
  if (dbClient) {
    dbClient.end().catch(console.error);
  }
}
