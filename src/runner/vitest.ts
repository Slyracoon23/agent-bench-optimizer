import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface RunOptions {
  watch?: boolean;
  reporter?: string;
  silent?: boolean;
}

export interface RunResult {
  success: boolean;
  exitCode: number;
  error?: Error;
}

/**
 * Creates a temporary Vitest config file to ensure tests are properly found
 * 
 * @param testFilePath Path to the test file
 * @returns Path to the temporary config file
 */
function createTempVitestConfig(testFilePath: string): string {
  const configContent = `
  import { defineConfig } from 'vitest/config';
  
  export default defineConfig({
    test: {
      include: ['${testFilePath.replace(/\\/g, '\\\\')}'],
      testTimeout: 30000, // Increase timeout to 30 seconds
      environmentOptions: {
        // Make sure to load environment variables from .env
        loadDotenv: true,
      },
    }
  });
  `;
  
  const configPath = path.join(path.dirname(testFilePath), 'vitest.temp.config.js');
  fs.writeFileSync(configPath, configContent, 'utf8');
  console.log(`[DEBUG] Created temporary Vitest config at: ${configPath}`);
  return configPath;
}

/**
 * Runs the generated test file with Vitest
 * 
 * @param testFilePath Path to the test file
 * @param options Run options
 * @returns Result of the test run
 */
export async function runTests(testFilePath: string, options: RunOptions = {}): Promise<RunResult> {
  // Create a temporary Vitest config
  const configPath = createTempVitestConfig(testFilePath);
  
  // Build vitest args
  const args = ['run'];
  
  // Add Vitest options
  if (options.watch) args.push('--watch');
  if (options.reporter) args.push('--reporter', options.reporter);
  
  // Use the config file
  args.push('-c', configPath);
  
  console.log(`[DEBUG] Running Vitest with args: ${args.join(' ')}`);
  console.log(`[DEBUG] Full command: ${path.resolve('node_modules', '.bin', 'vitest')} ${args.join(' ')}`);
  console.log(`[DEBUG] Current working directory: ${process.cwd()}`);
  
  // Load environment variables from .env
  try {
    require('dotenv').config();
    console.log(`[DEBUG] Loaded environment variables from .env`);
  } catch (error) {
    console.error(`[DEBUG] Error loading environment variables:`, error);
  }
  
  return new Promise<RunResult>((resolve) => {
    const vitestBin = path.resolve('node_modules', '.bin', 'vitest');
    console.log(`[DEBUG] Vitest binary path exists: ${fs.existsSync(vitestBin)}`);
    
    const proc = spawn(vitestBin, args, {
      stdio: options.silent ? 'ignore' : 'inherit',
      shell: true,
      // Pass current environment variables (including OPENAI_API_KEY) to the child process
      env: { ...process.env },
    });
    
    proc.on('close', (code) => {
      console.log(`[DEBUG] Vitest process exited with code: ${code}`);
      
      // Clean up temp config file
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
        console.log(`[DEBUG] Cleaned up temporary Vitest config`);
      }
      
      resolve({
        success: code === 0,
        exitCode: code || 0,
      });
    });
    
    proc.on('error', (error) => {
      console.error('[DEBUG] Failed to execute Vitest:', error);
      
      // Clean up temp config file
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
        console.log(`[DEBUG] Cleaned up temporary Vitest config`);
      }
      
      resolve({
        success: false,
        exitCode: 1,
        error,
      });
    });
  });
}