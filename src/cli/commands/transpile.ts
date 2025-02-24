import { Command } from 'commander';
import { parseYamlSpec } from '../../parser/yaml';
import { transpileToVitest } from '../../transpiler/vitest';
import fs from 'fs';
import path from 'path';

export function transpileCommand(program: Command) {
  program
    .command('transpile')
    .description('Transpile an agent specification to a Vitest test file')
    .argument('<spec>', 'Path to the agent specification YAML file')
    .option('-o, --output <path>', 'Output file path')
    .action(async (specPath, options) => {
      try {
        // Resolve paths
        const inputPath = path.resolve(specPath);
        const outputPath = options.output 
          ? path.resolve(options.output)
          : inputPath.replace(/\.ya?ml$/i, '.test.ts');
        
        console.log(`Transpiling ${inputPath}...`);
        
        // Parse the spec file
        const parsedSpec = await parseYamlSpec(inputPath);
        
        // Generate the test file
        const testCode = transpileToVitest(parsedSpec);
        
        // Create directory if it doesn't exist
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Write the output file
        fs.writeFileSync(outputPath, testCode, 'utf8');
        console.log(`Successfully generated: ${outputPath}`);
      } catch (error) {
        console.error('Transpilation failed:');
        console.error(error);
        process.exit(1);
      }
    });
}