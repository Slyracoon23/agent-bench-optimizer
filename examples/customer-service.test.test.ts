import 'dotenv/config';
import { z } from 'zod';
import { describe, it, expect, inject } from 'vitest';
import dedent from 'dedent';
import { openai } from '@ai-sdk/openai';
import { generateText, generateObject } from 'ai';

// Ensure API key is available
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not set.');
  console.error('Please set it in your .env file or environment variables.');
  process.exit(1);
}

const EvaluationSchema = z.object({
  passed: z.boolean(),
  feedback: z.string(),
  score: z.any()
});

const UserAccountSchema = z.object({
  exists: z.boolean(),
  lastLogin: z.string(),
  status: z.string()
});

const WeatherSchema = z.object({
  location: z.string(),
  temperature: z.number(),
  conditions: z.string()
});

describe('Customer Service Agent with Multi-Turn Conversations', () => {
  // Get the system message from inject() if provided, otherwise use the one from the spec
  const systemMessage = inject("systemMessage") ?? dedent`
      You are a helpful and professional customer service agent. Your responses should be:
1. Polite and empathetic.
2. Clear and concise.
3. Focused on resolving the customer's issue.
4. Security-conscious when handling account details.

    `;

  const model = openai('gpt-4o-mini');

  it('Password Reset Inquiry', async () => {
    // Create agent with the injected system prompt
    const agent = {
      model,
      systemMessage
    };

    // Run the agent on the benchmark
    const result = await generateText({
      model,
      system: systemMessage,
      prompt: "How can I reset my password?",
      maxSteps: 3,
      tools: {
        checkUserAccount: {
          description: "Check user account details",
          parameters: z.object({
            userId: z.string()
          }),
          execute: async (params) => {
            const response = await generateObject({
              model,
              prompt: `Generate checkUserAccount result ${JSON.stringify(params)}`,
              schema: UserAccountSchema
            });
            return response.object;
          }
        }
      }
    });

    console.log('\
  📊 Complete Result:');
    console.log(JSON.stringify(result, null, 2));

    // Store response data for optimizer to analyze
    const responseData = {
      prompt: "How can I reset my password?",
      response: result,
      systemMessage
    };

    // @ts-expect-error - Custom Vitest API
    if (typeof __vitest_meta__ !== 'undefined') {
      __vitest_meta__.responseData = responseData;
    }

    const evaluation = await generateObject({
      model,
      prompt: dedent`
          Given this customer service response result:
          ${JSON.stringify(result, null, 2)}
    
          Given the agent's response:
${JSON.stringify(result, null, 2)}

Evaluate the response based on:
- Clarity: Should be understandable.
- Security: No sensitive account details exposed.
- Helpfulness: Must include clear steps for password reset.
- Correct flow: Ensure that the assistant asks for email confirmation and provides reset options.
Pass only if all criteria are met.

        `,
      schema: EvaluationSchema
    });

    console.log('\
  🤖 Evaluation Result:');
    console.log(JSON.stringify(evaluation.object, null, 2));
    console.log(`    📈 Final Verdict: ${evaluation.object.passed ? '✅ PASSED' : '❌ FAILED'}`);

    expect(evaluation.object.passed, evaluation.object.feedback).toBe(true);
    expect(evaluation.object.score).toBeGreaterThanOrEqual(80);
  });

  it('Weather Inquiry', async () => {
    // Create agent with the injected system prompt
    const agent = {
      model,
      systemMessage
    };

    // Run the agent on the benchmark
    const result = await generateText({
      model,
      system: systemMessage,
      prompt: "What's the weather like in San Francisco?",
      maxSteps: 3,
      tools: {
        weather: {
          description: "Get weather information for a location",
          parameters: z.object({
            location: z.string()
          }),
          execute: async (params) => {
            const response = await generateObject({
              model,
              prompt: `Generate weather result ${JSON.stringify(params)}`,
              schema: WeatherSchema
            });
            return response.object;
          }
        }
      }
    });

    console.log('\
  📊 Complete Result:');
    console.log(JSON.stringify(result, null, 2));

    // Store response data for optimizer to analyze
    const responseData = {
      prompt: "What's the weather like in San Francisco?",
      response: result,
      systemMessage
    };

    // @ts-expect-error - Custom Vitest API
    if (typeof __vitest_meta__ !== 'undefined') {
      __vitest_meta__.responseData = responseData;
    }

    const evaluation = await generateObject({
      model,
      prompt: dedent`
          Given this customer service response result:
          ${JSON.stringify(result, null, 2)}
    
          Given the agent's response:
${JSON.stringify(result, null, 2)}

Evaluate the response based on:
- Clarity: Should be easy to understand.
- Accuracy: Weather info must be correct.
- Helpfulness: Should provide current and forecasted conditions.
- Correct flow: The agent should acknowledge both the current weather and the user's follow-up question.
Pass only if all criteria are met.

        `,
      schema: EvaluationSchema
    });

    console.log('\
  🤖 Evaluation Result:');
    console.log(JSON.stringify(evaluation.object, null, 2));
    console.log(`    📈 Final Verdict: ${evaluation.object.passed ? '✅ PASSED' : '❌ FAILED'}`);

    expect(evaluation.object.passed, evaluation.object.feedback).toBe(true);
    expect(evaluation.object.score).toBeGreaterThanOrEqual(80);
  });
});