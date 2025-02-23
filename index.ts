import { openai } from '@ai-sdk/openai';
import { generateText, generateObject, type LanguageModelV1, type Tool } from 'ai';
import { z } from 'zod';
import { describe, it } from 'vitest';

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
 * Helper function to generate an object from input using a schema
 */
export async function generateFromInput<T extends z.ZodType>({
  model,
  input,
  schema,
  context = ''
}: {
  model: LanguageModelV1;
  input: string;
  schema: T;
  context?: string;
}): Promise<z.infer<T>> {
  const result = await generateObject({
    model,
    prompt: `${context ? context + '\n' : ''}Given this input: "${input}", generate appropriate parameters:`,
    schema
  });
  return result.object;
}

/**
 * Options for running an Agent
 */
export interface AgentOptions {
  /** The input text to process */
  input: string;
  /** Optional tools the agent can use */
  tools?: Record<string, Tool<z.ZodType>>;
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
   * Evaluates an agent's response against specified criteria
   * @param result The result from the agent's run
   * @param criteria Map of criteria names to target scores (0-1)
   * @returns Promise resolving to evaluation results
   */
  evaluate: (
    result: Awaited<ReturnType<Agent['run']>>,
    criteria: Record<string, number>
  ) => Promise<{
    /** Overall score (0-1) */
    score: number;
    /** Individual criteria scores */
    scores: Record<string, number>;
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
    run: async ({ input, tools }) => {
      console.log(`    📝 Input: "${input}"`);
      const result = await generateText({
        model: agent.model,
        prompt: input,
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
    evaluate: async (result, criteria) => {
      console.log('    ⚖️ Evaluating against criteria:', criteria);
      const evaluation = await generateObject({
        model: openai('gpt-4o-mini'),
        prompt: `Evaluate this response: "${result.response}" against these criteria: ${JSON.stringify(criteria)}`,
        schema: z.object({
          score: z.number().min(0).max(1),
          scores: z.record(z.number().min(0).max(1)),
          feedback: z.string()
        })
      });
      
      console.log(`    📈 Overall score: ${evaluation.object.score.toFixed(2)}`);
      console.log(`    🎯 Criteria scores:`, evaluation.object.scores);
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
