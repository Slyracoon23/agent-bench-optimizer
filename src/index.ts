// Main library exports
export * from './schemas/agent-spec';
export * from './parser/yaml';
export * from './transpiler/vitest';
export * from './runner/vitest';

import { parseYamlSpec } from './parser/yaml';
import { transpileToVitest } from './transpiler/vitest';
import { runTests, RunOptions, RunResult } from './runner/vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Options for the transpileSpec function
 */
export interface TranspileOptions {
  output?: string;
}

/**
 * Options for the testSpec function
 */
export interface TestOptions extends RunOptions {
  output?: string;
  keep?: boolean;
}

/**
 * Transpiles an agent specification to a Vitest test file
 * 
 * @param specPath Path to the agent specification YAML file
 * @param options Transpilation options
 * @returns Path to the generated test file
 */
export async function transpileSpec(
  specPath: string,
  options: TranspileOptions = {}
): Promise<string> {
  const inputPath = path.resolve(specPath);
  const outputPath = options.output 
    ? path.resolve(options.output)
    : inputPath.replace(/\.ya?ml$/i, '.test.ts');
  
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
  
  return outputPath;
}

/**
 * Runs tests for an agent specification
 * 
 * @param specPath Path to the agent specification YAML file
 * @param options Test options
 * @returns Result of the test run
 */
export async function testSpec(
  specPath: string,
  options: TestOptions = {}
): Promise<RunResult> {
  // Determine output path
  const outputPath = options.output 
    ? path.resolve(options.output)
    : options.keep
      ? path.resolve(specPath).replace(/\.ya?ml$/i, '.test.ts')
      : path.join(os.tmpdir(), `agent-bench-${Date.now()}.test.ts`);
  
  // Transpile the spec
  await transpileSpec(specPath, { output: outputPath });
  
  // Run the tests
  const result = await runTests(outputPath, options);
  
  // Clean up temporary file if not keeping
  if (!options.keep && !options.watch && fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }
  
  return result;
}