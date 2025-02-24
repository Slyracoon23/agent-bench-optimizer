import { Command } from 'commander';
import { transpileCommand } from './commands/transpile';
import { runCommand } from './commands/run';
import { testCommand } from './commands/test';
import { version } from '../../package.json';
import 'dotenv/config'; // Load environment variables from .env file

export function run() {
  // Log whether OPENAI_API_KEY is set (without revealing the actual key)
  if (process.env.OPENAI_API_KEY) {
    console.log('OPENAI_API_KEY environment variable is set');
  } else {
    console.warn('Warning: OPENAI_API_KEY environment variable is not set');
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
if (require.main === module) {
  run();
}