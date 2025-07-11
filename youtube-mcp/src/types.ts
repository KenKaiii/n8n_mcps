/**
 * Type definitions for MCP server for: Create a YouTube analysis MCP server that takes a video idea as input and returns 10 high-perform...
 */

// Add your custom types here

export interface Config {
  // Configuration options
}


export interface Data {
  id: string;
  // Add data properties here
  createdAt: Date;
  updatedAt: Date;
}

export interface Search {
  id: string;
  // Add search properties here
  createdAt: Date;
  updatedAt: Date;
}

export interface Content {
  id: string;
  // Add content properties here
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  id: string;
  // Add goal properties here
  createdAt: Date;
  updatedAt: Date;
}
