import { openai } from '@ai-sdk/openai';
import { generateText, generateObject, type LanguageModelV1, type Tool } from 'ai';
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
export interface AgentOptions {
  /** The input text to process */
  input: string;
  /** Optional tools the agent can use */
  tools?: Record<string, Tool<z.ZodType>>;
  /** Optional system prompt to guide the agent's behavior */
  systemPrompt?: string;
}

/**
 * Interface for an AI Agent that wraps a LanguageModelV1
 */
export interface Agent {
  /** The underlying language model */
  model: LanguageModelV1;

  /**
   * Runs the agent with the given input
   * @param options Configuration for running the agent
   * @returns Promise resolving to the agent's response
   */
  run: (options: AgentOptions) => Promise<{
    /** The final text response from the agent */
    response: string;
    /** Usage statistics */
    usage: {
      promptTokens: number;
      completionTokens: number;
    };
  }>;
}

/**
 * Interface for evaluating agent responses
 */
export interface Judge {
  /**
   * Evaluates an agent's response
   * @param result The result from the agent's run
   * @param evaluationPrompt Custom prompt to guide the evaluation
   * @returns Promise resolving to evaluation results
   */
  evaluate: (
    result: Awaited<ReturnType<Agent['run']>>,
    evaluationPrompt: string
  ) => Promise<{
    /** Whether the response passed evaluation */
    passed: boolean;
    /** Feedback on the response */
    feedback: string;
  }>;
}

/**
 * Creates a test context with Agent and Judge instances
 */
function createTestContext() {
  const agent: Agent = {
    model: openai('gpt-4o-mini'),
    run: async ({ input, tools, systemPrompt }) => {
      console.log(`    📝 Input: "${input}"`);
      const result = await generateText({
        model: agent.model,
        prompt: input,
        system: systemPrompt,
        tools,
        maxSteps: 5
      });
      console.log(`    🤖 Response: "${result.text}"`);
      console.log(`    📊 Tokens: ${result.usage.promptTokens} prompt, ${result.usage.completionTokens} completion`);
      return {
        response: result.text,
        usage: result.usage
      };
    }
  };

  const judge: Judge = {
    evaluate: async (result, evaluationPrompt) => {
      const evaluation = await generateObject({
        model: openai('gpt-4o-mini'),
        prompt: evaluationPrompt,
        schema: z.object({
          passed: z.boolean(),
          feedback: z.string()
        })
      });
      
      console.log(`    📈 Passed: ${evaluation.object.passed ? '✅' : '❌'}`);
      console.log(`    💭 Feedback: ${evaluation.object.feedback}`);
      
      return evaluation.object;
    }
  };

  return { agent, judge };
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
  testCallback: (context: { agent: Agent; judge: Judge }) => Promise<void> | void
): void {
  it(name, async () => {
    const context = createTestContext();
    await testCallback(context);
  });
}
