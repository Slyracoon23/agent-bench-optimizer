import { Command } from 'commander';
import { transpileCommand } from './commands/transpile.js';
import { runCommand } from './commands/run.js';
import { testCommand } from './commands/test.js';
import { optimizeCommand } from './commands/optimize.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import 'dotenv/config'; // Load environment variables from .env file
import figlet from 'figlet';
import gradient from 'gradient-string';

// Read version from package.json since direct imports are problematic in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.resolve(__dirname, '../../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const { version } = packageJson;

/**
 * Displays ASCII art banner for prompt-spec
 */
function displayBanner() {
  const asciiArt = figlet.textSync('prompt-spec', {
    font: 'Standard',
    horizontalLayout: 'default',
    verticalLayout: 'default',
  });
  
  // Apply a cool gradient to the ASCII art
  const coloredAsciiArt = gradient(['#FF5733', '#C70039', '#900C3F', '#581845'])(asciiArt);
  
  console.log(coloredAsciiArt);
  console.log(`v${version} - Framework for testing and benchmarking AI agents\n`);
}

export function run() {
  // Check if OPENAI_API_KEY is set, but only show error if it's not set
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is not set');
    process.exit(1);
  }

  // Display the ASCII art banner
  displayBanner();

  const program = new Command();

  program
    .name('prompt-spec')
    .description('Framework for testing and benchmarking AI agents')
    .version(version);

  // Register commands
  transpileCommand(program);
  runCommand(program);
  testCommand(program);
  optimizeCommand(program);

  program.parse();
}

// Auto-run when this file is executed directly (via tsx)
// Using ES modules pattern instead of CommonJS require.main === module
if (import.meta.url === import.meta.resolve(process.argv[1])) {
  run();
}