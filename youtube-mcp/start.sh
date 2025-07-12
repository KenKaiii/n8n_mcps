#!/bin/bash

# Substitute environment variable in nginx config
envsubst '${MCP_AUTH_TOKEN}' < /etc/nginx/nginx.conf > /tmp/nginx.conf
mv /tmp/nginx.conf /etc/nginx/nginx.conf

# Start nginx in background
nginx -g "daemon off;" &

# Start supergateway on port 8081 (nginx proxies from 8080 to 8081)
supergateway --port 8081 --stdio 'node dist/index.js 2>&1'
