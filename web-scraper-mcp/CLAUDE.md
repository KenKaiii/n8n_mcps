# MCP Development Guidelines for Create a web scraper MCP server with the following features: 1. **crawl_website** tool: - Crawl w...

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
claude mcp add feature-mcp -s user -- node /absolute/path/to/dist/index.js

# Verify it was added
claude mcp list

# IMPORTANT: Restart Claude Code for changes to take effect!
# Then verify connection with /mcp command
```

## Server Overview

**Generated from**: "Create a web scraper MCP server with the following features:

1. **crawl_website** tool:
   - Crawl websites starting from a URL with configurable depth and page limits
   - Default maxPages: 5 (adjustable)
   - Default maxDepth: 2 (adjustable)
   - Anti-blocking features: random delays (1-5 seconds), user-agent rotation, respect robots.txt
   - Support for include/exclude URL patterns
   - Stealth mode with headless browser detection bypass
   - Cookie persistence for session management
   - Exponential backoff on rate limits
   - Returns crawl ID for status tracking

2. **get_crawl_status** tool:
   - Check progress of ongoing crawls
   - Return pages crawled, pages queued, errors encountered
   - Real-time updates via SSE events

3. **extract_content** tool:
   - Convert HTML to clean Markdown
   - Use Mozilla Readability for article extraction
   - Support custom extraction selectors per domain
   - Handle JavaScript-rendered content with Playwright
   - Clean output with proper heading hierarchy
   - Extract metadata (title, author, date if available)

4. **publish_to_github** tool:
   - Upload markdown files to GitHub repository
   - Support batch uploads (multiple files in one commit)
   - Configurable repository, branch, and directory structure
   - Create directory structure based on source website hierarchy
   - Include metadata.json with crawl statistics
   - Requires GitHub personal access token

5. **configure_crawler** tool:
   - Set global crawler settings
   - Configure user agent pool
   - Set proxy settings (optional)
   - Configure rate limits and delays

Best practices implementation:

- 30+ real browser user agents rotation
- Random delays with jitter between requests
- Robots.txt parsing and compliance
- Cookie jar for session persistence
- Retry logic with exponential backoff
- Headless browser detection bypass
- Handle 429, 403, 503 errors gracefully
- Avoid honeypot links and crawler traps

The scraper should be respectful and avoid getting blocked while efficiently extracting content."

### Capabilities

- **14 Tools**: create_feature, list_features, update_feature, create_event, list_events, update_event, create_content, list_contents, update_content, create_file, list_files, update_file, convert_data, api_request
- **5 Resources**: feature List, event List, content List, file List, Configuration
- **5 Prompts**: analyze_feature, analyze_event, analyze_content, analyze_file, help

### When to Use This Server

Use this MCP server when:

- You need to create feature or event or content or file
- You need to convert feature or event or content or file
- You need to create feature or event or content or file

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

#### create_feature

**Purpose**: Create a new feature

**When to use**: Create a new feature

**Parameters**:

- `data` (object, required): Feature data

**Example usage**:

```typescript
// In your code or when calling the tool
const result = await create_feature({
  data: {},
});
```

#### list_features

**Purpose**: List all features

**When to use**: List all features

**Parameters**:

- `filter` (object, optional): Optional filter criteria

**Example usage**:

```typescript
// In your code or when calling the tool
const result = await list_features({});
```

#### update_feature

**Purpose**: Update an existing feature

**When to use**: Update an existing feature

**Parameters**:

- `id` (string, required): Feature ID
- `updates` (object, required): Fields to update

**Example usage**:

```typescript
// In your code or when calling the tool
const result = await update_feature({
  id: 'example',
  updates: {},
});
```

#### create_event

**Purpose**: Create a new event

**When to use**: Create a new event

**Parameters**:

- `data` (object, required): Event data

**Example usage**:

```typescript
// In your code or when calling the tool
const result = await create_event({
  data: {},
});
```

#### list_events

**Purpose**: List all events

**When to use**: List all events

**Parameters**:

- `filter` (object, optional): Optional filter criteria

**Example usage**:

```typescript
// In your code or when calling the tool
const result = await list_events({});
```

#### update_event

**Purpose**: Update an existing event

**When to use**: Update an existing event

**Parameters**:

- `id` (string, required): Event ID
- `updates` (object, required): Fields to update

**Example usage**:

```typescript
// In your code or when calling the tool
const result = await update_event({
  id: 'example',
  updates: {},
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
  data: {},
});
```

#### list_contents

**Purpose**: List all contents

**When to use**: List all contents

**Parameters**:

- `filter` (object, optional): Optional filter criteria

**Example usage**:

```typescript
// In your code or when calling the tool
const result = await list_contents({});
```

#### update_content

**Purpose**: Update an existing content

**When to use**: Update an existing content

**Parameters**:

- `id` (string, required): Content ID
- `updates` (object, required): Fields to update

**Example usage**:

```typescript
// In your code or when calling the tool
const result = await update_content({
  id: 'example',
  updates: {},
});
```

#### create_file

**Purpose**: Create a new file

**When to use**: Create a new file

**Parameters**:

- `data` (object, required): File data

**Example usage**:

```typescript
// In your code or when calling the tool
const result = await create_file({
  data: {},
});
```

#### list_files

**Purpose**: List all files

**When to use**: List all files

**Parameters**:

- `filter` (object, optional): Optional filter criteria

**Example usage**:

```typescript
// In your code or when calling the tool
const result = await list_files({});
```

#### update_file

**Purpose**: Update an existing file

**When to use**: Update an existing file

**Parameters**:

- `id` (string, required): File ID
- `updates` (object, required): Fields to update

**Example usage**:

```typescript
// In your code or when calling the tool
const result = await update_file({
  id: 'example',
  updates: {},
});
```

#### convert_data

**Purpose**: Convert data

**When to use**: Convert data

**Parameters**:

- `input` (object, required): Input data

**Example usage**:

```typescript
// In your code or when calling the tool
const result = await convert_data({
  input: {},
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
  endpoint: 'example',
});
```

### Resources

#### feature List

**URI**: `feature://list`
**Type**: application/json
**Description**: List of all features

**Usage**: Access this resource using the URI pattern above

#### event List

**URI**: `event://list`
**Type**: application/json
**Description**: List of all events

**Usage**: Access this resource using the URI pattern above

#### content List

**URI**: `content://list`
**Type**: application/json
**Description**: List of all contents

**Usage**: Access this resource using the URI pattern above

#### file List

**URI**: `file://list`
**Type**: application/json
**Description**: List of all files

**Usage**: Access this resource using the URI pattern above

#### Configuration

**URI**: `config://settings`
**Type**: application/json
**Description**: Server configuration and settings

**Usage**: Access this resource using the URI pattern above

### Prompts

#### analyze_feature

**Description**: Analyze feature data and provide insights

**Arguments**:

- `context` (optional): Analysis context

#### analyze_event

**Description**: Analyze event data and provide insights

**Arguments**:

- `context` (optional): Analysis context

#### analyze_content

**Description**: Analyze content data and provide insights

**Arguments**:

- `context` (optional): Analysis context

#### analyze_file

**Description**: Analyze file data and provide insights

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
feature-mcp/
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
