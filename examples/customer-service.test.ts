import 'dotenv/config';
import { z } from 'zod';
import { describe, it, expect } from 'vitest';
import dedent from 'dedent';
import { openai } from '@ai-sdk/openai';
import { generateText, generateObject } from 'ai';

// Define schemas for all tool return types
const UserAccountSchema = z.object({
  exists: z.boolean(),
  lastLogin: z.string()
});

const OrderHistorySchema = z.object({
  lastOrder: z.object({
    id: z.string(),
    date: z.string(),
    status: z.string()
  })
});

const WeatherSchema = z.object({
  location: z.string(),
  temperature: z.number(),
  conditions: z.string()
});

// Evaluation schema
const EvaluationSchema = z.object({
  passed: z.boolean(),
  feedback: z.string()
});

describe('Customer Service Agent Tests', () => {
  const customerServiceSystemPrompt = dedent`
    You are a helpful and professional customer service agent. Your responses should be:
    1. Polite and empathetic
    2. Clear and concise
    3. Focused on resolving the customer's issue
    4. Security-conscious when dealing with account-related matters
    
    Always verify customer information when needed and provide clear next steps.
  `;

  const model = openai('gpt-4o-mini');

  it('handle customer inquiry', async () => {
    const result = await generateText({
      model,
      system: customerServiceSystemPrompt,
      prompt: "How can I reset my password?",
      maxSteps: 5,
      tools: {
        checkUserAccount: {
          description: 'Check user account status and last login',
          parameters: z.object({}),
          execute: async (params) => {
            const response = await generateObject({
              model,
              prompt: "Generate a user account status check result",
              schema: UserAccountSchema
            });
            return response.object;
          }
        }
      }
    });

    console.log('\n    📊 Complete Result:');
    console.log(JSON.stringify(result, null, 2).split('\n').map(line => `    ${line}`).join('\n'));

    const evaluation = await generateObject({
      model,
      prompt: dedent`
        Given this customer service response result:
        ${JSON.stringify(result, null, 2)}

        Evaluate if the response is clear, secure, and helpful. The response should include specific steps and security considerations. Pass only if it meets these criteria.
      `,
      schema: EvaluationSchema
    });

    console.log('\n    🤖 Evaluation Result:');
    console.log(JSON.stringify(evaluation.object, null, 2).split('\n').map(line => `    ${line}`).join('\n'));
    console.log(`    📈 Final Verdict: ${evaluation.object.passed ? '✅ PASSED' : '❌ FAILED'}`);
    expect(evaluation.object.passed, evaluation.object.feedback).toBe(true);
  });

  it('handle product complaint', async () => {
    const result = await generateText({
      model,
      system: customerServiceSystemPrompt,
      prompt: "The product I received is damaged. What should I do?",
      tools: {
        checkOrderHistory: {
          description: 'Check customer order history',
          parameters: z.object({}),
          execute: async (params) => {
            const response = await generateObject({
              model,
              prompt: "Generate an order history check result",
              schema: OrderHistorySchema
            });
            return response.object;
          }
        }
      }
    });

    console.log('\n    📊 Complete Result:');
    console.log(JSON.stringify(result, null, 2).split('\n').map(line => `    ${line}`).join('\n'));

    const evaluation = await generateObject({
      model,
      prompt: dedent`
        Given this customer service response result:
        ${JSON.stringify(result, null, 2)}

        Evaluate if the response is clear, secure, and helpful. The response should include specific steps and security considerations. Pass only if it meets these criteria.
      `,
      schema: EvaluationSchema
    });

    console.log('\n    🤖 Evaluation Result:');
    console.log(JSON.stringify(evaluation.object, null, 2).split('\n').map(line => `    ${line}`).join('\n'));
    console.log(`    📈 Final Verdict: ${evaluation.object.passed ? '✅ PASSED' : '❌ FAILED'}`);
    expect(evaluation.object.passed, evaluation.object.feedback).toBe(true);
  });

  it('handle weather inquiry', async () => {
    const result = await generateText({
      model,
      system: customerServiceSystemPrompt,
      prompt: "What's the weather in San Francisco?",
      tools: {
        weather: {
          description: 'Get the weather in a location',
          parameters: z.object({
            location: z.string().describe('The location to get the weather for'),
          }),
          execute: async (params) => {
            const response = await generateObject({
              model,
              prompt: `Generate weather information for ${params.location}`,
              schema: WeatherSchema
            });
            return response.object;
          }
        }
      }
    });

    console.log('\n    📊 Complete Result:');
    console.log(JSON.stringify(result, null, 2).split('\n').map(line => `    ${line}`).join('\n'));

    const evaluation = await generateObject({
      model,
      prompt: dedent`
        Given this customer service response result:
        ${JSON.stringify(result, null, 2)}

        Evaluate if the response is clear, secure, and helpful. The response should include specific steps and security considerations. Pass only if it meets these criteria.
      `,
      schema: EvaluationSchema
    });

    console.log('\n    🤖 Evaluation Result:');
    console.log(JSON.stringify(evaluation.object, null, 2).split('\n').map(line => `    ${line}`).join('\n'));
    console.log(`    📈 Final Verdict: ${evaluation.object.passed ? '✅ PASSED' : '❌ FAILED'}`);
    expect(evaluation.object.passed, evaluation.object.feedback).toBe(true);
  });
}); 