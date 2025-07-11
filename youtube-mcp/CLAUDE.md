# MCP Development Guidelines for Create a YouTube analysis MCP server that takes a video idea as input and returns 10 high-perform...

This file contains comprehensive instructions for developing, testing, and using this MCP server with Claude.

## Quick Start

### Initial Setup (First Time Only)
```bash
# 1. Install dependencies
npm install

# 2. Build the TypeScript project
npm run build

# 3. Test the server works
npm run dev
```

### Adding to Claude Code
```bash
# Add the MCP server (global access - recommended)
claude mcp add data-mcp -s user -- node /absolute/path/to/dist/index.js

# Verify it was added
claude mcp list

# IMPORTANT: Restart Claude Code for changes to take effect!
# Then verify connection with /mcp command
```

## Server Overview

**Generated from**: "Create a YouTube analysis MCP server that takes a video idea as input and returns 10 high-performing video titles with their thumbnails. The server should:

1. Accept a video idea (e.g., "video automation") as input
2. Use YouTube Data API v3 to search for related videos
3. Apply semantic search to find broader relevant content beyond exact matches
4. Filter results to only include videos from the last 30 days maximum
5. Only consider high-performing videos (configurable minimum view count thresholds)
6. Manage API quota efficiently (YouTube allows 10,000 units/day)
7. Extract thumbnail URLs using both API and direct URL patterns
8. Rank results by performance metrics (views, engagement, recency)
9. Return top 10 results with: title, thumbnail URL, performance metrics, publish date
10. Provide tools for video idea analysis and title/thumbnail recommendations

The goal is to help content creators find proven, successful title and thumbnail combinations from recent high-performing videos that they can adapt for their own content ideas."

### Capabilities
- **7 Tools**: create_data, create_search, create_content, create_goal, filter_data, manage_data, api_request
- **5 Resources**: data List, search List, content List, goal List, Configuration
- **5 Prompts**: analyze_data, analyze_search, analyze_content, analyze_goal, help

### When to Use This Server
Use this MCP server when:
- You need to create data or search or content or goal
- You need to search data or search or content or goal
- You need to search data or search or content or goal
- You need to filter data or search or content or goal
- You need to manage data or search or content or goal

## Development Workflow

### Making Changes

1. **Edit the source files**:
   - `src/tools.ts` - Tool implementations
   - `src/resources.ts` - Resource handlers  
   - `src/prompts.ts` - Prompt templates
   - `src/types.ts` - TypeScript interfaces

2. **Build after changes**:
   ```bash
   npm run build
   ```

3. **Test your changes**:
   ```bash
   # Run in development mode (auto-reload)
   npm run dev
   
   # Run tests
   npm test
   ```

4. **CRITICAL: Restart Claude Code**:
   - Exit Claude Code completely
   - Start Claude Code again
   - Use `claude --continue` to resume your session

### Important Notes
⚠️ **Changes will NOT take effect until Claude Code is restarted!**
⚠️ **Always build (`npm run build`) before restarting Claude Code**

## MCP Management Commands

### Essential Commands
```bash
# List all MCP servers and their status
claude mcp list

# Add an MCP server (global - works from any directory)
claude mcp add <name> -s user <command>

# Add an MCP server (local - only works in current directory)  
claude mcp add <name> <command>

# Remove an MCP server
claude mcp remove <name>

# Continue previous conversation after restart
claude --continue
```

### Connection Verification
After adding or modifying the MCP:
1. Run `claude mcp list` - should show "Active ✓"
2. In Claude, type `/mcp` - should show connected servers
3. If status shows "Failed ✗", check the debugging section

## API Reference

### Tools

#### create_data
**Purpose**: Create a new data

**When to use**: Create a new data

**Parameters**:
- `data` (object, required): Data data

**Example usage**:
```typescript
// In your code or when calling the tool
const result = await create_data({
  data: {}
});
```

#### create_search
**Purpose**: Create a new search

**When to use**: Create a new search

**Parameters**:
- `data` (object, required): Search data

**Example usage**:
```typescript
// In your code or when calling the tool
const result = await create_search({
  data: {}
});
```

#### create_content
**Purpose**: Create a new content

**When to use**: Create a new content

**Parameters**:
- `data` (object, required): Content data

**Example usage**:
```typescript
// In your code or when calling the tool
const result = await create_content({
  data: {}
});
```

#### create_goal
**Purpose**: Create a new goal

**When to use**: Create a new goal

**Parameters**:
- `data` (object, required): Goal data

**Example usage**:
```typescript
// In your code or when calling the tool
const result = await create_goal({
  data: {}
});
```

#### filter_data
**Purpose**: Filter data

**When to use**: Filter data

**Parameters**:
- `input` (object, required): Input data

**Example usage**:
```typescript
// In your code or when calling the tool
const result = await filter_data({
  input: {}
});
```

#### manage_data
**Purpose**: Manage data

**When to use**: Manage data

**Parameters**:
- `input` (object, required): Input data

**Example usage**:
```typescript
// In your code or when calling the tool
const result = await manage_data({
  input: {}
});
```

#### api_request
**Purpose**: Make an API request

**When to use**: Make an API request

**Parameters**:
- `endpoint` (string, required): API endpoint
- `method` (string, optional): HTTP method (GET, POST, PUT, DELETE)
- `data` (object, optional): Request data

**Example usage**:
```typescript
// In your code or when calling the tool
const result = await api_request({
  endpoint: "example"
});
```


### Resources

#### data List
**URI**: `data://list`
**Type**: application/json
**Description**: List of all datas

**Usage**: Access this resource using the URI pattern above

#### search List
**URI**: `search://list`
**Type**: application/json
**Description**: List of all searchs

**Usage**: Access this resource using the URI pattern above

#### content List
**URI**: `content://list`
**Type**: application/json
**Description**: List of all contents

**Usage**: Access this resource using the URI pattern above

#### goal List
**URI**: `goal://list`
**Type**: application/json
**Description**: List of all goals

**Usage**: Access this resource using the URI pattern above

#### Configuration
**URI**: `config://settings`
**Type**: application/json
**Description**: Server configuration and settings

**Usage**: Access this resource using the URI pattern above


### Prompts

#### analyze_data
**Description**: Analyze data data and provide insights

**Arguments**:
- `context` (optional): Analysis context

#### analyze_search
**Description**: Analyze search data and provide insights

**Arguments**:
- `context` (optional): Analysis context

#### analyze_content
**Description**: Analyze content data and provide insights

**Arguments**:
- `context` (optional): Analysis context

#### analyze_goal
**Description**: Analyze goal data and provide insights

**Arguments**:
- `context` (optional): Analysis context

#### help
**Description**: Get help with using this MCP server



## Implementation Guidelines

### TypeScript Best Practices
- Use proper typing for all parameters and return values
- Handle errors gracefully with try-catch blocks
- Validate inputs before processing
- Use async/await for asynchronous operations

### Adding New Features

1. **Add a new tool**:
   - Edit `src/tools.ts`
   - Define the tool function with proper TypeScript types
   - Register it with `setupTools()`

2. **Add a new resource**:
   - Edit `src/resources.ts`
   - Define the resource handler
   - Register it with `setupResources()`

3. **Add a new prompt**:
   - Edit `src/prompts.ts`
   - Define the prompt template
   - Register it with `setupPrompts()`

### Example Tool Implementation
```typescript
// In src/tools.ts
async function myNewTool(params: { input: string }): Promise<string> {
  // Validate input
  if (!params.input) {
    throw new Error('Input is required');
  }
  
  // Process the request
  const result = await processInput(params.input);
  
  // Return the result
  return JSON.stringify({ success: true, data: result });
}
```

## Debugging & Troubleshooting

### Common Issues

1. **MCP shows as "Failed ✗"**:
   - Check build output: `npm run build`
   - Look for TypeScript errors
   - Ensure all dependencies are installed: `npm install`

2. **Changes not taking effect**:
   - Did you run `npm run build`?
   - Did you restart Claude Code?
   - Check the built files exist in `dist/`

3. **Connection errors**:
   - Verify absolute path in claude mcp add command
   - Check Node.js is installed: `node --version`
   - Try running directly: `node dist/index.js`

### Debug Commands
```bash
# Check if the server runs without errors
node dist/index.js

# Check TypeScript compilation
npx tsc --noEmit

# Run tests to verify functionality  
npm test

# Check for build errors
npm run build -- --verbose
```

### Logging
- Server logs are sent to stderr
- Check Claude Code logs for MCP errors
- Add console.error() for debugging (goes to stderr)

## Project Structure

```
data-mcp/
├── src/
│   ├── index.ts      # Main server entry point
│   ├── tools.ts      # Tool implementations  
│   ├── resources.ts  # Resource handlers
│   ├── prompts.ts    # Prompt templates
│   └── types.ts      # TypeScript interfaces
├── dist/             # Compiled JavaScript (generated)
├── test/
│   └── server.test.ts # Test suite
├── package.json      # Dependencies and scripts
├── tsconfig.json     # TypeScript configuration
├── jest.config.js    # Test configuration
└── CLAUDE.md         # This file
```

## Best Practices

1. **Always validate inputs** - Check for required parameters
2. **Handle errors gracefully** - Return meaningful error messages
3. **Use TypeScript types** - Define interfaces for complex data
4. **Test thoroughly** - Run tests before committing changes
5. **Document changes** - Update this file when adding features

## Need Help?

1. Check the generated test file for usage examples
2. Look at the TypeScript interfaces in `src/types.ts`
3. Run `npm test` to see expected behavior
4. Check Claude Code logs for detailed error messages

---

Generated by KEN-MCP TypeScript | Powered by MCP SDK
