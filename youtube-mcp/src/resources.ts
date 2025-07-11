/**
 * YouTube Analyzer Resource implementations
 * Provides access to analysis history, quota status, and configuration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
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

// In-memory storage for analysis results (in production, consider using a database)
interface AnalysisRecord {
  id: string;
  videoIdea: string;
  timestamp: string;
  results: any;
  quotaUsed: number;
}

const analysisHistory: AnalysisRecord[] = [];
let totalQuotaUsed = 0;

/**
 * Sets up YouTube Analyzer resource handlers
 * @param server - The MCP server instance to configure
 */
export function setupResources(server: Server) {
  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    logger.info('Listing available resources');
    return {
      resources: [
        {
          uri: 'youtube://analysis-history',
          name: 'Analysis History',
          description: 'History of video idea analyses performed',
          mimeType: 'application/json',
        },
        {
          uri: 'youtube://quota-status',
          name: 'Quota Status',
          description: 'Current YouTube API quota usage and limits',
          mimeType: 'application/json',
        },
        {
          uri: 'youtube://trending-topics',
          name: 'Trending Topics',
          description: 'Currently trending video topics and keywords',
          mimeType: 'application/json',
        },
        {
          uri: 'youtube://performance-metrics',
          name: 'Performance Metrics',
          description: 'Server performance and analysis statistics',
          mimeType: 'application/json',
        },
        {
          uri: 'config://settings',
          name: 'Configuration',
          description: 'Server configuration and API settings',
          mimeType: 'application/json',
        },
      ],
    };
  });

  // Read resource content
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    try {
      logger.info('Reading resource', { uri });
      
      switch (uri) {
        case 'youtube://analysis-history':
          return await readAnalysisHistory();
        case 'youtube://quota-status':
          return await readQuotaStatus();
        case 'youtube://trending-topics':
          return await readTrendingTopics();
        case 'youtube://performance-metrics':
          return await readPerformanceMetrics();
        case 'config://settings':
          return await readConfiguration();
        default:
          logger.warn('Unknown resource requested', { uri });
          throw new Error(`Unknown resource: ${uri}`);
      }
    } catch (error) {
      logger.error('Failed to read resource', {
        uri,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Failed to read resource: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

/**
 * Reads analysis history from in-memory storage
 * @returns Analysis history data
 */
async function readAnalysisHistory() {
  try {
    const recentAnalyses = analysisHistory
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50); // Last 50 analyses
    
    logger.info('Retrieved analysis history', { count: recentAnalyses.length });
    
    return {
      contents: [
        {
          uri: 'youtube://analysis-history',
          mimeType: 'application/json',
          text: JSON.stringify({
            totalAnalyses: analysisHistory.length,
            recentAnalyses,
            lastUpdated: new Date().toISOString()
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to read analysis history', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Reads current quota status
 * @returns Quota usage information
 */
async function readQuotaStatus() {
  try {
    const quotaData = {
      dailyLimit: 10000,
      currentUsage: totalQuotaUsed,
      remainingQuota: Math.max(0, 10000 - totalQuotaUsed),
      usagePercentage: Math.round((totalQuotaUsed / 10000) * 100),
      resetTime: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    logger.info('Retrieved quota status', quotaData);
    
    return {
      contents: [
        {
          uri: 'youtube://quota-status',
          mimeType: 'application/json',
          text: JSON.stringify(quotaData, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to read quota status', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Reads trending topics based on recent analyses
 * @returns Trending topics data
 */
async function readTrendingTopics() {
  try {
    const recentIdeas = analysisHistory
      .filter(record => {
        const recordDate = new Date(record.timestamp);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return recordDate > weekAgo;
      })
      .map(record => record.videoIdea.toLowerCase())
      .reduce((acc: { [key: string]: number }, idea) => {
        acc[idea] = (acc[idea] || 0) + 1;
        return acc;
      }, {});
    
    const trending = Object.entries(recentIdeas)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([idea, count]) => ({ idea, searches: count }));
    
    logger.info('Retrieved trending topics', { topicCount: trending.length });
    
    return {
      contents: [
        {
          uri: 'youtube://trending-topics',
          mimeType: 'application/json',
          text: JSON.stringify({
            trendingTopics: trending,
            period: 'last 7 days',
            lastUpdated: new Date().toISOString()
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to read trending topics', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Reads server performance metrics
 * @returns Performance statistics
 */
async function readPerformanceMetrics() {
  try {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    const metrics = {
      uptime: {
        seconds: Math.floor(uptime),
        humanReadable: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
      },
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
        external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100
      },
      analytics: {
        totalAnalyses: analysisHistory.length,
        totalQuotaUsed,
        averageQuotaPerAnalysis: analysisHistory.length > 0 ? Math.round(totalQuotaUsed / analysisHistory.length) : 0
      },
      lastUpdated: new Date().toISOString()
    };
    
    logger.info('Retrieved performance metrics', { 
      uptime: metrics.uptime.humanReadable,
      memoryUsed: metrics.memory.heapUsed
    });
    
    return {
      contents: [
        {
          uri: 'youtube://performance-metrics',
          mimeType: 'application/json',
          text: JSON.stringify(metrics, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to read performance metrics', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Reads server configuration settings
 * @returns Configuration data
 */
async function readConfiguration() {
  try {
    const config = {
      server: {
        name: 'youtube-analyzer-mcp',
        version: '1.0.0',
        capabilities: ['tools', 'resources', 'prompts']
      },
      api: {
        youtubeDataApi: {
          dailyQuotaLimit: 10000,
          searchCostPerRequest: 100,
          detailsCostPerRequest: 1,
          maxResultsPerSearch: 25
        },
        rateLimit: {
          requestsPerMinute: 100,
          burstLimit: 10
        }
      },
      analysis: {
        defaultMinViewCount: 10000,
        maxDaysBack: 30,
        defaultMaxResults: 10,
        semanticVariationsCount: 10
      },
      caching: {
        enabled: false,
        ttlMinutes: 60,
        maxCacheSize: 1000
      },
      lastUpdated: new Date().toISOString()
    };
    
    logger.info('Retrieved configuration');
    
    return {
      contents: [
        {
          uri: 'config://settings',
          mimeType: 'application/json',
          text: JSON.stringify(config, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to read configuration', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Converts a string to PascalCase
 * @param str - The string to convert
 * @returns PascalCase version of the string
 */
function toPascalCase(str: string): string {
  return str
    .split(/[_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Records an analysis result for history tracking
 * @param videoIdea - The video idea that was analyzed
 * @param results - The analysis results
 * @param quotaUsed - Amount of quota consumed
 */
export function recordAnalysis(videoIdea: string, results: any, quotaUsed: number): void {
  try {
    const record: AnalysisRecord = {
      id: `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      videoIdea,
      timestamp: new Date().toISOString(),
      results,
      quotaUsed
    };
    
    analysisHistory.push(record);
    totalQuotaUsed += quotaUsed;
    
    // Keep only last 1000 records to prevent memory issues
    if (analysisHistory.length > 1000) {
      analysisHistory.shift();
    }
    
    logger.info('Recorded analysis', {
      id: record.id,
      videoIdea,
      quotaUsed,
      totalQuotaUsed
    });
  } catch (error) {
    logger.error('Failed to record analysis', {
      videoIdea,
      quotaUsed,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
