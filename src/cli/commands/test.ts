import { Command } from 'commander';
import { parseYamlSpec } from '@/parser/yaml.js';
import { transpileToVitest } from '@/transpiler/vitest.js';
import { runTests } from '@/runner/vitest.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Create a dedicated test directory in the project
const TEST_DIR = path.join(process.cwd(), '.prompt-spec-tests');

export function testCommand(program: Command) {
  program
    .command('test')
    .description('Transpile and run an agent specification')
    .argument('<spec>', 'Path to the agent specification YAML file')
    .option('-o, --output <path>', 'Output test file path')
    .option('-k, --keep', 'Keep the generated test file', false)
    .option('-w, --watch', 'Run in watch mode')
    .option('-r, --reporter <reporter>', 'Specify reporter')
    .action(async (specPath, options) => {
      try {
        // Resolve input path
        const inputPath = path.resolve(specPath);
        console.log(`[DEBUG] Input path: ${inputPath}`);
        
        // Create test directory if it doesn't exist
        if (!fs.existsSync(TEST_DIR)) {
          fs.mkdirSync(TEST_DIR, { recursive: true });
        }
        
        // Determine output path
        const outputPath = options.output 
          ? path.resolve(options.output)
          : options.keep
            ? inputPath.replace(/\.ya?ml$/i, '.test.ts')
            : path.join(TEST_DIR, `prompt-spec-${Date.now()}.test.ts`);
        
        console.log(`[DEBUG] Output path: ${outputPath}`);
        console.log(`Transpiling ${inputPath}...`);
        
        // Parse the spec file
        const parsedSpec = await parseYamlSpec(inputPath);
        console.log(`[DEBUG] Parsed YAML spec successfully`);
        
        // Generate the test file
        const testCode = transpileToVitest(parsedSpec);
        console.log(`[DEBUG] Generated test code`);
        console.log(`[DEBUG] Generated test code preview:\n${testCode.substring(0, 300)}...`);
        
        // Create directory if it doesn't exist
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Write the output file
        fs.writeFileSync(outputPath, testCode, 'utf8');
        console.log(`[DEBUG] Wrote test file to: ${outputPath}`);
        
        if (options.keep) {
          console.log(`Generated test file: ${outputPath}`);
        }
        
        // Run the tests
        console.log(`Running tests...`);
        console.log(`[DEBUG] Running with options: ${JSON.stringify({
          watch: options.watch,
          reporter: options.reporter
        })}`);
        
        const result = await runTests(outputPath, {
          watch: options.watch,
          reporter: options.reporter
        });
        
        console.log(`[DEBUG] Test result: ${JSON.stringify(result)}`);
        
        // Clean up temporary file if not keeping
        if (!options.keep && !options.watch && fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
          console.log(`[DEBUG] Cleaned up temporary file`);
        }
        
        // Exit with the appropriate code
        if (!result.success) {
          process.exit(result.exitCode);
        }
      } catch (error) {
        console.error('Test failed:');
        console.error(error);
        process.exit(1);
      }
    });
}