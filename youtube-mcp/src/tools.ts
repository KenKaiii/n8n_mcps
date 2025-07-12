/**
 * Tool implementations for YouTube Analysis MCP
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as natural from 'natural';
import nlp from 'compromise';

// Simple logger for production monitoring - MUST use stderr for MCP servers
const logger = {
  error: (message: string, context?: any) => {
    console.error(`[ERROR] ${message}`, context ? JSON.stringify(context) : '');
  },
  warn: (message: string, context?: any) => {
    console.error(`[WARN] ${message}`, context ? JSON.stringify(context) : '');
  },
  info: (message: string, context?: any) => {
    console.error(`[INFO] ${message}`, context ? JSON.stringify(context) : '');
  }
};

interface YouTubeVideo {
  title: string;
  videoId: string;
  thumbnail: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt: string;
  channelTitle: string;
  duration: string;
  // Calculated metrics
  engagementRate?: number;
  viewsPerDay?: number;
}

interface AnalysisResult {
  videos: YouTubeVideo[];
  totalResults: number;
  quotaUsed: number;
  searchTerms: string[];
}

// Configuration from environment variables (set by Claude Desktop)
const config = {
  youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
  minViewCount: parseInt(process.env.MIN_VIEW_COUNT || '10000'),
  maxResults: parseInt(process.env.MAX_RESULTS || '10'),
  cacheTtl: parseInt(process.env.CACHE_TTL || '15') * 60 * 1000 // Convert to milliseconds
};

class QuotaManager {
  private dailyQuota = 10000;
  private usedQuota = 0;
  private lastResetDate = new Date().toDateString();

  checkQuota(requiredQuota: number): boolean {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.usedQuota = 0;
      this.lastResetDate = today;
    }
    return (this.usedQuota + requiredQuota) <= this.dailyQuota;
  }

  useQuota(amount: number): void {
    this.usedQuota += amount;
  }

  getRemainingQuota(): number {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.usedQuota = 0;
      this.lastResetDate = today;
    }
    return this.dailyQuota - this.usedQuota;
  }
}

const quotaManager = new QuotaManager();

// Simple caching mechanism
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 100;

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: any, ttlMinutes: number = 60): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

const cache = new SimpleCache();

// Rate limiting mechanism
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 60, windowMinutes: number = 1) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMinutes * 60 * 1000;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    // Remove old requests outside the window
    this.requests = this.requests.filter(timestamp => now - timestamp < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      return false;
    }

    this.requests.push(now);
    return true;
  }

  getRemainingRequests(): number {
    const now = Date.now();
    this.requests = this.requests.filter(timestamp => now - timestamp < this.windowMs);
    return Math.max(0, this.maxRequests - this.requests.length);
  }

  getResetTime(): Date {
    if (this.requests.length === 0) {
      return new Date();
    }
    const oldestRequest = Math.min(...this.requests);
    return new Date(oldestRequest + this.windowMs);
  }
}

const rateLimiter = new RateLimiter(50, 1); // 50 requests per minute

// Retry logic with exponential backoff
class RetryHandler {
  private readonly maxRetries: number;
  private readonly baseDelay: number;
  private readonly maxDelay: number;

  constructor(maxRetries: number = 3, baseDelay: number = 1000, maxDelay: number = 10000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
  }

  async execute<T>(fn: () => Promise<T>, context: string): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt === this.maxRetries) {
          logger.error(`Max retries reached for ${context}`, {
            attempts: attempt + 1,
            error: lastError.message
          });
          break;
        }

        const delay = Math.min(this.baseDelay * Math.pow(2, attempt), this.maxDelay);
        logger.warn(`Retry attempt ${attempt + 1} for ${context}`, {
          delay,
          error: lastError.message
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error(`Failed after ${this.maxRetries + 1} attempts`);
  }
}

// Circuit breaker pattern
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private readonly threshold: number;
  private readonly timeout: number;
  private readonly resetTimeout: number;

  constructor(threshold: number = 5, timeout: number = 60000, resetTimeout: number = 30000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.resetTimeout = resetTimeout;
  }

  async execute<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T> {
    if (this.state === 'open') {
      const now = Date.now();
      if (now - this.lastFailTime > this.timeout) {
        logger.info('Circuit breaker entering half-open state');
        this.state = 'half-open';
      } else {
        logger.warn('Circuit breaker is open, using fallback');
        if (fallback) {
          return fallback();
        }
        throw new Error('Service temporarily unavailable - circuit breaker is open');
      }
    }

    try {
      const result = await fn();

      if (this.state === 'half-open') {
        logger.info('Circuit breaker closing after successful request');
        this.state = 'closed';
        this.failures = 0;
      }

      return result;
    } catch (error) {
      this.failures++;
      this.lastFailTime = Date.now();

      if (this.failures >= this.threshold) {
        logger.error('Circuit breaker opening due to excessive failures', {
          failures: this.failures,
          threshold: this.threshold
        });
        this.state = 'open';

        // Schedule automatic reset
        setTimeout(() => {
          logger.info('Circuit breaker auto-reset to half-open');
          this.state = 'half-open';
        }, this.resetTimeout);
      }

      throw error;
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.lastFailTime = 0;
    logger.info('Circuit breaker manually reset');
  }
}

const retryHandler = new RetryHandler();
const circuitBreaker = new CircuitBreaker();

// Metrics collection
class MetricsCollector {
  private metrics = {
    requests: {
      total: 0,
      successful: 0,
      failed: 0,
      cached: 0
    },
    performance: {
      avgResponseTime: 0,
      totalResponseTime: 0,
      slowestRequest: 0,
      fastestRequest: Number.MAX_VALUE
    },
    errors: new Map<string, number>(),
    quotaUsage: {
      total: 0,
      byOperation: new Map<string, number>()
    }
  };

  recordRequest(success: boolean, responseTime: number, cached: boolean = false): void {
    this.metrics.requests.total++;

    if (cached) {
      this.metrics.requests.cached++;
    } else if (success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    if (!cached && responseTime > 0) {
      this.metrics.performance.totalResponseTime += responseTime;
      this.metrics.performance.avgResponseTime =
        this.metrics.performance.totalResponseTime /
        (this.metrics.requests.successful + this.metrics.requests.failed);

      if (responseTime > this.metrics.performance.slowestRequest) {
        this.metrics.performance.slowestRequest = responseTime;
      }
      if (responseTime < this.metrics.performance.fastestRequest) {
        this.metrics.performance.fastestRequest = responseTime;
      }
    }
  }

  recordError(errorType: string): void {
    const count = this.metrics.errors.get(errorType) || 0;
    this.metrics.errors.set(errorType, count + 1);
  }

  recordQuotaUsage(operation: string, units: number): void {
    this.metrics.quotaUsage.total += units;
    const current = this.metrics.quotaUsage.byOperation.get(operation) || 0;
    this.metrics.quotaUsage.byOperation.set(operation, current + units);
  }

  getMetrics(): any {
    return {
      ...this.metrics,
      errors: Object.fromEntries(this.metrics.errors),
      quotaUsage: {
        total: this.metrics.quotaUsage.total,
        byOperation: Object.fromEntries(this.metrics.quotaUsage.byOperation)
      },
      cacheHitRate: this.metrics.requests.total > 0
        ? (this.metrics.requests.cached / this.metrics.requests.total) * 100
        : 0,
      successRate: this.metrics.requests.total > 0
        ? ((this.metrics.requests.successful + this.metrics.requests.cached) / this.metrics.requests.total) * 100
        : 0
    };
  }

  reset(): void {
    this.metrics = {
      requests: { total: 0, successful: 0, failed: 0, cached: 0 },
      performance: {
        avgResponseTime: 0,
        totalResponseTime: 0,
        slowestRequest: 0,
        fastestRequest: Number.MAX_VALUE
      },
      errors: new Map<string, number>(),
      quotaUsage: { total: 0, byOperation: new Map<string, number>() }
    };
  }
}

const metricsCollector = new MetricsCollector();

// Enhanced error messages
class ErrorHelper {
  static getActionableError(error: Error): Error {
    const message = error.message.toLowerCase();

    if (message.includes('invalid api key') || message.includes('forbidden')) {
      return new Error(
        `API Key Error: ${error.message}\n` +
        `Actions to resolve:\n` +
        `1. Verify your YouTube Data API key is correct\n` +
        `2. Check if the API is enabled in Google Cloud Console\n` +
        `3. Ensure the key has not exceeded its quota\n` +
        `4. Visit: https://console.cloud.google.com/apis/credentials`
      );
    }

    if (message.includes('quota') || message.includes('rate limit')) {
      return new Error(
        `Quota/Rate Limit Error: ${error.message}\n` +
        `Actions to resolve:\n` +
        `1. Wait for quota reset (daily at midnight PST)\n` +
        `2. Use caching to reduce API calls\n` +
        `3. Request higher quota from Google\n` +
        `4. Check quota usage at: https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas`
      );
    }

    if (message.includes('network') || message.includes('fetch')) {
      return new Error(
        `Network Error: ${error.message}\n` +
        `Actions to resolve:\n` +
        `1. Check your internet connection\n` +
        `2. Verify YouTube API is accessible\n` +
        `3. Check for any firewall/proxy issues\n` +
        `4. The request will be automatically retried`
      );
    }

    if (message.includes('timeout')) {
      return new Error(
        `Timeout Error: ${error.message}\n` +
        `Actions to resolve:\n` +
        `1. YouTube API may be slow, please wait\n` +
        `2. Try again with a simpler query\n` +
        `3. Check YouTube API status: https://status.cloud.google.com/`
      );
    }

    return error;
  }
}

// Input validation utilities
class InputValidator {
  static validateVideoIdea(videoIdea: string): void {
    if (!videoIdea || typeof videoIdea !== 'string') {
      throw new Error('videoIdea must be a non-empty string');
    }
    if (videoIdea.length < 2) {
      throw new Error('videoIdea must be at least 2 characters long');
    }
    if (videoIdea.length > 200) {
      throw new Error('videoIdea must be less than 200 characters');
    }
    // Check for potential SQL injection or script injection patterns
    const dangerousPatterns = [/'/, /--/, /<script/i, /javascript:/i, /onload=/i];
    if (dangerousPatterns.some(pattern => pattern.test(videoIdea))) {
      throw new Error('videoIdea contains potentially dangerous content');
    }
  }

  static validateApiKey(apiKey: string): void {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('youtubeApiKey must be a non-empty string');
    }
    if (apiKey.length < 10) {
      throw new Error('youtubeApiKey appears to be invalid (too short)');
    }
    if (!/^[A-Za-z0-9_-]+$/.test(apiKey)) {
      throw new Error('youtubeApiKey contains invalid characters');
    }
  }

  static validateViewCount(viewCount: number): void {
    if (typeof viewCount !== 'number' || isNaN(viewCount)) {
      throw new Error('minViewCount must be a valid number');
    }
    if (viewCount < 0) {
      throw new Error('minViewCount must be non-negative');
    }
    if (viewCount > 1000000000) {
      throw new Error('minViewCount must be less than 1 billion');
    }
  }

  static validateMaxResults(maxResults: number): void {
    if (typeof maxResults !== 'number' || isNaN(maxResults)) {
      throw new Error('maxResults must be a valid number');
    }
    if (maxResults < 1) {
      throw new Error('maxResults must be at least 1');
    }
    if (maxResults > 50) {
      throw new Error('maxResults must be 50 or less to conserve API quota');
    }
  }

  static sanitizeSearchTerm(term: string): string {
    return term
      .replace(/[<>"'&]/g, '') // Remove potentially dangerous characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 100); // Limit length
  }
}

/**
 * Sets up YouTube analysis tools for the MCP server
 * @param server - The MCP server instance to configure
 */
export function setupTools(server: Server) {
  // Register available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'analyze_video_idea',
          description: 'Analyze a video idea and find high-performing related videos with titles and thumbnails',
          inputSchema: {
            type: 'object',
            properties: {
              videoIdea: {
                type: 'string',
                description: 'The video idea to analyze (e.g., "video automation")',
              },
              minViewCount: {
                type: 'number',
                description: 'Minimum view count for videos to consider (default: 10000)',
                default: 10000,
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of results to return (default: 10)',
                default: 10,
              },
              youtubeApiKey: {
                type: 'string',
                description: 'YouTube Data API key (optional, uses config if not provided)',
              },
            },
            required: ['videoIdea'],
          },
        },
        {
          name: 'get_quota_status',
          description: 'Check current YouTube API quota usage',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'expand_search_terms',
          description: 'Generate semantic variations of a video idea for broader search',
          inputSchema: {
            type: 'object',
            properties: {
              videoIdea: {
                type: 'string',
                description: 'The video idea to expand',
              },
            },
            required: ['videoIdea'],
          },
        },
        {
          name: 'get_performance_metrics',
          description: 'Get detailed performance metrics and analytics',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'analyze_video_idea':
          return await handleAnalyzeVideoIdea(args as any || {});
        case 'get_quota_status':
          return await handleGetQuotaStatus(args as any || {});
        case 'expand_search_terms':
          return await handleExpandSearchTerms(args as any || {});
        case 'get_performance_metrics':
          return await handleGetPerformanceMetrics(args as any || {});
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  });
}

interface AnalyzeVideoIdeaArgs {
  videoIdea: string;
  minViewCount?: number;
  maxResults?: number;
  youtubeApiKey?: string; // Now optional, will use config if not provided
}

async function handleAnalyzeVideoIdea(args: AnalyzeVideoIdeaArgs): Promise<any> {
  // Use provided values or fall back to config
  const apiKey = args.youtubeApiKey || config.youtubeApiKey;
  const minViewCount = args.minViewCount || config.minViewCount;
  const maxResults = args.maxResults || config.maxResults;

  // Comprehensive input validation
  try {
    InputValidator.validateVideoIdea(args.videoIdea);
    InputValidator.validateApiKey(apiKey);
    InputValidator.validateViewCount(minViewCount);
    InputValidator.validateMaxResults(maxResults);
  } catch (error) {
    logger.error('Input validation failed', {
      error: error instanceof Error ? error.message : String(error),
      videoIdea: args.videoIdea?.substring(0, 50),
      minViewCount: minViewCount,
      maxResults: maxResults
    });
    throw error;
  }

  // Check cache first
  const cacheKey = `analysis_${args.videoIdea}_${minViewCount}_${maxResults}`;
  const cachedResult = cache.get(cacheKey);
  if (cachedResult) {
    logger.info('Returning cached result', { videoIdea: args.videoIdea });
    metricsCollector.recordRequest(true, 0, true);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            ...cachedResult,
            cached: true,
            cacheTimestamp: new Date().toISOString()
          }, null, 2),
        },
      ],
    };
  }

  // Check quota before proceeding
  const estimatedQuota = 300; // Conservative estimate for search + details calls
  if (!quotaManager.checkQuota(estimatedQuota)) {
    throw new Error(`Insufficient quota. Remaining: ${quotaManager.getRemainingQuota()}`);
  }

  const startTime = Date.now();

  try {
    // Generate semantic variations of the search term
    const searchTerms = generateSemanticVariations(args.videoIdea);

    // Search for videos using multiple terms
    const allVideos: YouTubeVideo[] = [];
    let totalQuotaUsed = 0;

    for (const term of searchTerms.slice(0, 3)) { // Limit to 3 terms to conserve quota
      const videos = await searchYouTubeVideos(term, apiKey, minViewCount);
      allVideos.push(...videos.videos);
      totalQuotaUsed += videos.quotaUsed;
    }

    // Remove duplicates and filter by performance
    const uniqueVideos = removeDuplicates(allVideos);
    const filteredVideos = filterByPerformance(uniqueVideos, minViewCount);
    const topVideos = filteredVideos.slice(0, maxResults);

    quotaManager.useQuota(totalQuotaUsed);

    const result: AnalysisResult = {
      videos: topVideos,
      totalResults: topVideos.length,
      quotaUsed: totalQuotaUsed,
      searchTerms: searchTerms
    };

    // Cache the result
    cache.set(cacheKey, result, config.cacheTtl / 60000); // Convert ms to minutes

    // Record metrics
    const responseTime = Date.now() - startTime;
    metricsCollector.recordRequest(true, responseTime);
    metricsCollector.recordQuotaUsage('analyze_video_idea', totalQuotaUsed);

    // Record analysis for history tracking
    try {
      // Note: recordAnalysis would need to be imported from resources.js
      // For now, we'll log the analysis
      logger.info('Analysis completed successfully', {
        videoIdea: args.videoIdea,
        resultCount: topVideos.length,
        quotaUsed: totalQuotaUsed,
        searchTermsUsed: searchTerms.length,
        responseTime: `${responseTime}ms`
      });
    } catch (recordError) {
      logger.warn('Failed to record analysis', {
        error: recordError instanceof Error ? recordError.message : String(recordError)
      });
    }

    // Create a cleaner response format for the LLM
    const cleanResponse = {
      summary: {
        videoIdea: args.videoIdea,
        totalVideosFound: topVideos.length,
        quotaUsed: totalQuotaUsed,
        searchTermsUsed: searchTerms.slice(0, 3) // Only show first 3 terms
      },
      topPerformers: topVideos.map((video, index) => ({
        rank: index + 1,
        title: video.title,
        channel: video.channelTitle,
        metrics: {
          views: video.viewCount.toLocaleString(),
          viewsPerDay: video.viewsPerDay?.toLocaleString() || 'N/A',
          engagementRate: `${video.engagementRate || 0}%`,
          likes: video.likeCount.toLocaleString(),
          comments: video.commentCount.toLocaleString()
        },
        publishedDaysAgo: Math.floor((Date.now() - new Date(video.publishedAt).getTime()) / (1000 * 60 * 60 * 24)),
        thumbnail: video.thumbnail,
        videoUrl: `https://youtube.com/watch?v=${video.videoId}`
      }))
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(cleanResponse, null, 2),
        },
      ],
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    metricsCollector.recordRequest(false, responseTime);
    metricsCollector.recordError(error instanceof Error ? error.constructor.name : 'UnknownError');

    logger.error('YouTube API error in handleAnalyzeVideoIdea', {
      error: error instanceof Error ? error.message : String(error),
      videoIdea: args.videoIdea,
      minViewCount,
      maxResults,
      responseTime: `${responseTime}ms`
    });

    // Throw enhanced error with actionable suggestions
    throw ErrorHelper.getActionableError(error instanceof Error ? error : new Error(String(error)));
  }
}

interface GetQuotaStatusArgs {}

async function handleGetQuotaStatus(args: GetQuotaStatusArgs): Promise<any> {
  const remaining = quotaManager.getRemainingQuota();

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          dailyQuota: 10000,
          remainingQuota: remaining,
          usedQuota: 10000 - remaining,
          resetDate: new Date().toDateString()
        }, null, 2),
      },
    ],
  };
}

interface ExpandSearchTermsArgs {
  videoIdea: string;
}

async function handleExpandSearchTerms(args: ExpandSearchTermsArgs): Promise<any> {
  try {
    InputValidator.validateVideoIdea(args.videoIdea);
  } catch (error) {
    logger.error('Input validation failed for expand search terms', {
      error: error instanceof Error ? error.message : String(error),
      videoIdea: args.videoIdea?.substring(0, 50)
    });
    throw error;
  }

  const variations = generateSemanticVariations(args.videoIdea);

  logger.info('Generated search term variations', {
    originalIdea: args.videoIdea,
    variationCount: variations.length
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          originalIdea: args.videoIdea,
          variations: variations,
          totalVariations: variations.length
        }, null, 2),
      },
    ],
  };
}

interface GetPerformanceMetricsArgs {}

async function handleGetPerformanceMetrics(args: GetPerformanceMetricsArgs): Promise<any> {
  const metrics = metricsCollector.getMetrics();
  const quotaStatus = {
    dailyQuota: 10000,
    remainingQuota: quotaManager.getRemainingQuota(),
    usedQuota: 10000 - quotaManager.getRemainingQuota()
  };

  const systemMetrics = {
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    circuitBreakerState: circuitBreaker.getState(),
    rateLimiterStatus: {
      remainingRequests: rateLimiter.getRemainingRequests(),
      resetTime: rateLimiter.getResetTime()
    }
  };

  logger.info('Retrieved performance metrics');

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          timestamp: new Date().toISOString(),
          apiMetrics: metrics,
          quotaStatus,
          systemMetrics: {
            ...systemMetrics,
            memoryUsage: {
              rss: Math.round(systemMetrics.memoryUsage.rss / 1024 / 1024 * 100) / 100,
              heapTotal: Math.round(systemMetrics.memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
              heapUsed: Math.round(systemMetrics.memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
              external: Math.round(systemMetrics.memoryUsage.external / 1024 / 1024 * 100) / 100
            },
            uptimeFormatted: `${Math.floor(systemMetrics.uptime / 3600)}h ${Math.floor((systemMetrics.uptime % 3600) / 60)}m ${Math.floor(systemMetrics.uptime % 60)}s`
          }
        }, null, 2),
      },
    ],
  };
}

/**
 * Generates semantic variations of a video idea for broader search coverage
 * @param videoIdea - The original video idea to expand
 * @returns Array of semantic variations and related terms
 */
function generateSemanticVariations(videoIdea: string): string[] {
  const variations: string[] = [videoIdea];

  // Use compromise for NLP processing
  const doc = nlp(videoIdea);
  const nouns = doc.nouns().out('array');
  const verbs = doc.verbs().out('array');
  const adjectives = doc.adjectives().out('array');

  // Generate variations using synonyms and related terms
  const synonymMap: { [key: string]: string[] } = {
    'automation': ['automated', 'automatic', 'ai', 'bot', 'script', 'workflow'],
    'video': ['videos', 'content', 'youtube', 'tutorial', 'guide', 'how to'],
    'marketing': ['promotion', 'advertising', 'growth', 'strategy', 'social media'],
    'business': ['entrepreneur', 'startup', 'company', 'corporate', 'professional'],
    'tutorial': ['guide', 'how to', 'walkthrough', 'step by step', 'learn'],
    'productivity': ['efficiency', 'optimization', 'time management', 'workflow'],
    'ai': ['artificial intelligence', 'machine learning', 'chatgpt', 'automation'],
    'crypto': ['bitcoin', 'cryptocurrency', 'blockchain', 'trading', 'investing'],
    'fitness': ['workout', 'exercise', 'health', 'gym', 'training'],
    'cooking': ['recipe', 'food', 'kitchen', 'meal', 'chef']
  };

  // Add direct synonyms
  Object.keys(synonymMap).forEach(key => {
    if (videoIdea.toLowerCase().includes(key)) {
      synonymMap[key].forEach(synonym => {
        variations.push(videoIdea.replace(new RegExp(key, 'gi'), synonym));
      });
    }
  });

  // Add broader related terms
  const broaderTerms = [
    `${videoIdea} tips`,
    `${videoIdea} tricks`,
    `${videoIdea} hacks`,
    `${videoIdea} secrets`,
    `${videoIdea} guide`,
    `${videoIdea} tutorial`,
    `${videoIdea} strategy`,
    `${videoIdea} method`,
    `${videoIdea} technique`,
    `${videoIdea} system`
  ];

  variations.push(...broaderTerms);

  // Remove duplicates and return top 10
  return [...new Set(variations)].slice(0, 10);
}

/**
 * Searches YouTube for videos matching the search term with performance filtering
 * @param searchTerm - The search query
 * @param apiKey - YouTube Data API key
 * @param minViewCount - Minimum view count for filtering
 * @returns Promise resolving to videos and quota usage
 */
async function searchYouTubeVideos(searchTerm: string, apiKey: string, minViewCount: number): Promise<{ videos: YouTubeVideo[], quotaUsed: number }> {
  // Rate limiting check
  if (!rateLimiter.canMakeRequest()) {
    const resetTime = rateLimiter.getResetTime();
    throw new Error(`Rate limit exceeded. Reset at: ${resetTime.toISOString()}`);
  }

  // Sanitize search term
  const sanitizedTerm = InputValidator.sanitizeSearchTerm(searchTerm);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const publishedAfter = thirtyDaysAgo.toISOString();

  // Check cache first
  const cacheKey = `search_${sanitizedTerm}_${minViewCount}`;
  const cachedResult = cache.get(cacheKey);
  if (cachedResult) {
    logger.info('Returning cached search result', { searchTerm: sanitizedTerm });
    return cachedResult;
  }

  // Execute with circuit breaker and retry logic
  return await circuitBreaker.execute(async () => {
    return await retryHandler.execute(async () => {
      // Search for videos (costs 100 quota units)
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(sanitizedTerm)}&type=video&order=viewCount&publishedAfter=${publishedAfter}&maxResults=25&key=${apiKey}`;

      logger.info('Making YouTube API search request', {
        searchTerm: sanitizedTerm,
        publishedAfter,
        minViewCount,
        circuitBreakerState: circuitBreaker.getState()
      });

      const searchResponse = await fetch(searchUrl, {
        signal: AbortSignal.timeout(30000), // 30 second timeout
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'YouTube-Analyzer-MCP/1.0'
        }
      });
  if (!searchResponse.ok) {
    logger.error('YouTube API search failed', {
      searchTerm,
      status: searchResponse.status,
      statusText: searchResponse.statusText
    });
    throw new Error(`YouTube API search failed: ${searchResponse.statusText}`);
  }

  const searchData = await searchResponse.json() as any;
  const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

  // Get video details including statistics (costs 1 quota unit)
  const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`;

  const detailsResponse = await fetch(detailsUrl);
  if (!detailsResponse.ok) {
    logger.error('YouTube API details failed', {
      videoIds: videoIds.substring(0, 100) + '...',
      status: detailsResponse.status,
      statusText: detailsResponse.statusText
    });
    throw new Error(`YouTube API details failed: ${detailsResponse.statusText}`);
  }

  const detailsData = await detailsResponse.json() as any;

  const videos: YouTubeVideo[] = detailsData.items
    .filter((item: any) => parseInt(item.statistics.viewCount) >= minViewCount)
    .map((item: any) => {
      const viewCount = parseInt(item.statistics.viewCount);
      const likeCount = parseInt(item.statistics.likeCount || '0');
      const commentCount = parseInt(item.statistics.commentCount || '0');
      const publishedAt = item.snippet.publishedAt;

      // Calculate engagement rate
      const engagementRate = viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0;

      // Calculate views per day
      const publishDate = new Date(publishedAt);
      const daysSincePublish = Math.max(1, Math.floor((Date.now() - publishDate.getTime()) / (1000 * 60 * 60 * 24)));
      const viewsPerDay = Math.floor(viewCount / daysSincePublish);

      return {
        title: item.snippet.title,
        videoId: item.id,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
        viewCount,
        likeCount,
        commentCount,
        publishedAt,
        channelTitle: item.snippet.channelTitle,
        duration: item.contentDetails.duration,
        engagementRate: parseFloat(engagementRate.toFixed(2)),
        viewsPerDay
      };
    });

  const result = { videos, quotaUsed: 101 }; // 100 for search + 1 for details

  // Cache the search result
  cache.set(cacheKey, result, config.cacheTtl / 60000); // Convert ms to minutes

  logger.info('YouTube API search completed', {
    searchTerm: sanitizedTerm,
    videoCount: videos.length,
    quotaUsed: 101
  });

  return result;
    }, `searchYouTubeVideos-${searchTerm}`);
  });
}

/**
 * Removes duplicate videos based on video ID
 * @param videos - Array of YouTube videos
 * @returns Array with duplicates removed
 */
function removeDuplicates(videos: YouTubeVideo[]): YouTubeVideo[] {
  const seen = new Set<string>();
  return videos.filter(video => {
    if (seen.has(video.videoId)) {
      return false;
    }
    seen.add(video.videoId);
    return true;
  });
}

/**
 * Filters and sorts videos by performance metrics
 * @param videos - Array of YouTube videos to filter
 * @param minViewCount - Minimum view count threshold
 * @returns Filtered and sorted array of high-performing videos
 */
function filterByPerformance(videos: YouTubeVideo[], minViewCount: number): YouTubeVideo[] {
  return videos
    .filter(video => video.viewCount >= minViewCount)
    .sort((a, b) => {
      // Sort by a composite score considering views per day and engagement rate
      // This prioritizes videos that are both popular and engaging
      const scoreA = (a.viewsPerDay || 0) * (1 + (a.engagementRate || 0) / 100);
      const scoreB = (b.viewsPerDay || 0) * (1 + (b.engagementRate || 0) / 100);
      return scoreB - scoreA;
    });
}

/**
 * Converts a string to PascalCase
 * @param str - The string to convert
 * @returns PascalCase version of the string
 */
function toPascalCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}
