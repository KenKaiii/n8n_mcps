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

Our MCP architecture uses a secure two-layer design optimized for n8n integration:

1. **NGINX Proxy Layer (Port 8080)** - Authentication proxy with Bearer token validation
2. **Supergateway Layer (Port 8081)** - MCP protocol implementation (internal)
3. **MCP Server (STDIO)** - Core MCP implementation that handles tools, resources, and prompts

```
n8n → NGINX Proxy (8080) → Supergateway (8081) → STDIO → MCP Server
           ↓
    Bearer Token Auth
    (401 if invalid)
```

**Why This Architecture?**
- **Security**: NGINX validates Bearer tokens before reaching application layer
- **n8n Compatibility**: Supergateway provides proper MCP protocol support
- **Reliability**: Proven proxy layer handles auth, routing, and error responses
- **Scalability**: NGINX can handle high concurrent connections efficiently

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
│   └── config.ts         # Configuration management
├── dist/                 # Compiled JavaScript (generated)
├── nginx.conf            # NGINX authentication proxy config
├── start.sh              # Container startup script
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

## Phase 3: NGINX Authentication Setup

The recommended architecture uses NGINX as an authentication proxy with Supergateway for MCP protocol support.

### 3.1 Create nginx.conf

```nginx
events {
    worker_connections 1024;
}

http {
    server {
        listen 8080;

        location / {
            # Simple Bearer token validation using if statement
            set $auth_ok 0;
            if ($http_authorization = "Bearer ${MCP_AUTH_TOKEN}") {
                set $auth_ok 1;
            }
            if ($auth_ok = 0) {
                add_header Content-Type application/json always;
                return 401 '{"error":"Unauthorized: Invalid or missing Bearer token"}';
            }

            proxy_pass http://localhost:8081;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            # SSE specific settings
            proxy_buffering off;
            proxy_cache off;
            proxy_set_header Cache-Control no-cache;
        }
    }
}
```

### 3.2 Create start.sh

```bash
#!/bin/bash

# Substitute environment variable in nginx config
envsubst '${MCP_AUTH_TOKEN}' < /etc/nginx/nginx.conf > /tmp/nginx.conf
mv /tmp/nginx.conf /etc/nginx/nginx.conf

# Start nginx in background
nginx -g "daemon off;" &

# Start supergateway on port 8081 (nginx proxies from 8080 to 8081)
supergateway --port 8081 --stdio 'node dist/index.js 2>&1'
```

Make it executable:
```bash
chmod +x start.sh
```

### 3.3 Create Dockerfile

```dockerfile
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy source files
COPY tsconfig.json ./
COPY src ./src

# Build the TypeScript project
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Install nginx, gettext-base for envsubst, and supergateway
RUN apt-get update && apt-get install -y \
    nginx \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g supergateway

# Copy nginx configuration and start script
COPY nginx.conf /etc/nginx/nginx.conf
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Expose port - Railway will override this
EXPOSE 8080

# Set MCP_AUTH_TOKEN from environment
ENV MCP_AUTH_TOKEN=${MCP_AUTH_TOKEN}

# Start nginx proxy + supergateway
CMD ["/start.sh"]
```

## Phase 4: Authentication Testing

You can test the authentication system locally before deployment:

### 4.1 Local Testing Script

Create a test script to verify your authentication setup:

```bash
#!/bin/bash

# Set your test token
export MCP_AUTH_TOKEN="test-token-$(date +%s)"
echo "Using token: $MCP_AUTH_TOKEN"

# Build the project
npm run build

# Test nginx config substitution
envsubst '${MCP_AUTH_TOKEN}' < nginx.conf > /tmp/test-nginx.conf

# Start nginx
nginx -c "/tmp/test-nginx.conf" -p /tmp/

# Start supergateway in background
supergateway --port 8081 --stdio 'node dist/index.js 2>&1' &
GATEWAY_PID=$!

sleep 3

echo "Testing authentication..."

# Test no auth (should get 401)
echo "No auth test:"
curl -s -X GET "http://localhost:8080/sse" | head -1

# Test wrong auth (should get 401)
echo "Wrong auth test:"
curl -s -X GET "http://localhost:8080/sse" -H "Authorization: Bearer wrong-token" | head -1

# Test correct auth (should get SSE stream)
echo "Correct auth test:"
curl -s -X GET "http://localhost:8080/sse" -H "Authorization: Bearer $MCP_AUTH_TOKEN" --max-time 2 | head -1

# Cleanup
kill $GATEWAY_PID 2>/dev/null || true
nginx -s stop 2>/dev/null || true

echo "✅ Authentication test complete"
```

### 4.2 Expected Results

**Successful authentication test should show:**
- No auth: `{"error":"Unauthorized: Invalid or missing Bearer token"}`
- Wrong auth: `{"error":"Unauthorized: Invalid or missing Bearer token"}`
- Correct auth: `event: endpoint` (SSE stream starts)

### 4.3 Docker Testing

Test the complete Docker setup:

```bash
# Build image
docker build -t your-mcp-server .

# Run with auth token
docker run -p 8080:8080 -e MCP_AUTH_TOKEN="your-test-token" your-mcp-server

# Test from another terminal
curl -X GET "http://localhost:8080/sse" \
  -H "Authorization: Bearer your-test-token"
```

## Phase 5: Development Testing

### 5.1 STDIO Server Testing

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

### 5.2 Full Stack Testing

Test the complete NGINX + Supergateway setup:

```bash
npm run build
export MCP_AUTH_TOKEN="your-test-token"
bash start.sh
```

Then test authentication in another terminal:
```bash
# Should fail
curl -X GET "http://localhost:8080/sse"

# Should work
curl -X GET "http://localhost:8080/sse" \
  -H "Authorization: Bearer your-test-token"
```

## Phase 6: Implementation Checklist

Before deployment, ensure:

- [ ] All tools implemented and tested
- [ ] Error handling in place for all async operations
- [ ] Input validation using Zod schemas
- [ ] Environment variables documented in .env.example
- [ ] TypeScript compilation successful (`npm run typecheck`)
- [ ] No hardcoded secrets or API keys
- [ ] NGINX config created with authentication
- [ ] start.sh script created and executable
- [ ] Dockerfile includes NGINX and supergateway
- [ ] Authentication testing passes all scenarios
- [ ] README.md with clear usage instructions
- [ ] All console.log replaced with console.error (for STDIO compatibility)

## Best Practices

1. **Security Architecture**
   - Use NGINX proxy for authentication (never skip this layer)
   - Generate strong 32+ character Bearer tokens
   - Validate tokens before reaching application layer
   - Use HTTPS in production (Railway handles this automatically)

2. **Error Handling**
   - Always wrap async operations in try-catch
   - Return structured error responses
   - Log errors to console.error (not console.log)
   - Handle authentication failures gracefully

3. **Input Validation**
   - Use Zod schemas for all tool inputs
   - Validate types and required fields
   - Provide clear error messages
   - Sanitize all user inputs

4. **Authentication**
   - Never hardcode tokens in code
   - Use environment variables for MCP_AUTH_TOKEN
   - Test all authentication scenarios (no token, wrong token, correct token)
   - Return proper 401 responses for unauthorized requests

5. **Performance**
   - Implement timeouts for external API calls
   - Use connection pooling for databases
   - Cache frequently accessed data
   - NGINX handles connection management efficiently

6. **STDIO Compatibility**
   - Use console.error for logging (console.log is for MCP output)
   - Ensure clean JSON output on stdout
   - Handle process termination gracefully
   - Test STDIO server independently before integration

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
