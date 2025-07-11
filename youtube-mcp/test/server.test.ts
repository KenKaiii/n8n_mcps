/**
 * Tests for MCP server for: Create a YouTube analysis MCP server that takes a video idea as input and returns 10 high-perform...
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { setupTools } from '../src/tools.js';
import { setupResources } from '../src/resources.js';
import { setupPrompts } from '../src/prompts.js';

describe('MCP Server Tests', () => {
  let server: Server;
  let client: Client;
  let clientTransport: InMemoryTransport;
  let serverTransport: InMemoryTransport;

  beforeEach(async () => {
    // Create linked transport pair
    [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    // Create server instance
    server = new Server(
      {
        name: 'test-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    // Set up server components
    setupTools(server);
    setupResources(server);
    setupPrompts(server);

    // Create client instance
    client = new Client(
      {
        name: 'test-client',
        version: '1.0.0',
      },
      {
        capabilities: {}
      }
    );

    // Connect both server and client
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
    await server.close();
  });

  describe('Server Initialization', () => {
    it('should initialize successfully', () => {
      expect(server).toBeDefined();
      expect(client).toBeDefined();
    });

    it('should have correct capabilities', () => {
      const serverCapabilities = client.getServerCapabilities();
      expect(serverCapabilities).toBeDefined();
      expect(serverCapabilities?.tools).toBeDefined();
      expect(serverCapabilities?.resources).toBeDefined();
      expect(serverCapabilities?.prompts).toBeDefined();
    });
  });


  describe('Tools', () => {
    it('should list all tools', async () => {
      const response = await client.listTools();

      expect(response.tools).toBeDefined();
      expect(response.tools.length).toBe(7);
      
      const toolNames = response.tools.map((t: any) => t.name);
      expect(toolNames).toContain('create_data');
      expect(toolNames).toContain('create_search');
      expect(toolNames).toContain('create_content');
      expect(toolNames).toContain('create_goal');
      expect(toolNames).toContain('filter_data');
      expect(toolNames).toContain('manage_data');
      expect(toolNames).toContain('api_request');
    });


    describe('create_data', () => {
      it('should execute successfully with valid parameters', async () => {
        const response = await client.callTool({
          name: 'create_data',
          arguments: {
            data: { test: true },
          },
        });

        expect(response.content).toBeDefined();
        expect(response.content[0].type).toBe('text');
      });

      it('should fail with missing required parameters', async () => {
        await expect(
          client.callTool({
            name: 'create_data',
            arguments: {},
          })
        ).rejects.toThrow();
      });
    });

    describe('create_search', () => {
      it('should execute successfully with valid parameters', async () => {
        const response = await client.callTool({
          name: 'create_search',
          arguments: {
            data: { test: true },
          },
        });

        expect(response.content).toBeDefined();
        expect(response.content[0].type).toBe('text');
      });

      it('should fail with missing required parameters', async () => {
        await expect(
          client.callTool({
            name: 'create_search',
            arguments: {},
          })
        ).rejects.toThrow();
      });
    });

    describe('create_content', () => {
      it('should execute successfully with valid parameters', async () => {
        const response = await client.callTool({
          name: 'create_content',
          arguments: {
            data: { test: true },
          },
        });

        expect(response.content).toBeDefined();
        expect(response.content[0].type).toBe('text');
      });

      it('should fail with missing required parameters', async () => {
        await expect(
          client.callTool({
            name: 'create_content',
            arguments: {},
          })
        ).rejects.toThrow();
      });
    });

    describe('create_goal', () => {
      it('should execute successfully with valid parameters', async () => {
        const response = await client.callTool({
          name: 'create_goal',
          arguments: {
            data: { test: true },
          },
        });

        expect(response.content).toBeDefined();
        expect(response.content[0].type).toBe('text');
      });

      it('should fail with missing required parameters', async () => {
        await expect(
          client.callTool({
            name: 'create_goal',
            arguments: {},
          })
        ).rejects.toThrow();
      });
    });

    describe('filter_data', () => {
      it('should execute successfully with valid parameters', async () => {
        const response = await client.callTool({
          name: 'filter_data',
          arguments: {
            input: { test: true },
          },
        });

        expect(response.content).toBeDefined();
        expect(response.content[0].type).toBe('text');
      });

      it('should fail with missing required parameters', async () => {
        await expect(
          client.callTool({
            name: 'filter_data',
            arguments: {},
          })
        ).rejects.toThrow();
      });
    });

    describe('manage_data', () => {
      it('should execute successfully with valid parameters', async () => {
        const response = await client.callTool({
          name: 'manage_data',
          arguments: {
            input: { test: true },
          },
        });

        expect(response.content).toBeDefined();
        expect(response.content[0].type).toBe('text');
      });

      it('should fail with missing required parameters', async () => {
        await expect(
          client.callTool({
            name: 'manage_data',
            arguments: {},
          })
        ).rejects.toThrow();
      });
    });

    describe('api_request', () => {
      it('should execute successfully with valid parameters', async () => {
        const response = await client.callTool({
          name: 'api_request',
          arguments: {
            endpoint: 'test-value',
          },
        });

        expect(response.content).toBeDefined();
        expect(response.content[0].type).toBe('text');
      });

      it('should fail with missing required parameters', async () => {
        await expect(
          client.callTool({
            name: 'api_request',
            arguments: {},
          })
        ).rejects.toThrow();
      });
    });
  });

  describe('Resources', () => {
    it('should list all resources', async () => {
      const response = await client.listResources();

      expect(response.resources).toBeDefined();
      expect(response.resources.length).toBe(5);
      
      const resourceUris = response.resources.map((r: any) => r.uri);
      expect(resourceUris).toContain('data://list');
      expect(resourceUris).toContain('search://list');
      expect(resourceUris).toContain('content://list');
      expect(resourceUris).toContain('goal://list');
      expect(resourceUris).toContain('config://settings');
    });


    it('should read data List resource', async () => {
      const response = await client.readResource({
        uri: 'data://list',
      });

      expect(response.contents).toBeDefined();
      expect(response.contents.length).toBeGreaterThan(0);
      expect(response.contents[0].uri).toBe('data://list');
      expect(response.contents[0].mimeType).toBe('application/json');
    });

    it('should read search List resource', async () => {
      const response = await client.readResource({
        uri: 'search://list',
      });

      expect(response.contents).toBeDefined();
      expect(response.contents.length).toBeGreaterThan(0);
      expect(response.contents[0].uri).toBe('search://list');
      expect(response.contents[0].mimeType).toBe('application/json');
    });

    it('should read content List resource', async () => {
      const response = await client.readResource({
        uri: 'content://list',
      });

      expect(response.contents).toBeDefined();
      expect(response.contents.length).toBeGreaterThan(0);
      expect(response.contents[0].uri).toBe('content://list');
      expect(response.contents[0].mimeType).toBe('application/json');
    });

    it('should read goal List resource', async () => {
      const response = await client.readResource({
        uri: 'goal://list',
      });

      expect(response.contents).toBeDefined();
      expect(response.contents.length).toBeGreaterThan(0);
      expect(response.contents[0].uri).toBe('goal://list');
      expect(response.contents[0].mimeType).toBe('application/json');
    });

    it('should read Configuration resource', async () => {
      const response = await client.readResource({
        uri: 'config://settings',
      });

      expect(response.contents).toBeDefined();
      expect(response.contents.length).toBeGreaterThan(0);
      expect(response.contents[0].uri).toBe('config://settings');
      expect(response.contents[0].mimeType).toBe('application/json');
    });
  });

  describe('Prompts', () => {
    it('should list all prompts', async () => {
      const response = await client.listPrompts();

      expect(response.prompts).toBeDefined();
      expect(response.prompts.length).toBe(5);
      
      const promptNames = response.prompts.map((p: any) => p.name);
      expect(promptNames).toContain('analyze_data');
      expect(promptNames).toContain('analyze_search');
      expect(promptNames).toContain('analyze_content');
      expect(promptNames).toContain('analyze_goal');
      expect(promptNames).toContain('help');
    });


    it('should get analyze_data prompt', async () => {
      const response = await client.getPrompt({
        name: 'analyze_data',
        arguments: {
          context: undefined,
        },
      });

      expect(response.messages).toBeDefined();
      expect(response.messages.length).toBeGreaterThan(0);
      expect(response.messages[0].content.text).toContain('Please analyze the d');
    });

    it('should get analyze_search prompt', async () => {
      const response = await client.getPrompt({
        name: 'analyze_search',
        arguments: {
          context: undefined,
        },
      });

      expect(response.messages).toBeDefined();
      expect(response.messages.length).toBeGreaterThan(0);
      expect(response.messages[0].content.text).toContain('Please analyze the s');
    });

    it('should get analyze_content prompt', async () => {
      const response = await client.getPrompt({
        name: 'analyze_content',
        arguments: {
          context: undefined,
        },
      });

      expect(response.messages).toBeDefined();
      expect(response.messages.length).toBeGreaterThan(0);
      expect(response.messages[0].content.text).toContain('Please analyze the c');
    });

    it('should get analyze_goal prompt', async () => {
      const response = await client.getPrompt({
        name: 'analyze_goal',
        arguments: {
          context: undefined,
        },
      });

      expect(response.messages).toBeDefined();
      expect(response.messages.length).toBeGreaterThan(0);
      expect(response.messages[0].content.text).toContain('Please analyze the g');
    });

    it('should get help prompt', async () => {
      const response = await client.getPrompt({
        name: 'help',
        
      });

      expect(response.messages).toBeDefined();
      expect(response.messages.length).toBeGreaterThan(0);
      expect(response.messages[0].content.text).toContain('This MCP server help');
    });
  });
});
