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
}

// Define a minimal Task interface matching what we expect from Vitest
interface Task {
  name: string;
  state: string;
  result?: {
    state: string;
    duration: number | null;
    errors?: Error[];
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
      test: {
        include: absolutePaths,
        environment: 'node',
      },
    });
    
    // Provide context to tests if specified
    if (options.systemMessage) {
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
    
    // Get the test results
    const files = vitest.state.getFiles();
    // @ts-ignore API may have changed or types are incomplete
    const tasks: Task[] = vitest.state.getTasksWithPath();
    
    // Collect errors
    const taskErrors: Error[] = [];
    const taskResults = tasks.map((task) => {
      const result = {
        name: task.name,
        state: task.state,
        duration: task.result?.duration ?? null,
      };
      
      if (task.result?.state === 'fail') {
        const error = task.result.errors?.[0];
        if (error) {
          taskErrors.push(error);
          return { ...result, error };
        }
      }
      
      return result;
    });
    
    // Clean up
    await vitest.close();
    
    // Determine success
    const success = taskErrors.length === 0;
    
    if (!options.silent) {
      if (success) {
        console.log('✅ All tests passed!');
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
    };
  } catch (error) {
    console.error('Failed to run tests:', error);
    return {
      success: false,
      taskResults: [],
      taskErrors: [error instanceof Error ? error : new Error(String(error))],
      exitCode: 1,
    };
  }
}