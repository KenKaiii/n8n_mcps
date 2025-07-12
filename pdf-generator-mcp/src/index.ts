#!/usr/bin/env node
/**
 * MCP server for generating beautiful PDF documents
 * Supports technical documentation, research papers, and everyday documents
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { setupTools } from './tools.js';

// Initialize the MCP server
const server = new Server(
  {
    name: 'pdf-generator-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// Override protocol version handling to accept any version (for n8n compatibility)
(server as any).protocolVersion = '2025-03-26';

// Add debug logging for incoming messages
const originalConnect = server.connect.bind(server);
server.connect = async function(transport: any) {
  console.error('Setting up transport with debug logging...');

  // Intercept incoming messages
  const originalRead = transport.read?.bind(transport) || transport.readable?.getReader?.().read?.bind(transport.readable.getReader());
  if (transport.read) {
    transport.read = async function() {
      const result = await originalRead();
      if (result) {
        console.error('Incoming message:', JSON.stringify(result, null, 2));
      }
      return result;
    };
  }

  return originalConnect(transport);
};

// Set up tools
setupTools(server);

// Start the server
async function main() {
  try {
    console.error('Starting PDF Generator MCP server...');

    // Ensure stdout is unbuffered for SSE
    if (process.stdout.isTTY === false) {
      process.stdout.setDefaultEncoding('utf-8');
    }

    const transport = new StdioServerTransport();

    console.error('Connecting transport...');
    await server.connect(transport);
    console.error('PDF Generator MCP server started and ready');
  } catch (error) {
    console.error('Failed to start PDF Generator MCP server:', error);
    throw new Error(`Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

main().catch(error => {
  console.error('Server error:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});
