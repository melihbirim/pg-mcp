#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Client } from "pg";

// Configuration schema
const DatabaseConfigSchema = z.object({
  host: z.string().default("localhost"),
  port: z.number().default(5432),
  database: z.string(),
  username: z.string(),
  password: z.string().optional(),
  ssl: z.boolean().default(false),
  readOnly: z.boolean().default(true),
});

type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

// Create server instance
const server = new McpServer({
  name: "postgresql-mcp",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Database connection
let dbClient: Client | null = null;

// Helper function to get database connection
async function getDbConnection(): Promise<Client> {
  if (!dbClient) {
    throw new Error("Database not connected. Use connect_database tool first.");
  }
  return dbClient;
}

// Helper function to safely execute queries
async function executeQuery(query: string, params: any[] = []): Promise<any[]> {
  const client = await getDbConnection();
  
  // Basic safety checks for read-only operations
  const normalizedQuery = query.trim().toLowerCase();
  const readOnlyPrefixes = ['select', 'show', 'describe', 'explain', 'with'];
  const isReadOnly = readOnlyPrefixes.some(prefix => normalizedQuery.startsWith(prefix));
  
  if (!isReadOnly) {
    throw new Error("Only read-only queries (SELECT, SHOW, DESCRIBE, EXPLAIN, WITH) are allowed for security.");
  }
  
  try {
    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Query execution failed: ${errorMessage}`);
  }
}

// Tool: Connect to database
server.tool(
  "connect_database",
  "Connect to a PostgreSQL database",
  {
    host: z.string().describe("Database host (default: localhost)").optional(),
    port: z.number().describe("Database port (default: 5432)").optional(),
    database: z.string().describe("Database name"),
    username: z.string().describe("Database username"),
    password: z.string().describe("Database password").optional(),
    ssl: z.boolean().describe("Use SSL connection (default: false)").optional(),
  },
  async ({ host, port, database, username, password, ssl }) => {
    try {
      // Close existing connection if any
      if (dbClient) {
        await dbClient.end();
      }

      // Create new connection
      dbClient = new Client({
        host: host || "localhost",
        port: port || 5432,
        database,
        user: username,
        password,
        ssl: ssl || false,
      });

      await dbClient.connect();

      return {
        content: [
          {
            type: "text",
            text: `Successfully connected to PostgreSQL database '${database}' on ${host || "localhost"}:${port || 5432}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown connection error";
      return {
        content: [
          {
            type: "text",
            text: `Failed to connect to database: ${errorMessage}`,
          },
        ],
      };
    }
  }
);

// Tool: List all tables
server.tool(
  "list_tables",
  "List all tables in the current database",
  {},
  async () => {
    try {
      const query = `
        SELECT table_name, table_type 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `;
      
      const tables = await executeQuery(query);
      
      if (tables.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No tables found in the public schema.",
            },
          ],
        };
      }

      const tableList = tables
        .map(table => `- ${table.table_name} (${table.table_type})`)
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `Tables in database:\n${tableList}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text",
            text: `Error listing tables: ${errorMessage}`,
          },
        ],
      };
    }
  }
);

// Tool: Describe table structure
server.tool(
  "describe_table",
  "Get detailed information about a table's structure, columns, and constraints",
  {
    tableName: z.string().describe("Name of the table to describe"),
  },
  async ({ tableName }) => {
    try {
      // Get column information
      const columnsQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `;
      
      const columns = await executeQuery(columnsQuery, [tableName]);
      
      if (columns.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `Table '${tableName}' not found or has no columns.`,
            },
          ],
        };
      }

      // Get primary key information
      const pkQuery = `
        SELECT column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema = 'public' 
          AND tc.table_name = $1 
          AND tc.constraint_type = 'PRIMARY KEY'
        ORDER BY kcu.ordinal_position;
      `;
      
      const primaryKeys = await executeQuery(pkQuery, [tableName]);

      // Get foreign key information
      const fkQuery = `
        SELECT 
          kcu.column_name,
          ccu.table_name AS referenced_table,
          ccu.column_name AS referenced_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_schema = 'public' 
          AND tc.table_name = $1 
          AND tc.constraint_type = 'FOREIGN KEY';
      `;
      
      const foreignKeys = await executeQuery(fkQuery, [tableName]);

      // Format response
      let response = `Table: ${tableName}\n\nColumns:\n`;
      
      columns.forEach(col => {
        const isPk = primaryKeys.some(pk => pk.column_name === col.column_name);
        const fk = foreignKeys.find(fk => fk.column_name === col.column_name);
        
        response += `- ${col.column_name}: ${col.data_type}`;
        
        if (col.character_maximum_length) {
          response += `(${col.character_maximum_length})`;
        } else if (col.numeric_precision) {
          response += `(${col.numeric_precision}${col.numeric_scale ? `,${col.numeric_scale}` : ''})`;
        }
        
        response += ` ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`;
        
        if (col.column_default) {
          response += ` DEFAULT ${col.column_default}`;
        }
        
        if (isPk) {
          response += ' [PRIMARY KEY]';
        }
        
        if (fk) {
          response += ` [FK -> ${fk.referenced_table}.${fk.referenced_column}]`;
        }
        
        response += '\n';
      });

      return {
        content: [
          {
            type: "text",
            text: response,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text",
            text: `Error describing table '${tableName}': ${errorMessage}`,
          },
        ],
      };
    }
  }
);

// Tool: Execute SQL query
server.tool(
  "execute_query",
  "Execute a read-only SQL query (SELECT, SHOW, DESCRIBE, EXPLAIN, WITH statements only)",
  {
    query: z.string().describe("SQL query to execute (read-only operations only)"),
    limit: z.number().describe("Maximum number of rows to return (default: 100)").optional(),
  },
  async ({ query, limit }) => {
    try {
      const maxLimit = limit || 100;
      
      // Add LIMIT clause if not present and it's a SELECT query
      let finalQuery = query.trim();
      const normalizedQuery = finalQuery.toLowerCase();
      
      if (normalizedQuery.startsWith('select') && !normalizedQuery.includes('limit')) {
        finalQuery += ` LIMIT ${maxLimit}`;
      }
      
      const rows = await executeQuery(finalQuery);
      
      if (rows.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "Query executed successfully. No rows returned.",
            },
          ],
        };
      }

      // Format results as a table
      const headers = Object.keys(rows[0]);
      let result = `Query Results (${rows.length} rows):\n\n`;
      
      // Add headers
      result += headers.join(' | ') + '\n';
      result += headers.map(() => '---').join(' | ') + '\n';
      
      // Add rows
      rows.forEach(row => {
        const values = headers.map(header => {
          const value = row[header];
          return value === null ? 'NULL' : String(value);
        });
        result += values.join(' | ') + '\n';
      });

      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text",
            text: `Error executing query: ${errorMessage}`,
          },
        ],
      };
    }
  }
);

// Tool: Get database schema overview
server.tool(
  "get_schema",
  "Get an overview of the database schema including tables and their relationships",
  {},
  async () => {
    try {
      // Get all tables with row counts
      const tablesQuery = `
        SELECT 
          schemaname,
          tablename,
          tableowner
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename;
      `;
      
      const tables = await executeQuery(tablesQuery);
      
      // Get foreign key relationships
      const relationshipsQuery = `
        SELECT 
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS referenced_table,
          ccu.column_name AS referenced_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_schema = 'public' 
          AND tc.constraint_type = 'FOREIGN KEY'
        ORDER BY tc.table_name, kcu.column_name;
      `;
      
      const relationships = await executeQuery(relationshipsQuery);
      
      let schema = `Database Schema Overview:\n\n`;
      
      if (tables.length === 0) {
        schema += "No tables found in the public schema.";
      } else {
        schema += `Tables (${tables.length}):\n`;
        tables.forEach(table => {
          schema += `- ${table.tablename}\n`;
        });
        
        if (relationships.length > 0) {
          schema += `\nRelationships:\n`;
          relationships.forEach(rel => {
            schema += `- ${rel.table_name}.${rel.column_name} -> ${rel.referenced_table}.${rel.referenced_column}\n`;
          });
        }
      }

      return {
        content: [
          {
            type: "text",
            text: schema,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text",
            text: `Error getting schema: ${errorMessage}`,
          },
        ],
      };
    }
  }
);

// Tool: Disconnect from database
server.tool(
  "disconnect_database",
  "Disconnect from the current PostgreSQL database",
  {},
  async () => {
    try {
      if (dbClient) {
        await dbClient.end();
        dbClient = null;
        return {
          content: [
            {
              type: "text",
              text: "Successfully disconnected from database.",
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: "No active database connection to disconnect.",
            },
          ],
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text",
            text: `Error disconnecting from database: ${errorMessage}`,
          },
        ],
      };
    }
  }
);

// Main function to run the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Log to stderr (not stdout to avoid corrupting JSON-RPC)
  console.error("PostgreSQL MCP Server running on stdio");
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.error('Received SIGINT, shutting down gracefully...');
    if (dbClient) {
      await dbClient.end();
    }
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.error('Received SIGTERM, shutting down gracefully...');
    if (dbClient) {
      await dbClient.end();
    }
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
