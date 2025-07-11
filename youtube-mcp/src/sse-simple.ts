#!/usr/bin/env node
import express from 'express';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { setupTools } from './tools.js';
import { setupResources } from './resources.js';
import { setupPrompts } from './prompts.js';
import { spawn } from 'child_process';

const PORT = process.env.PORT || 8080;
const app = express();
app.use(express.json());

// SSE connections
const sseConnections = new Map();

// SSE endpoint
app.get('/sse', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const messageUrl = `${req.protocol}://${req.get('host')}/messages`;
  res.write(`event: endpoint\ndata: ${messageUrl}\n\n`);

  const connectionId = Date.now().toString();
  sseConnections.set(connectionId, res);

  const pingInterval = setInterval(() => {
    res.write(`event: ping\ndata: ${Date.now()}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(pingInterval);
    sseConnections.delete(connectionId);
  });
});

// Message endpoint - proxy to stdio MCP server
app.post('/messages', async (req, res) => {
  try {
    const { jsonrpc, method, params, id } = req.body;

    if (jsonrpc !== '2.0') {
      throw new Error('Invalid JSON-RPC version');
    }

    // Spawn the stdio server for each request
    const child = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let responseData = '';
    let errorData = '';

    child.stdout.on('data', (data) => {
      responseData += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    child.on('close', () => {
      try {
        // Parse the JSON-RPC response from stdout
        const lines = responseData.split('\n').filter(line => line.trim());
        let response;

        // Find the response matching our request
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.id === id) {
              response = parsed;
              break;
            }
          } catch (e) {
            // Skip non-JSON lines
          }
        }

        if (response) {
          res.json(response);
        } else {
          // Hardcoded responses for basic methods
          let result;
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
              result = {
                tools: [
                  {
                    name: 'analyze_video_idea',
                    description: 'Analyze a video idea and find high-performing related videos with titles and thumbnails',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        videoIdea: { type: 'string', description: 'The video idea to analyze' },
                        maxResults: { type: 'number', default: 10 },
                        minViewCount: { type: 'number', default: 10000 }
                      },
                      required: ['videoIdea']
                    }
                  },
                  {
                    name: 'get_quota_status',
                    description: 'Check current YouTube API quota usage',
                    inputSchema: { type: 'object', properties: {} }
                  },
                  {
                    name: 'expand_search_terms',
                    description: 'Generate semantic variations of a video idea for broader search',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        videoIdea: { type: 'string', description: 'The video idea to expand' }
                      },
                      required: ['videoIdea']
                    }
                  },
                  {
                    name: 'get_performance_metrics',
                    description: 'Get detailed performance metrics and analytics',
                    inputSchema: { type: 'object', properties: {} }
                  }
                ]
              };
              break;

            default:
              throw new Error(`Method ${method} requires stdio connection`);
          }

          res.json({
            jsonrpc: '2.0',
            result,
            id
          });
        }
      } catch (error: any) {
        res.json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: error.message || 'Internal error'
          },
          id
        });
      }
    });

    // Send the request to the stdio server
    const request = JSON.stringify({ jsonrpc, method, params, id });
    child.stdin.write(request + '\n');
    child.stdin.end();

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

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.listen(PORT, () => {
  console.log(`SSE MCP Server running on port ${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`\nFor n8n integration, use:`);
  console.log(`SSE URL: http://localhost:${PORT}/sse`);
  console.log(`\nOr with ngrok:`);
  console.log(`SSE URL: https://efcbda14101b.ngrok-free.app/sse`);
});
