import { Command } from 'commander';
import { parseYamlSpec } from '@/parser/yaml.js';
import { optimizeAgentSpec } from '@/optimizer/index.js';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { Optimizer } from '@/schemas/agent-spec.js';

export function optimizeCommand(program: Command) {
  program
    .command('optimize')
    .description('Optimize an agent specification by iteratively improving the system prompt')
    .argument('<spec>', 'Path to the agent specification YAML file')
    .option('-m, --model <model>', 'AI model to use for optimization')
    .option('-i, --iterations <number>', 'Number of optimization iterations', '3')
    .option('-s, --strategy <strategy>', 'Optimization strategy (error_analysis, completion_analysis)', 'error_analysis')
    .option('-o, --output <path>', 'Path to save the optimized specification')
    .option('-f, --feedback <prompt>', 'Custom feedback prompt for the optimizer')
    .option('-r, --min-pass-rate <rate>', 'Minimum pass rate percentage to consider optimization successful', '80')
    .action(async (specPath, options) => {
      try {
        // Resolve input path
        const inputPath = path.resolve(specPath);
        console.log(`Optimizing ${inputPath}...`);
        
        // Parse the spec file
        const parsedSpec = await parseYamlSpec(inputPath);
        
        // Determine output path
        const outputPath = options.output 
          ? path.resolve(options.output)
          : inputPath.replace(/\.ya?ml$/i, '.optimized.yaml');
        
        // Create optimizer config
        const optimizerConfig: Optimizer = {
          model: options.model || parsedSpec.optimizer?.model || 'gpt-4o',
          iterations: parseInt(options.iterations) || parsedSpec.optimizer?.iterations || 3,
          strategy: (options.strategy as any) || parsedSpec.optimizer?.strategy || 'error_analysis',
          feedbackPrompt: options.feedback || parsedSpec.optimizer?.feedbackPrompt,
          minPassRate: parseInt(options.minPassRate) || parsedSpec.optimizer?.minPassRate || 80,
        };
        
        console.log(`Using model: ${optimizerConfig.model}`);
        console.log(`Iterations: ${optimizerConfig.iterations}`);
        console.log(`Strategy: ${optimizerConfig.strategy}`);
        
        // Run optimizer
        const result = await optimizeAgentSpec(parsedSpec, optimizerConfig, outputPath);
        
        console.log('\nOptimization completed:');
        console.log(`- Original system prompt: ${result.originalSpec.agent.systemPrompt.substring(0, 50)}...`);
        console.log(`- Optimized system prompt: ${result.optimizedSpec.agent.systemPrompt.substring(0, 50)}...`);
        console.log(`- Iterations run: ${result.testResults.length}`);
        console.log(`- Improvements made: ${result.improvements.length}`);
        console.log(`\nOptimized spec saved to: ${outputPath}`);
        
      } catch (error) {
        console.error('Optimization failed:');
        console.error(error);
        process.exit(1);
      }
    });
} 