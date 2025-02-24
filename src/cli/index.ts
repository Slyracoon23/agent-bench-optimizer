import { Command } from 'commander';
import { transpileCommand } from './commands/transpile.js';
import { runCommand } from './commands/run.js';
import { testCommand } from './commands/test.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import 'dotenv/config'; // Load environment variables from .env file

// Read version from package.json since direct imports are problematic in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.resolve(__dirname, '../../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const { version } = packageJson;

export function run() {
  // Check if OPENAI_API_KEY is set, but only show error if it's not set
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is not set');
    process.exit(1);
  }

  const program = new Command();

  program
    .name('agent-bench')
    .description('Framework for testing and benchmarking AI agents')
    .version(version);

  // Register commands
  transpileCommand(program);
  runCommand(program);
  testCommand(program);

  program.parse();
}

// Auto-run when this file is executed directly (via tsx)
// Using ES modules pattern instead of CommonJS require.main === module
if (import.meta.url === import.meta.resolve(process.argv[1])) {
  run();
}