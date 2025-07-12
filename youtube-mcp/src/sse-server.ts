#!/usr/bin/env node
import express from 'express';
import { spawn } from 'child_process';

const PORT = process.env.PORT || 8080;
const app = express();
app.use(express.json());

// Authentication middleware
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token || token !== process.env.MCP_AUTH_TOKEN) {
    return res.status(401).json({
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message: 'Unauthorized: Invalid or missing MCP auth token'
      },
      id: null
    });
  }
  next();
};

// SSE connections
const sseConnections = new Map<string, express.Response>();

// SSE endpoint with flexible authentication (header or query param)
app.get('/sse', (req, res) => {
  // Check for token in Authorization header or query parameter
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.replace('Bearer ', '');
  const tokenFromQuery = req.query.token as string;

  const token = tokenFromHeader || tokenFromQuery;

  if (!token || token !== process.env.MCP_AUTH_TOKEN) {
    return res.status(401).json({
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message: 'Unauthorized: Invalid or missing MCP auth token'
      },
      id: null
    });
  }
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

// Message endpoint with authentication
app.post('/messages', authMiddleware, async (req, res) => {
  try {
    const { jsonrpc, method, params, id } = req.body;

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
        const lines = responseData.split('\n').filter(line => line.trim());
        let response;

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
          res.json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'No response from MCP server'
            },
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

// CORS support
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.listen(PORT, () => {
  console.error(`Authenticated SSE MCP server running at http://localhost:${PORT}`);
  console.error(`SSE endpoint: http://localhost:${PORT}/sse`);
  console.error(`Message endpoint: http://localhost:${PORT}/messages`);
  console.error(`Authentication: Bearer ${process.env.MCP_AUTH_TOKEN ? 'REQUIRED' : 'NOT SET'}`);
  console.error(`Ready for n8n integration!`);
});
