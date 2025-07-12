# MCP Server Development Guide for Coding Agents

This guide provides complete instructions for building, deploying, and configuring MCP (Model Context Protocol) servers. Follow these steps exactly to ensure successful implementation and deployment on Railway with proper authentication.

## CRITICAL: Pre-Implementation Checklist

Before starting ANY implementation:

1. **UNDERSTAND THE USER'S REQUIREMENTS**
   - What specific functionality does the user want?
   - What tools/resources/prompts are needed?
   - What external APIs or services will be integrated?
   - What authentication method is preferred?

2. **VERIFY THESE DETAILS WITH USER**
   - Server name (will be used in package.json and throughout)
   - Description of functionality
   - List of tools to implement
   - Any specific dependencies or APIs needed
   - Deployment requirements

## Phase 1: Project Setup

### 1.1 Create Project Structure

```bash
# Create these directories and files EXACTLY as shown
mkdir -p src/{tools,resources,prompts,utils}
mkdir -p tests
mkdir -p .github/workflows

# Create essential files
touch src/index.ts
touch src/types.ts
touch Dockerfile
touch railway.toml
touch .env.example
touch README.md
touch tsconfig.json
touch .gitignore
touch .dockerignore
```

### 1.2 Initialize Package.json

Create `package.json` with EXACT dependencies:

```json
{
  "name": "mcp-server-[USER_SPECIFIED_NAME]",
  "version": "1.0.0",
  "description": "[USER_SPECIFIED_DESCRIPTION]",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest tests/integration",
    "test:unit": "jest tests/tools tests/resources tests/prompts",
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\" \"tests/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\" \"tests/**/*.ts\"",
    "check:all": "npm run typecheck && npm run lint && npm run format:check && npm run test"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.1",
    "dotenv": "^16.4.5",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.57.0",
    "jest": "^29.7.0",
    "prettier": "^3.3.0",
    "ts-jest": "^29.1.0",
    "tsx": "^4.11.0",
    "typescript": "^5.4.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 1.3 TypeScript Configuration

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
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

### 1.4 Environment Configuration

Create `.env.example`:

```bash
# MCP Server Configuration
MCP_SERVER_NAME=mcp-server-[name]
MCP_SERVER_PORT=3000

# Authentication (if needed)
MCP_AUTH_TOKEN=your-auth-token-here

# External API Keys (add as needed)
# API_KEY=your-api-key-here

# Railway-specific (DO NOT INCLUDE ACTUAL VALUES)
# These will be set in Railway dashboard
```

## Phase 2: Core Implementation

### 2.1 Server Entry Point (src/index.ts)

ALWAYS implement this base structure:

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables
dotenv.config();

// Import your tools, resources, and prompts
import { handleToolCall } from "./tools/index.js";
import { handleResourceList, handleResourceRead } from "./resources/index.js";
import { handlePromptList, handlePromptGet } from "./prompts/index.js";

// Create server instance
const server = new Server(
  {
    name: process.env.MCP_SERVER_NAME || "mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// Error handling wrapper
const errorHandler = (handler: Function) => {
  return async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error("Handler error:", error);
      throw error;
    }
  };
};

// Tool handlers
server.setRequestHandler(
  ListToolsRequestSchema,
  errorHandler(handleToolList)
);

server.setRequestHandler(
  CallToolRequestSchema,
  errorHandler(handleToolCall)
);

// Resource handlers
server.setRequestHandler(
  ListResourcesRequestSchema,
  errorHandler(handleResourceList)
);

server.setRequestHandler(
  ReadResourceRequestSchema,
  errorHandler(handleResourceRead)
);

// Prompt handlers
server.setRequestHandler(
  ListPromptsRequestSchema,
  errorHandler(handlePromptList)
);

server.setRequestHandler(
  GetPromptRequestSchema,
  errorHandler(handlePromptGet)
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP server started successfully");
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
```

### 2.2 Tool Implementation Pattern

For EACH tool the user wants, create in `src/tools/[toolname].ts`:

```typescript
import { z } from "zod";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

// Define input schema for validation
export const [ToolName]Schema = z.object({
  // Define ALL required parameters with proper types
  param1: z.string().describe("Description of parameter"),
  param2: z.number().optional().describe("Optional parameter"),
});

// Export tool definition
export const [toolName]Tool: Tool = {
  name: "[tool-name]",
  description: "Clear description of what this tool does",
  inputSchema: {
    type: "object",
    properties: {
      param1: {
        type: "string",
        description: "Description of parameter",
      },
      param2: {
        type: "number",
        description: "Optional parameter",
      },
    },
    required: ["param1"],
  },
};

// Implementation
export async function execute[ToolName](
  params: z.infer<typeof [ToolName]Schema>
): Promise<any> {
  // Validate inputs
  const validated = [ToolName]Schema.parse(params);

  try {
    // IMPLEMENT ACTUAL FUNCTIONALITY HERE
    // - Call external APIs
    // - Process data
    // - Return structured results

    return {
      success: true,
      data: {
        // Return structured data
      },
    };
  } catch (error) {
    console.error(`Error in ${[toolName]Tool.name}:`, error);
    throw new Error(`Failed to execute ${[toolName]Tool.name}: ${error.message}`);
  }
}
```

### 2.3 Tool Index (src/tools/index.ts)

```typescript
import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { [toolName]Tool, execute[ToolName] } from "./[toolname].js";
// Import all other tools...

// Export all tools
export const tools = [
  [toolName]Tool,
  // Add all other tools...
];

// Handle tool execution
export async function handleToolCall(request: CallToolRequest) {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "[tool-name]":
      return await execute[ToolName](args);
    // Add cases for all other tools...
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// List available tools
export async function handleToolList() {
  return {
    tools: tools,
  };
}
```

## Phase 3: Docker Configuration

### 3.1 Create Dockerfile

```dockerfile
# Multi-stage build for efficiency
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Switch to non-root user
USER nodejs

# Expose port (for health checks)
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]
```

### 3.2 Create .dockerignore

```
node_modules
npm-debug.log
.env
.env.local
.git
.gitignore
README.md
.eslintrc
.prettierrc
coverage
.nyc_output
.DS_Store
*.log
tests
.github
```

## Phase 4: Railway Deployment

### 4.1 Create railway.toml

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
numReplicas = 1
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[healthcheck]
type = "HTTP"
path = "/health"
port = 3000
timeout = 30
initialDelay = 10
interval = 30
successThreshold = 1
failureThreshold = 3
```

### 4.2 Add Health Check Endpoint

Add to your `src/index.ts`:

```typescript
import http from "http";

// Health check server
const healthServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
  } else {
    res.writeHead(404);
    res.end();
  }
});

healthServer.listen(3000, () => {
  console.error("Health check server listening on port 3000");
});
```

## Phase 5: Testing Implementation

### 5.1 Create Test Structure

For EACH tool, create `tests/tools/[toolname].test.ts`:

```typescript
import { execute[ToolName], [ToolName]Schema } from "../../src/tools/[toolname]";

describe("[ToolName] Tool", () => {
  it("should validate input parameters", () => {
    const validInput = {
      param1: "test",
      param2: 123,
    };

    expect(() => [ToolName]Schema.parse(validInput)).not.toThrow();
  });

  it("should reject invalid input", () => {
    const invalidInput = {
      // Missing required param1
      param2: 123,
    };

    expect(() => [ToolName]Schema.parse(invalidInput)).toThrow();
  });

  it("should execute successfully with valid input", async () => {
    const input = {
      param1: "test",
    };

    const result = await execute[ToolName](input);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});
```

## Phase 6: Authentication Setup

### 6.1 Implement Authentication (if required)

Add to `src/utils/auth.ts`:

```typescript
import { z } from "zod";

const AuthSchema = z.object({
  token: z.string().min(1),
});

export function validateAuth(headers: Record<string, string>): boolean {
  const token = headers["authorization"]?.replace("Bearer ", "");

  if (!token) {
    return false;
  }

  try {
    AuthSchema.parse({ token });
    return token === process.env.MCP_AUTH_TOKEN;
  } catch {
    return false;
  }
}

// Add auth check to your handlers
export function requireAuth(handler: Function) {
  return async (request: any) => {
    if (!validateAuth(request.headers || {})) {
      throw new Error("Unauthorized");
    }
    return handler(request);
  };
}
```

## Phase 7: Deployment Instructions for User

### 7.1 Create Deployment README

Create `DEPLOYMENT.md`:

```markdown
# Deployment Instructions

## Railway Deployment

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose this repository

3. **Configure Environment Variables**
   - Go to your service settings
   - Click on "Variables"
   - Add these variables:
     - `MCP_SERVER_NAME`: Your server name
     - `MCP_AUTH_TOKEN`: Generate a secure token
     - [Add any other API keys needed]

4. **Deploy**
   - Railway will automatically deploy when you push
   - Check logs for any errors

5. **Get Your Server URL**
   - Find in Railway dashboard under "Deployments"
   - Will be format: `https://[your-app].railway.app`

## Configure Claude Desktop

Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "[your-server-name]": {
      "url": "https://[your-app].railway.app",
      "headers": {
        "Authorization": "Bearer [your-auth-token]"
      }
    }
  }
}
```
```

## Phase 8: Implementation Checklist

### MANDATORY CHECKS before considering complete:

1. **Project Structure**
   - [ ] All directories created as specified
   - [ ] All configuration files present
   - [ ] Package.json has exact dependencies
   - [ ] Jest, ESLint, and Prettier configs created

2. **Implementation**
   - [ ] Server starts without errors
   - [ ] All requested tools implemented
   - [ ] Input validation using Zod schemas
   - [ ] Proper error handling in all functions
   - [ ] Health check endpoint working
   - [ ] All functions have explicit return types

3. **Type Safety**
   - [ ] Run `npm run typecheck` - MUST pass with zero errors
   - [ ] No `any` types used anywhere
   - [ ] All function parameters and returns typed
   - [ ] Zod schemas match TypeScript types

4. **Code Quality**
   - [ ] Run `npm run lint` - MUST pass with zero errors
   - [ ] Run `npm run format:check` - MUST pass
   - [ ] No console.log statements (only console.error)
   - [ ] All async functions properly handled

5. **Testing**
   - [ ] Unit tests for all tools/resources/prompts
   - [ ] Integration tests for server
   - [ ] Run `npm run test` - ALL tests MUST pass
   - [ ] Run `npm run test:coverage` - Meet 80% threshold
   - [ ] Error cases tested
   - [ ] Timeout scenarios tested

6. **Docker**
   - [ ] Dockerfile builds successfully
   - [ ] Image runs without errors
   - [ ] Non-root user configured

7. **CI/CD**
   - [ ] GitHub Actions workflow created
   - [ ] Pre-commit hooks configured
   - [ ] All checks pass in CI

8. **Deployment**
   - [ ] railway.toml configured
   - [ ] Environment variables documented
   - [ ] Deployment instructions clear

9. **Documentation**
   - [ ] README.md with usage examples
   - [ ] DEPLOYMENT.md with step-by-step instructions
   - [ ] .env.example with all required variables
   - [ ] JSDoc comments on all exported functions

## Phase 9: Common Patterns and Examples

### 9.1 API Integration Pattern

```typescript
import axios from "axios";

export async function callExternalAPI(endpoint: string, data: any) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY not configured");
  }

  try {
    const response = await axios.post(endpoint, data, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 second timeout
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`API call failed: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}
```

### 9.2 Resource Implementation Pattern

```typescript
export async function handleResourceList() {
  return {
    resources: [
      {
        uri: "resource://example/data",
        name: "Example Data",
        description: "Description of the resource",
        mimeType: "application/json",
      },
    ],
  };
}

export async function handleResourceRead(request: ReadResourceRequest) {
  const { uri } = request.params;

  switch (uri) {
    case "resource://example/data":
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify({ data: "example" }, null, 2),
          },
        ],
      };
    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
}
```

## CRITICAL REMINDERS FOR CODING AGENT

1. **NEVER skip the planning phase** - Always understand requirements first
2. **VALIDATE all user inputs** - Use Zod schemas everywhere
3. **TEST locally before deployment** - Run all tests and linters
4. **DOCUMENT everything** - Clear README and inline comments
5. **HANDLE errors gracefully** - Never expose internal errors to users
6. **SECURE by default** - Always use environment variables for secrets

## Final User Instructions

After implementation is complete, provide the user with:

1. **Repository location** and how to access it
2. **Local testing commands**:
   ```bash
   npm install
   npm run dev           # For development
   npm run check:all     # Run ALL checks (type, lint, format, test)
   npm run test          # Run tests
   npm run test:coverage # Run tests with coverage
   npm run typecheck     # Check TypeScript types
   npm run lint          # Check code quality
   npm run format:check  # Check formatting
   ```
3. **Railway deployment link** with step-by-step guide
4. **Claude Desktop configuration** exactly as needed
5. **Any API keys** they need to obtain
6. **Support information** for troubleshooting

Remember: The goal is a production-ready MCP server that works flawlessly on first deployment!
