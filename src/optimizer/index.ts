import { AgentSpec, Optimizer } from '@/schemas/agent-spec.js';
import { runTests, RunResult } from '@/runner/vitest.js';
import { transpileToVitest } from '@/transpiler/vitest.js';
import { optimizePromptWithAI } from './ai.js';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Create a dedicated optimizer directory
const OPTIMIZER_DIR = path.join(process.cwd(), '.prompt-spec-optimizer');

interface OptimizationResult {
  originalSpec: AgentSpec;
  optimizedSpec: AgentSpec;
  iterations: number;
  testResults: RunResult[];
  improvements: string[];
}

/**
 * Optimizes an agent specification by iteratively improving the system prompt
 * based on test results feedback
 * 
 * @param spec The agent specification to optimize
 * @param optimizerConfig Optimizer configuration
 * @param outputPath Path to save the optimized spec (optional)
 * @returns Optimization results
 */
export async function optimizeAgentSpec(
  spec: AgentSpec,
  optimizerConfig: Optimizer,
  outputPath?: string
): Promise<OptimizationResult> {
  // Create optimizer directory if it doesn't exist
  if (!fs.existsSync(OPTIMIZER_DIR)) {
    fs.mkdirSync(OPTIMIZER_DIR, { recursive: true });
  }

  console.log(`Starting optimization with ${optimizerConfig.iterations} iterations...`);
  
  // Store the original spec and create a working copy
  const originalSpec = { ...spec };
  let currentSpec = { ...spec };
  const testResults: RunResult[] = [];
  const improvements: string[] = [];
  
  // Generate a test file from the spec
  const testFilePath = path.join(OPTIMIZER_DIR, `prompt-spec-optimize-${Date.now()}.test.ts`);
  const testCode = transpileToVitest(currentSpec);
  fs.writeFileSync(testFilePath, testCode, 'utf8');
  
  try {
    // Run iterations
    for (let i = 0; i < optimizerConfig.iterations; i++) {
      console.log(`\nIteration ${i + 1}/${optimizerConfig.iterations}`);
      
      // Run tests with the current spec
      console.log('Running tests with current system prompt...');
      const result = await runTests(testFilePath, {
        silent: false, // We want to see the test output
        systemMessage: currentSpec.agent.systemPrompt,
        context: {
          spec: currentSpec
        }
      });
      
      testResults.push(result);
      
      // Calculate the pass rate based on task states
      const totalTasks = result.taskResults.length;
      const passedTasks = result.taskResults.filter(task => task.state === 'pass').length;
      const passRate = totalTasks > 0 ? (passedTasks / totalTasks) * 100 : 0;
      
      console.log(`Pass rate: ${passRate.toFixed(2)}% (${passedTasks}/${totalTasks} tasks)`);
      
      // Log if raw test results were captured
      if (result.rawTestResults) {
        console.log('Raw test results captured successfully');
      } else {
        console.warn('No raw test results available');
      }
      
      // Define the minimum acceptable pass rate (could be configurable)
      const minPassRate = optimizerConfig.minPassRate || 80;
      const passRateSuccess = passRate >= minPassRate;
      
      // If this is the last iteration or the pass rate is high enough, we're done
      if (i === optimizerConfig.iterations - 1 || passRateSuccess) {
        if (passRateSuccess) {
          console.log(`Pass rate of ${passRate.toFixed(2)}% exceeds minimum threshold of ${minPassRate}%. Optimization complete.`);
        } else {
          console.log('Maximum iterations reached. Optimization complete.');
        }
        break;
      }
      
      // Otherwise, generate a better system prompt based on test results
      console.log('Analyzing test results and optimizing system prompt...');
      
      // Call the AI implementation to optimize the prompt
      const improvedPrompt = await optimizePromptWithAI(
        currentSpec.agent.systemPrompt,
        testResults[i],
        optimizerConfig
      );
      
      // Update the spec with the improved prompt
      improvements.push(`Iteration ${i + 1}: Updated system prompt based on test results`);
      currentSpec = {
        ...currentSpec,
        agent: {
          ...currentSpec.agent,
          systemPrompt: improvedPrompt
        }
      };
      
      // Regenerate the test file with the updated spec
      const updatedTestCode = transpileToVitest(currentSpec);
      fs.writeFileSync(testFilePath, updatedTestCode, 'utf8');
    }
    
    // Save the optimized spec if an output path is provided
    if (outputPath) {
      const yamlOutput = yaml.dump(currentSpec);
      fs.writeFileSync(outputPath, yamlOutput, 'utf8');
      console.log(`Optimized spec saved to: ${outputPath}`);
    }
    
    // Clean up temporary files
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    
    return {
      originalSpec,
      optimizedSpec: currentSpec,
      iterations: optimizerConfig.iterations,
      testResults,
      improvements
    };
  } catch (error) {
    console.error('Optimization failed:', error);
    // Clean up temporary files
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    throw error;
  }
}
