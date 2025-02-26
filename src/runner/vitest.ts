import { inspect } from 'node:util';
import { createVitest } from 'vitest/node';
import path from 'path';

export interface RunOptions {
  watch?: boolean;
  reporter?: string;
  silent?: boolean;
  systemMessage?: string;
  context?: Record<string, any>;
}

export interface RunResult {
  success: boolean;
  taskResults: Array<{
    name: string;
    state: string;
    duration: number | null;
    error?: Error;
  }>;
  taskErrors: Error[];
  exitCode: number;
  responseData?: any[];
  rawTestResults?: string; // Change to string type for the inspected test files data
}

// Define a minimal Task interface matching what we expect from Vitest
interface Task {
  name: string;
  state: string;
  result?: {
    state: string;
    duration: number | null;
    errors?: Error[];
    meta?: {
      responseData?: any;
    };
  };
}

/**
 * Runs test files using the Vitest API directly
 * 
 * @param testFilePaths Array of paths to test files
 * @param options Run options
 * @returns Result of the test run
 */
export async function runTests(
  testFilePaths: string | string[],
  options: RunOptions = {}
): Promise<RunResult> {
  const filePaths = Array.isArray(testFilePaths) ? testFilePaths : [testFilePaths];
  
  // Convert to absolute paths
  const absolutePaths = filePaths.map(file => path.resolve(file));
  
  try {
    // Create Vitest instance with minimal configuration that uses the config file
    const vitest = await createVitest('test', {
      root: process.cwd(),
    }, {
      test: {
        include: absolutePaths,
        environment: 'node',
        globals: true,
        // Basic settings
        watch: options.watch ?? false,
        reporters: options.reporter ? [options.reporter] : undefined,
        testTimeout: 10000,
      }
    });
    
    // Provide context to tests if specified
    if (options.systemMessage) {
      console.log('Setting system message for tests...');
      // @ts-ignore Type definitions don't match runtime behavior
      vitest.provide('systemMessage', options.systemMessage);
    }
    
    // Provide additional context values
    if (options.context) {
      Object.entries(options.context).forEach(([key, value]) => {
        // @ts-ignore Type definitions don't match runtime behavior
        vitest.provide(key, value);
      });
    }
    
    // Start the tests
    await vitest.start();
    
    // Get test files and tasks from Vitest state
    const files = vitest.state.getFiles();
    
    // Use inspect to capture the full test files data with better handling of circular references
    const rawTestResults = inspect(files, { 
      depth: 8, 
      colors: false, 
      maxArrayLength: Infinity,
      maxStringLength: Infinity
    });
    
    // Collect errors and response data
    const taskErrors: Error[] = [];
    const responseData: any[] = [];
    
    // Process test results from files
    const taskResults = files.map((file) => {
      // Get tasks from file
      const tasks = file.tasks || [];
      
      // Use the file name if it's a single task file, otherwise use unknown
      const name = file.name;
      // Use the file result state or unknown
      const state = file.result?.state ?? 'unknown';
      const duration = file.result?.duration ?? null;
      
      const result = { name, state, duration };
      
      // Collect response data if available (using type assertion to access custom properties)
      const fileResult = file.result as any;
      if (fileResult?.meta?.responseData) {
        responseData.push({
          taskName: file.name,
          data: fileResult.meta.responseData
        });
      }
      
      // Collect errors
      if (file.result?.state === 'fail') {
        const error = file.result.errors?.[0];
        if (error) {
          // Ensure error is a proper Error object
          const properError = error instanceof Error ? error : new Error(String(error));
          taskErrors.push(properError);
          return { ...result, error: properError };
        }
      }
      
      return result;
    });
    
    // Clean up
    await vitest.close();
    
    // Determine success based on task errors
    // Note: This is a minimal success condition - the actual pass rate can be calculated by consumers
    const success = taskErrors.length === 0;
    
    if (!options.silent) {
      if (success) {
        console.log('✅ All tests successfully completed (no errors thrown)');
        // Calculate pass rate for display
        const totalTasks = taskResults.length;
        const passedTasks = taskResults.filter(task => task.state === 'pass').length;
        const passRate = totalTasks > 0 ? (passedTasks / totalTasks) * 100 : 0;
        console.log(`Pass rate: ${passRate.toFixed(2)}% (${passedTasks}/${totalTasks} tasks passed)`);
      } else {
        console.error('❌ Tests failed!');
        taskErrors.forEach(error => {
          console.error(error);
        });
      }
    }
    
    return {
      success,
      taskResults,
      taskErrors,
      exitCode: 0,
      responseData: responseData.length > 0 ? responseData : undefined,
      rawTestResults // Include the inspected test results in the return
    };
  } catch (error) {
    console.error('Failed to run tests:', error);
    return {
      success: false,
      taskResults: [],
      taskErrors: [error instanceof Error ? error : new Error(String(error))],
      exitCode: 1
    };
  }
}