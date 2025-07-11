# YouTube Analyzer Desktop Extension

A Claude Desktop Extension that analyzes YouTube video ideas to find high-performing titles and thumbnails.

## Installation

1. Download the `youtube-analyzer.dxt` file
2. Double-click to install in Claude Desktop
3. Configure your YouTube API key when prompted

## Features

- **Video Idea Analysis**: Enter any video idea and get 10 high-performing related videos
- **Semantic Search**: Finds broader relevant content beyond exact matches
- **Recent Content Focus**: Only shows videos from the last 30 days
- **Performance Filtering**: Configurable minimum view count thresholds
- **Quota Management**: Efficient API usage with caching (10,000 units/day limit)
- **Comprehensive Metrics**: View count, engagement rates, publish dates

## Configuration

The extension will prompt you for:
- **YouTube API Key** (required): Get one from [Google Cloud Console](https://console.cloud.google.com/)
- **Minimum View Count**: Default is 10,000 views
- **Maximum Results**: Default is 10 results per search
- **Cache TTL**: Default is 15 minutes

## Usage

### Tools

1. **analyze_video_idea**: Main analysis tool
   ```
   Input: "video automation"
   Returns: Top 10 videos with titles, thumbnails, and metrics
   ```

2. **get_quota_status**: Check your API usage
   ```
   Returns: Daily quota used/remaining
   ```

3. **expand_search_terms**: Generate search variations
   ```
   Input: "video automation"
   Returns: Related search terms
   ```

4. **get_performance_metrics**: View analysis history
   ```
   Returns: Performance metrics and trends
   ```

### Prompts

- **analyze_video_performance**: Get insights on video performance
- **optimize_title**: Get title suggestions based on successful patterns
- **thumbnail_suggestions**: Get thumbnail design recommendations

## API Quota

YouTube Data API allows 10,000 units per day:
- Search operation: 100 units
- Video details: 1 unit per video
- Average analysis: ~150 units

With caching, you can perform 60-80 analyses per day.

## Support

For issues or questions, please visit our [GitHub repository](https://github.com/youtube-analyzer/mcp).

## License

MIT License