/**
 * Prompt templates for Web Scraper MCP
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

export function setupPrompts(server: Server): void {
  // Handle list prompts request
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [],
    };
  });

  // Handle get prompt request
  server.setRequestHandler(GetPromptRequestSchema, async request => {
    throw new Error(`Prompt not found: ${request.params.name}`);
  });
}
