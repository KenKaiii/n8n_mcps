#!/bin/bash

# Load environment variables from .env
export $(grep -v '^#' .env | xargs)

# Start the MCP server
exec node dist/index.js
