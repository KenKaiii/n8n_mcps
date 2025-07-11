/**
 * YouTube Analyzer Prompt implementations
 * Provides intelligent prompts for video analysis and content optimization
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Production logger - MUST use stderr for MCP servers
const logger = {
  error: (message: string, context?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} ${message}`, context ? JSON.stringify(context) : '');
  },
  warn: (message: string, context?: any) => {
    console.error(`[WARN] ${new Date().toISOString()} ${message}`, context ? JSON.stringify(context) : '');
  },
  info: (message: string, context?: any) => {
    console.error(`[INFO] ${new Date().toISOString()} ${message}`, context ? JSON.stringify(context) : '');
  }
};

/**
 * Sets up YouTube Analyzer prompt handlers
 * @param server - The MCP server instance to configure
 */
export function setupPrompts(server: Server) {
  // List available prompts
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    logger.info('Listing available prompts');
    return {
      prompts: [
        {
          name: 'analyze_video_performance',
          description: 'Analyze video performance metrics and suggest optimizations',
          arguments: [
            {
              name: 'videoIdea',
              description: 'The video idea or topic to analyze',
              required: true,
            },
            {
              name: 'targetAudience',
              description: 'Target audience for the video',
              required: false,
            },
          ],
        },
        {
          name: 'optimize_title',
          description: 'Generate optimized video titles based on successful patterns',
          arguments: [
            {
              name: 'currentTitle',
              description: 'Current video title to optimize',
              required: true,
            },
            {
              name: 'videoTopic',
              description: 'Main topic of the video',
              required: false,
            },
          ],
        },
        {
          name: 'thumbnail_suggestions',
          description: 'Provide thumbnail design suggestions based on high-performing videos',
          arguments: [
            {
              name: 'videoTopic',
              description: 'Topic of the video',
              required: true,
            },
            {
              name: 'style',
              description: 'Preferred thumbnail style',
              required: false,
            },
          ],
        },
        {
          name: 'analyze_goal',
          description: 'Analyze goal data and provide insights',
          arguments: [
            {
              name: 'context',
              description: 'Analysis context',
              required: false,
            },
          ],
        },
        {
          name: 'help',
          description: 'Get help with using this MCP server',
        },
      ],
    };
  });

  // Get prompt content
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      logger.info('Getting prompt', { name, hasArgs: !!args });
      
      switch (name) {
        case 'analyze_video_performance':
          return getAnalyzeVideoPerformancePrompt(args);
        case 'optimize_title':
          return getOptimizeTitlePrompt(args);
        case 'thumbnail_suggestions':
          return getThumbnailSuggestionsPrompt(args);
        case 'analyze_goal':
          return getAnalyzeGoalPrompt(args);
        case 'help':
          return getHelpPrompt(args);
        default:
          logger.warn('Unknown prompt requested', { name });
          throw new Error(`Unknown prompt: ${name}`);
      }
    } catch (error) {
      logger.error('Failed to get prompt', {
        name,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Failed to get prompt: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

/**
 * Generates prompt for analyzing video performance
 */
function getAnalyzeVideoPerformancePrompt(args?: Record<string, any>) {
  const videoIdea = args?.videoIdea || 'your video idea';
  const targetAudience = args?.targetAudience || 'general audience';
  
  const content = `Analyze the performance potential for a video about "${videoIdea}" targeting ${targetAudience}.

Based on current YouTube trends and high-performing videos in this niche:
1. What are the key success factors for this type of content?
2. What title patterns work best for this topic?
3. What thumbnail elements drive the most clicks?
4. What's the optimal video length for this content type?
5. What related topics should be covered to maximize engagement?

Provide specific, actionable recommendations based on data from similar successful videos.`;
  
  return {
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: content,
        },
      },
    ],
  };
}

/**
 * Generates prompt for optimizing video titles
 */
function getOptimizeTitlePrompt(args?: Record<string, any>) {
  const currentTitle = args?.currentTitle || 'My Video Title';
  const videoTopic = args?.videoTopic || 'the main topic';
  
  const content = `Optimize this YouTube video title: "${currentTitle}"

The video is about: ${videoTopic}

Based on high-performing videos in this niche:
1. Suggest 5 optimized title variations that follow successful patterns
2. Explain why each title would perform better
3. Include power words and emotional triggers that work for this topic
4. Keep titles under 60 characters for optimal display
5. Consider SEO keywords while maintaining click appeal

Provide titles that balance searchability with click-through rate optimization.`;
  
  return {
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: content,
        },
      },
    ],
  };
}

/**
 * Generates prompt for thumbnail design suggestions
 */
function getThumbnailSuggestionsPrompt(args?: Record<string, any>) {
  const videoTopic = args?.videoTopic || 'your video topic';
  const style = args?.style || 'engaging and clickable';
  
  const content = `Provide thumbnail design suggestions for a video about "${videoTopic}" in a ${style} style.

Based on analysis of high-performing thumbnails in this niche:
1. What visual elements should be included?
2. What color schemes work best for this topic?
3. How should text be incorporated (if at all)?
4. What facial expressions or emotions drive clicks?
5. What composition/layout patterns are most effective?

Provide specific, implementable design recommendations with examples from successful videos.`;
  
  
  return {
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: content,
        },
      },
    ],
  };
}

function getAnalyzeGoalPrompt(args?: Record<string, any>) {
  // Generate prompt content
  let content = `Please analyze the goal data and provide insights based on the following context: {{context}}`;
  
  
  return {
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: content,
        },
      },
    ],
  };
}

function getHelpPrompt(args?: Record<string, any>) {
  // Generate prompt content
  let content = `This MCP server helps with API integration. Available operations: create`;
  
  
  return {
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: content,
        },
      },
    ],
  };
}
