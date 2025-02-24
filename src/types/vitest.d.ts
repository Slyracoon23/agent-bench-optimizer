// Type definitions for augmenting Vitest

// Add typing for the inject function and extend ProvidedContext
declare module 'vitest' {
  export function inject<T = any>(key: string): T | undefined;
  
  interface ProvidedContext {
    systemMessage?: string;
    spec?: any;
  }
}

// Define the meta object for storing test response data
declare const __vitest_meta__: {
  responseData?: any;
}; 