import { Command } from 'commander';
import { transpileCommand } from './commands/transpile';
import { runCommand } from './commands/run';
import { testCommand } from './commands/test';
import { version } from '../../package.json';

export function run() {
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