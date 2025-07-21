#!/bin/bash

echo "Building VS Code extension..."

cd "$(dirname "$0")"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Compile the extension
echo "Compiling TypeScript..."
npm run compile

# Check if compilation was successful
if [ $? -eq 0 ]; then
    echo "✅ Extension compiled successfully!"
    echo ""
    echo "To test the extension:"
    echo "1. Open VS Code in this directory"
    echo "2. Press F5 to launch Extension Development Host"
    echo "3. Test the PostgreSQL MCP commands"
    echo ""
    echo "Available commands:"
    echo "- PostgreSQL MCP: Connect to PostgreSQL Database"
    echo "- PostgreSQL MCP: Execute Natural Language Query"
    echo "- PostgreSQL MCP: Show Database Schema"
    echo "- PostgreSQL MCP: List Tables"
    echo "- PostgreSQL MCP: Describe Table"
else
    echo "❌ Compilation failed!"
    exit 1
fi
