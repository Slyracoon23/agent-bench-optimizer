import { openai } from '@ai-sdk/openai';
import { generateText, generateObject, type LanguageModelV1 } from 'ai';
import { z } from 'zod';

// Test suite storage
const testSuites: Array<{name: string, tests: Array<{name: string, fn: Function}>}> = [];
let currentSuite: {name: string, tests: Array<{name: string, fn: Function}>} | null = null;

/**
 * Options for running an Agent
 */
export interface AgentOptions {
  /** The input text to process */
  input: string;
  /** Optional tools the agent can use */
  tools?: Record<string, (...args: any[]) => Promise<any>>;
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
 * The benchmark function groups tests together.
 */
export function benchmark(name: string, suiteCallback: () => void): void {
  currentSuite = { name, tests: [] };
  testSuites.push(currentSuite);
  suiteCallback();
  currentSuite = null;
}

/**
 * The test function registers an individual test.
 * It injects a new instance of a simulated Agent to the test callback.
 */
export function test(
  name: string,
  testCallback: (context: { agent: Agent; judge: Judge }) => Promise<void> | void
): void {
  if (!currentSuite) {
    throw new Error('Test must be defined within a benchmark');
  }
  
  currentSuite.tests.push({
    name,
    fn: async () => {
      const agent: Agent = {
        model: openai('gpt-4o-mini'),
        run: async ({ input }) => {
          console.log(`    📝 Input: "${input}"`);
          const result = await generateText({
            model: agent.model,
            prompt: input
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

      await testCallback({ agent, judge });
    }
  });
}

/**
 * Run all registered tests
 */
export async function runTests(): Promise<void> {
  for (const suite of testSuites) {
    console.log(`\n🔬 Running benchmark: ${suite.name}`);
    
    for (const test of suite.tests) {
      try {
        console.log(`\n  ▶️ ${test.name}`);
        await test.fn();
        console.log(`  ✅ Passed`);
      } catch (error) {
        console.error(`  ❌ Failed:`, error);
      }
    }
  }
}
