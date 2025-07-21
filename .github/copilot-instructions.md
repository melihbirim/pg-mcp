# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a Model Context Protocol (MCP) server for PostgreSQL that enables AI assistants to interact with PostgreSQL databases using natural language queries.

## Key Guidelines
- You can find more info and examples at https://modelcontextprotocol.io/llms-full.txt
- This server provides tools for database schema inspection and safe query execution
- Always prioritize security by implementing read-only modes and query validation
- Use proper error handling and logging to stderr (never stdout for stdio transport)
- Follow MCP best practices for tool definitions and parameter validation

## Architecture
- Uses the MCP TypeScript SDK for server implementation
- Integrates with PostgreSQL using the `pg` library
- Implements tools for natural language to SQL translation capabilities
- Provides schema inspection and query execution functionality
