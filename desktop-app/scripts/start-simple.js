#!/usr/bin/env node

// Simple development starter that launches Vite dev‐server (port 3003)
// and then launches Electron in development mode.
// This replaces the previously deleted script and is purposely minimal.

const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

/**
 * Spawn a process and forward stdio.
 */
function run(cmd, args, options = {}) {
  return spawn(cmd, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
    ...options
  });
}

console.log('📦 Starting Vite dev server (port 3003)...');
const vite = run('npx', ['vite', '--port', '3003']);

vite.on('close', (code) => {
  if (code !== 0) {
    console.error(`Vite exited with code ${code}`);
  }
});

// Give Vite a little time to start before launching Electron
setTimeout(() => {
  console.log('🚀 Launching Electron in development mode...');
  run('npx', ['cross-env', 'NODE_ENV=development', 'electron', '.']);
}, 4000);
