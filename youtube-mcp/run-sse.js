#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Run the SSE server using tsx
const child = spawn('npx', ['tsx', join(__dirname, 'src/sse-server.ts')], {
  stdio: 'inherit',
  env: { ...process.env }
});

child.on('error', (err) => {
  console.error('Failed to start SSE server:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
