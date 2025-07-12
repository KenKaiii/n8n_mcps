/**
 * Resource handlers for Web Scraper MCP
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

export function setupResources(server: Server): void {
  // Handle list resources request
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [],
    };
  });

  // Handle read resource request
  server.setRequestHandler(ReadResourceRequestSchema, async request => {
    throw new Error(`Resource not found: ${request.params.uri}`);
  });
}
