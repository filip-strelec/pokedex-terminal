#!/usr/bin/env node

const readline = require('readline');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Whitelist of allowed commands
const ALLOWED_COMMANDS = {
  // File viewing (read-only)
  'ls': { args: ['-la', '-l', '-a', '--color=auto'], description: 'List files' },
  'cat': { args: [], description: 'View file contents' },
  'head': { args: ['-n'], description: 'View first lines of file' },
  'tail': { args: ['-n'], description: 'View last lines of file' },
  'pwd': { args: [], description: 'Print working directory' },
  'tree': { args: ['-L'], description: 'Show directory tree' },
  
  // Node.js commands
  'node': { args: ['--version', '-v', '-e', 'index.js', 'test_sprite_render.js'], description: 'Run Node.js' },
  'npm': { args: ['--version', 'list', 'ls', 'view', 'info'], description: 'NPM (read-only)' },
  
  // Git (read-only)
  'git': { args: ['status', 'log', 'diff', 'show', 'branch', 'remote'], description: 'Git (read-only)' },
  
  // System info
  'whoami': { args: [], description: 'Show current user' },
  'date': { args: [], description: 'Show current date/time' },
  'echo': { args: [], description: 'Print text' },
  
  // Help
  'help': { args: [], description: 'Show available commands' },
  'clear': { args: [], description: 'Clear screen' },
  'exit': { args: [], description: 'Exit shell' },
};

// Dangerous patterns to block
const BLOCKED_PATTERNS = [
  /rm\s/i, /rmdir/i, /del\s/i,
  /mv\s/i, /move\s/i,
  /cp\s.*>/i, // cp with redirect
  />/,  // Any redirect
  /\|/,  // Pipes (could chain to dangerous commands)
  /;/,   // Command chaining
  /&&/,  // Command chaining
  /\|\|/, // Command chaining
  /`/,   // Command substitution
  /\$\(/,  // Command substitution
  /chmod/i, /chown/i,
  /sudo/i, /su\s/i,
  /kill/i, /pkill/i,
  /wget/i, /curl.*-o/i, // Downloads with output
  /apt/i, /yum/i, /dnf/i, // Package managers
  /docker/i, /kubectl/i,
  /ssh/i, /scp/i, /sftp/i,
  /nc\s/i, /netcat/i, // Network tools
  /\.\.\/\.\.\//,  // Directory traversal
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '\x1b[32m$\x1b[0m ',
});

function showHelp() {
  console.log('\n\x1b[1;36mRestricted Shell - Available Commands:\x1b[0m\n');
  Object.entries(ALLOWED_COMMANDS).forEach(([cmd, info]) => {
    console.log(`  \x1b[33m${cmd.padEnd(12)}\x1b[0m ${info.description}`);
  });
  console.log('\n\x1b[90mNote: This is a read-only shell. Destructive commands are blocked.\x1b[0m\n');
}

function isCommandSafe(input) {
  const trimmed = input.trim();
  
  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { safe: false, reason: 'Blocked pattern detected' };
    }
  }
  
  // Parse command
  const parts = trimmed.split(/\s+/);
  const cmd = parts[0];
  
  // Check if command is in whitelist
  if (!ALLOWED_COMMANDS[cmd]) {
    return { safe: false, reason: `Command '${cmd}' not allowed` };
  }
  
  // For node command, only allow specific files or flags
  if (cmd === 'node') {
    const hasFile = parts.some(p => p === 'index.js' || p === 'test_sprite_render.js');
    const hasFlag = parts.some(p => p.startsWith('-'));
    if (!hasFile && !hasFlag) {
      return { safe: false, reason: 'Only allowed to run: node index.js, node test_sprite_render.js, or node with flags' };
    }
  }
  
  return { safe: true };
}

function executeCommand(input) {
  const trimmed = input.trim();
  
  if (!trimmed) {
    rl.prompt();
    return;
  }
  
  if (trimmed === 'help') {
    showHelp();
    rl.prompt();
    return;
  }
  
  if (trimmed === 'clear') {
    console.clear();
    rl.prompt();
    return;
  }
  
  if (trimmed === 'exit') {
    console.log('\x1b[33mExiting restricted shell...\x1b[0m');
    process.exit(0);
  }
  
  const safety = isCommandSafe(trimmed);
  if (!safety.safe) {
    console.log(`\x1b[31m✗ Blocked: ${safety.reason}\x1b[0m`);
    rl.prompt();
    return;
  }
  
  const parts = trimmed.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);
  
  const proc = spawn(cmd, args, {
    cwd: __dirname,
    stdio: 'inherit',
  });
  
  proc.on('error', (err) => {
    console.log(`\x1b[31m✗ Error: ${err.message}\x1b[0m`);
    rl.prompt();
  });
  
  proc.on('close', () => {
    rl.prompt();
  });
}

console.log('\x1b[1;36m╔════════════════════════════════════════╗\x1b[0m');
console.log('\x1b[1;36m║   Restricted Shell (Read-Only Mode)   ║\x1b[0m');
console.log('\x1b[1;36m╚════════════════════════════════════════╝\x1b[0m');
console.log('\x1b[90mType "help" for available commands\x1b[0m\n');

rl.prompt();

rl.on('line', (line) => {
  executeCommand(line);
});

rl.on('close', () => {
  console.log('\n\x1b[33mGoodbye!\x1b[0m');
  process.exit(0);
});

