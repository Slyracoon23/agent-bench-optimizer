import { Command } from 'commander';
import { runTests } from '@/runner/vitest.js';
import path from 'path';

export function runCommand(program: Command) {
  program
    .command('run')
    .description('Run a transpiled agent test file')
    .argument('<test>', 'Path to the test file')
    .option('-w, --watch', 'Run in watch mode')
    .option('-r, --reporter <reporter>', 'Specify reporter')
    .action(async (testPath, options) => {
      try {
        // Resolve the test file path
        const fullPath = path.resolve(testPath);
        console.log(`Running tests: ${fullPath}`);
        
        // Run the tests
        const result = await runTests(fullPath, {
          watch: options.watch,
          reporter: options.reporter
        });
        
        // Exit with the appropriate code
        if (!result.success) {
          process.exit(result.exitCode);
        }
      } catch (error) {
        console.error('Test execution failed:');
        console.error(error);
        process.exit(1);
      }
    });
}