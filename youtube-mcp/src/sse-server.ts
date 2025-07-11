#!/usr/bin/env node
import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { setupTools } from './tools.js';
import { setupResources } from './resources.js';
import { setupPrompts } from './prompts.js';

const PORT = process.env.PORT || 8080;

// Create Express app
const app = express();
app.use(express.json());

// Store SSE connections and tool metadata
const sseConnections = new Map();
const toolDefinitions: any[] = [];
const resourceDefinitions: any[] = [];
const promptDefinitions: any[] = [];

// Create MCP server
const mcpServer = new Server({
  name: 'youtube-analyzer-mcp',
  version: '1.0.0'
}, {
  capabilities: {
    tools: {},
    resources: {},
    prompts: {}
  }
});

// Intercept tool registration to capture metadata
const originalSetRequestHandler = mcpServer.setRequestHandler.bind(mcpServer);
mcpServer.setRequestHandler = function(schema: any, handler: any) {
  // Capture tool definitions
  if (schema === 'tools/list') {
    const originalHandler = handler;
    handler = async () => {
      const result = await originalHandler();
      toolDefinitions.push(...result.tools);
      return result;
    };
  }
  // Capture resource definitions
  if (schema === 'resources/list') {
    const originalHandler = handler;
    handler = async () => {
      const result = await originalHandler();
      resourceDefinitions.push(...result.resources);
      return result;
    };
  }
  // Capture prompt definitions
  if (schema === 'prompts/list') {
    const originalHandler = handler;
    handler = async () => {
      const result = await originalHandler();
      promptDefinitions.push(...result.prompts);
      return result;
    };
  }
  return originalSetRequestHandler(schema, handler);
};

// Set up MCP functionality
setupTools(mcpServer);
setupResources(mcpServer);
setupPrompts(mcpServer);

// Get initial definitions
// Note: These handlers are already set up by setupTools, setupResources, and setupPrompts

// SSE endpoint
app.get('/sse', (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send initial endpoint event
  const messageUrl = `${req.protocol}://${req.get('host')}/messages`;
  res.write(`event: endpoint\ndata: ${messageUrl}\n\n`);

  // Store connection
  const connectionId = Date.now().toString();
  sseConnections.set(connectionId, res);

  // Keep connection alive
  const pingInterval = setInterval(() => {
    res.write(`event: ping\ndata: ${Date.now()}\n\n`);
  }, 30000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(pingInterval);
    sseConnections.delete(connectionId);
  });
});

// Message endpoint
app.post('/messages', async (req, res) => {
  try {
    const { jsonrpc, method, params, id } = req.body;

    if (jsonrpc !== '2.0') {
      throw new Error('Invalid JSON-RPC version');
    }

    let result;

    // Handle MCP methods
    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {},
            prompts: {}
          },
          serverInfo: {
            name: 'youtube-analyzer-mcp',
            version: '1.0.0'
          }
        };
        break;

      case 'tools/list':
        // Return hardcoded tool definitions for YouTube MCP
        result = {
          tools: [
            {
              name: 'analyze_video_idea',
              description: 'Analyze a video idea and find high-performing related videos with titles and thumbnails',
              inputSchema: {
                type: 'object',
                properties: {
                  videoIdea: {
                    type: 'string',
                    description: 'The video idea to analyze (e.g., "video automation")'
                  },
                  maxResults: {
                    type: 'number',
                    description: 'Maximum number of results to return (default: 10)',
                    default: 10
                  },
                  minViewCount: {
                    type: 'number',
                    description: 'Minimum view count for videos to consider (default: 10000)',
                    default: 10000
                  },
                  youtubeApiKey: {
                    type: 'string',
                    description: 'YouTube Data API key (optional, uses config if not provided)'
                  }
                },
                required: ['videoIdea']
              }
            },
            {
              name: 'get_quota_status',
              description: 'Check current YouTube API quota usage',
              inputSchema: {
                type: 'object',
                properties: {}
              }
            },
            {
              name: 'expand_search_terms',
              description: 'Generate semantic variations of a video idea for broader search',
              inputSchema: {
                type: 'object',
                properties: {
                  videoIdea: {
                    type: 'string',
                    description: 'The video idea to expand'
                  }
                },
                required: ['videoIdea']
              }
            },
            {
              name: 'get_performance_metrics',
              description: 'Get detailed performance metrics and analytics',
              inputSchema: {
                type: 'object',
                properties: {}
              }
            }
          ]
        };
        break;

      case 'tools/call':
        // Delegate to the actual MCP server
        const handlers = mcpServer._requestHandlers || mcpServer.requestHandlers;
        const toolHandler = handlers?.get('tools/call');
        if (toolHandler) {
          result = await toolHandler(params);
        } else {
          throw new Error('Tool handler not found');
        }
        break;

      case 'resources/list':
        result = {
          resources: [
            {
              uri: 'data://list',
              name: 'data List',
              description: 'List of all datas',
              mimeType: 'application/json'
            },
            {
              uri: 'search://list',
              name: 'search List',
              description: 'List of all searchs',
              mimeType: 'application/json'
            },
            {
              uri: 'content://list',
              name: 'content List',
              description: 'List of all contents',
              mimeType: 'application/json'
            },
            {
              uri: 'goal://list',
              name: 'goal List',
              description: 'List of all goals',
              mimeType: 'application/json'
            },
            {
              uri: 'config://settings',
              name: 'Configuration',
              description: 'Server configuration and settings',
              mimeType: 'application/json'
            }
          ]
        };
        break;

      case 'resources/read':
        // Delegate to the actual MCP server
        const resourceHandlers = mcpServer._requestHandlers || mcpServer.requestHandlers;
        const resourceHandler = resourceHandlers?.get('resources/read');
        if (resourceHandler) {
          result = await resourceHandler(params);
        } else {
          throw new Error('Resource handler not found');
        }
        break;

      case 'prompts/list':
        result = {
          prompts: [
            {
              name: 'analyze_data',
              description: 'Analyze data data and provide insights',
              arguments: [
                {
                  name: 'context',
                  description: 'Analysis context',
                  required: false
                }
              ]
            },
            {
              name: 'analyze_search',
              description: 'Analyze search data and provide insights',
              arguments: [
                {
                  name: 'context',
                  description: 'Analysis context',
                  required: false
                }
              ]
            },
            {
              name: 'analyze_content',
              description: 'Analyze content data and provide insights',
              arguments: [
                {
                  name: 'context',
                  description: 'Analysis context',
                  required: false
                }
              ]
            },
            {
              name: 'analyze_goal',
              description: 'Analyze goal data and provide insights',
              arguments: [
                {
                  name: 'context',
                  description: 'Analysis context',
                  required: false
                }
              ]
            },
            {
              name: 'help',
              description: 'Get help with using this MCP server',
              arguments: []
            }
          ]
        };
        break;

      case 'prompts/get':
        // Delegate to the actual MCP server
        const promptHandlers = mcpServer._requestHandlers || mcpServer.requestHandlers;
        const promptHandler = promptHandlers?.get('prompts/get');
        if (promptHandler) {
          result = await promptHandler(params);
        } else {
          throw new Error('Prompt handler not found');
        }
        break;

      default:
        throw new Error(`Unknown method: ${method}`);
    }

    // Send response
    res.json({
      jsonrpc: '2.0',
      result,
      id
    });

  } catch (error: any) {
    res.json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: error.message
      },
      id: req.body.id
    });
  }
});

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Start server
app.listen(PORT, () => {
  console.log(`SSE MCP Server running on port ${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`Message endpoint: http://localhost:${PORT}/messages`);
  console.log('');
  console.log('For n8n integration, use:');
  console.log(`SSE URL: http://localhost:${PORT}/sse`);
});
