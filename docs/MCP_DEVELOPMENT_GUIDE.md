# MCP Development Guide

This guide provides step-by-step instructions for building an MCP (Model Context Protocol) server that can be deployed on Railway and integrated with n8n.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Core Implementation](#core-implementation)
4. [SSE Server Implementation](#sse-server-implementation)
5. [Testing](#testing)
6. [Next Steps](#next-steps)

## Architecture Overview

Our MCP architecture consists of three key components:

1. **MCP Server (STDIO)** - The core MCP implementation that handles tools, resources, and prompts
2. **Supergateway** - Converts STDIO to HTTP with authentication
3. **SSE Server** - Optional Server-Sent Events endpoint for n8n integration

```
n8n → HTTP Request → Supergateway → STDIO → MCP Server
                          ↓
                    Authentication
                    (Bearer Token)
```

## Project Structure

Create the following directory structure:

```
your-mcp-server/
├── src/
│   ├── index.ts          # Main MCP server entry point
│   ├── tools.ts          # Tool implementations
│   ├── resources.ts      # Resource implementations (optional)
│   ├── prompts.ts        # Prompt implementations (optional)
│   ├── types.ts          # TypeScript type definitions
│   ├── config.ts         # Configuration management
│   └── sse-simple.ts     # SSE server (optional, for n8n)
├── dist/                 # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
├── Dockerfile
├── railway.json
├── .env.example
├── .gitignore
└── README.md
```

## Phase 1: Initialize Project

### 1.1 Create package.json

```json
{
  "name": "your-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for [your functionality]",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "start": "node dist/index.js",
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "dev:sse": "tsx src/sse-simple.ts",
    "start:sse": "node dist/sse-simple.js",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext .ts",
    "test": "jest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.15.0",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.14.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.57.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "tsx": "^4.11.0",
    "typescript": "^5.4.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 1.2 Create tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 1.3 Create .gitignore

```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
coverage/
.vscode/
.idea/
```

### 1.4 Create .env.example

```bash
# Server Configuration
PORT=8080
NODE_ENV=production

# Authentication (REQUIRED for production)
MCP_AUTH_TOKEN=your-secure-auth-token-here

# GitHub Integration (Optional - for publishing features)
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repo-name
GITHUB_BRANCH=main
GITHUB_TOKEN=your-github-personal-access-token

# Add your API keys and configuration here
# API_KEY=your-api-key
# DATABASE_URL=your-database-url
```

## Phase 2: Core MCP Implementation

### 2.1 Create src/types.ts

```typescript
import { z } from 'zod';

// Define your tool input schemas
export const YourToolSchema = z.object({
  param1: z.string().describe('Description of parameter'),
  param2: z.number().optional().describe('Optional parameter'),
});

// Define your types
export type YourToolInput = z.infer<typeof YourToolSchema>;

export interface YourToolResult {
  success: boolean;
  data?: any;
  error?: string;
}
```

### 2.2 Create src/config.ts

```typescript
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || '8080',
  nodeEnv: process.env.NODE_ENV || 'development',
  authToken: process.env.MCP_AUTH_TOKEN || '',
  // Add your configuration here
  apiKey: process.env.API_KEY || '',
};

// Validate required configuration
if (!config.authToken && config.nodeEnv === 'production') {
  console.error('ERROR: MCP_AUTH_TOKEN is required in production');
  console.error('Please set the MCP_AUTH_TOKEN environment variable');
  process.exit(1);
}

// Validate auth token format (should be at least 32 characters)
if (config.authToken && config.authToken.length < 32) {
  console.error('WARNING: MCP_AUTH_TOKEN should be at least 32 characters for security');
}
```

### 2.3 Create src/tools.ts

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { YourToolSchema, YourToolInput, YourToolResult } from './types.js';

// Tool implementation
async function executeYourTool(input: YourToolInput): Promise<YourToolResult> {
  try {
    // Validate input
    const validated = YourToolSchema.parse(input);

    // Implement your tool logic here
    const result = await performYourOperation(validated);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Tool execution error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function performYourOperation(input: YourToolInput): Promise<any> {
  // Your actual implementation here
  return { message: `Processed ${input.param1}` };
}

export function setupTools(server: Server) {
  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'your_tool_name',
          description: 'Clear description of what this tool does',
          inputSchema: {
            type: 'object',
            properties: {
              param1: {
                type: 'string',
                description: 'Description of parameter',
              },
              param2: {
                type: 'number',
                description: 'Optional parameter',
              },
            },
            required: ['param1'],
          },
        },
        // Add more tools here
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'your_tool_name': {
          const result = await executeYourTool(args as YourToolInput);
          if (!result.success) {
            throw new McpError(ErrorCode.InternalError, result.error || 'Tool execution failed');
          }
          return { content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }] };
        }

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error}`);
    }
  });
}
```

### 2.4 Create src/resources.ts (Optional)

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';

export function setupResources(server: Server) {
  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'resource://example/data',
          name: 'Example Data',
          description: 'Description of the resource',
          mimeType: 'application/json',
        },
      ],
    };
  });

  // Read resource content
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    switch (uri) {
      case 'resource://example/data':
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ example: 'data' }, null, 2),
            },
          ],
        };

      default:
        throw new McpError(ErrorCode.ResourceNotFound, `Unknown resource: ${uri}`);
    }
  });
}
```

### 2.5 Create src/prompts.ts (Optional)

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';

export function setupPrompts(server: Server) {
  // List available prompts
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: 'example_prompt',
          description: 'An example prompt template',
          arguments: [
            {
              name: 'topic',
              description: 'The topic to generate content about',
              required: true,
            },
          ],
        },
      ],
    };
  });

  // Get prompt content
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'example_prompt':
        return {
          description: 'An example prompt template',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Generate content about: ${args?.topic || 'default topic'}`,
              },
            },
          ],
        };

      default:
        throw new McpError(ErrorCode.InvalidRequest, `Unknown prompt: ${name}`);
    }
  });
}
```

### 2.6 Create src/index.ts

```typescript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { setupTools } from './tools.js';
import { setupResources } from './resources.js';
import { setupPrompts } from './prompts.js';
import { config } from './config.js';

// Create server instance
const server = new Server(
  {
    name: 'your-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {}, // Remove if not using resources
      prompts: {},   // Remove if not using prompts
    },
  }
);

// Set up handlers
setupTools(server);
setupResources(server); // Remove if not using resources
setupPrompts(server);   // Remove if not using prompts

// Error handling
server.onerror = (error) => {
  console.error('[MCP Server Error]', error);
};

// Start the server
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('MCP server started successfully');
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
```

## Phase 3: Choose Your Deployment Architecture

### Decision Matrix: SSE vs Direct HTTP

| Use Case | Recommendation | Deployment Method | Reason |
|----------|---------------|-------------------|---------|
| **n8n integration** | SSE Server | `CMD ["node", "dist/sse-simple.js"]` | Better n8n compatibility, handles auth properly |
| **Simple API calls** | Direct HTTP | `CMD ["supergateway", "..."]` | Simpler deployment |
| **Real-time streaming** | SSE Server | `CMD ["node", "dist/sse-simple.js"]` | Required for streaming |
| **High concurrency** | SSE Server | `CMD ["node", "dist/sse-simple.js"]` | Better process management |
| **CLI tools only** | Direct HTTP | `CMD ["supergateway", "..."]` | No extra complexity needed |

### 3.1 Option A: Direct HTTP (Supergateway Only)

**Use this when:**
- Simple request/response operations
- No n8n integration needed
- CLI tools or simple API access

**Deployment:** Use Supergateway in Dockerfile:
```dockerfile
RUN npm install -g supergateway
CMD ["sh", "-c", "supergateway --port ${PORT:-8080} --oauth2Bearer \"${MCP_AUTH_TOKEN}\" --stdio 'node dist/index.js 2>&1'"]
```

### 3.2 Option B: SSE Server (Recommended for n8n)

**Use this when:**
- n8n integration required
- Need better authentication control
- Want process pooling/optimization

**Deployment:** Use SSE server in Dockerfile:
```dockerfile
CMD ["node", "dist/sse-simple.js"]
```

## Phase 4: SSE Server Implementation (Option B)

If you chose SSE server for n8n integration, create:

### 3.1 Create src/sse-simple.ts

```typescript
#!/usr/bin/env node
import express from 'express';
import { spawn } from 'child_process';
import { config } from './config.js';

const app = express();
app.use(express.json());

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

  const pingInterval = setInterval(() => {
    res.write(`event: ping\ndata: ${Date.now()}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(pingInterval);
  });
});

// Message endpoint - proxy to stdio MCP server
app.post('/messages', async (req, res) => {
  try {
    const { jsonrpc, method, params, id } = req.body;

    // Spawn the stdio server
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

    // Send request to stdio server
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

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`SSE MCP Server running on port ${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
});
```

## Phase 4: Testing

### 4.1 Local Testing

1. Install dependencies:
   ```bash
   npm install
   ```

2. Test STDIO server directly:
   ```bash
   npm run dev
   ```
   Then send JSON-RPC commands via stdin:
   ```json
   {"jsonrpc":"2.0","method":"tools/list","id":1}
   ```

3. Test with MCP Inspector:
   ```bash
   npx @modelcontextprotocol/inspector npm run dev
   ```

4. Test SSE server (if implemented):
   ```bash
   npm run dev:sse
   ```
   Visit http://localhost:8080/sse in browser

### 4.2 Build and Test Production

```bash
npm run build
npm start
```

## Phase 5: Implementation Checklist

Before deployment, ensure:

- [ ] All tools implemented and tested
- [ ] Error handling in place for all async operations
- [ ] Input validation using Zod schemas
- [ ] Environment variables documented in .env.example
- [ ] TypeScript compilation successful (`npm run typecheck`)
- [ ] No hardcoded secrets or API keys
- [ ] README.md with clear usage instructions
- [ ] All console.log replaced with console.error (for STDIO compatibility)

## Best Practices

1. **Error Handling**
   - Always wrap async operations in try-catch
   - Return structured error responses
   - Log errors to console.error (not console.log)

2. **Input Validation**
   - Use Zod schemas for all tool inputs
   - Validate types and required fields
   - Provide clear error messages

3. **Security**
   - Never hardcode sensitive data
   - Use environment variables for all configuration
   - Validate and sanitize all inputs

4. **Performance**
   - Implement timeouts for external API calls
   - Use connection pooling for databases
   - Cache frequently accessed data

5. **STDIO Compatibility**
   - Use console.error for logging (console.log is for MCP output)
   - Ensure clean JSON output on stdout
   - Handle process termination gracefully

## Next Steps

After completing development:
1. Proceed to [Railway Deployment Guide](./RAILWAY_DEPLOYMENT_GUIDE.md)
2. Configure authentication with [SSE Integration Guide](./SSE_INTEGRATION_GUIDE.md)
3. Connect to n8n using [n8n Setup Guide](./N8N_SETUP_GUIDE.md)

## Troubleshooting

Common issues and solutions:

1. **"Cannot find module"**
   - Ensure all imports use `.js` extension
   - Check tsconfig.json module settings

2. **STDIO communication issues**
   - Verify only JSON-RPC on stdout
   - Check for console.log statements

3. **Type errors**
   - Run `npm run typecheck`
   - Ensure all parameters are typed

4. **Authentication failures**
   - Verify MCP_AUTH_TOKEN is set
   - Check token format in requests
