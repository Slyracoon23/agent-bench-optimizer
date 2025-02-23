import { openai } from '@ai-sdk/openai';
import {
  generateText,
  generateObject,
  type LanguageModelV1,
  type Tool,
  type GenerateTextResult,
} from 'ai';
import { z } from 'zod';
import { describe, it } from 'vitest';
import dedent from 'dedent';

export { dedent };

/**
 * Helper function to create a tool with type inference
 */
export function tool<T extends z.ZodType>(config: {
  description: string;
  parameters: T;
  execute: (params: z.infer<T>) => Promise<unknown>;
}): Tool<T> {
  return config as Tool<T>;
}

/**
 * Options for running an Agent
 */
export type AgentOptions = Parameters<typeof generateText>[0];

/**
 * Interface for an AI Agent that wraps a LanguageModelV1
 */
export interface Agent {
  /** The underlying language model */
  model: LanguageModelV1;

  /**
   * Runs the agent with the given input
   * @param options Configuration for running the agent
   * @returns Promise resolving to the complete generateText result
   */
  run: (options: AgentOptions) => Promise<GenerateTextResult<Record<string, Tool<z.ZodType>>, unknown>>;
}

/**
 * Creates a test context with Agent instance
 */
function createTestContext() {
  const agent: Agent = {
    model: openai('gpt-4o-mini'),
    run: async (options) => {
      console.log(`    📝 Input: "${options.prompt}"`);
      const result = await generateText({
        ...options,
        model: agent.model,
        maxSteps: options.maxSteps ?? 5
      });
      console.log(`    🤖 Response: "${result.text}"`);
      console.log(`    📊 Tokens: ${result.usage.promptTokens} prompt, ${result.usage.completionTokens} completion`);
      return result;
    }
  };

  return { agent };
}

/**
 * The benchmark function groups tests together using Vitest's describe
 */
export function benchmark(name: string, suiteCallback: () => void): void {
  describe(name, suiteCallback);
}

/**
 * The test function wraps Vitest's it function
 */
export function test(
  name: string,
  testCallback: (context: { agent: Agent }) => Promise<void> | void
): void {
  it(name, async () => {
    const context = createTestContext();
    await testCallback(context);
  });
}
