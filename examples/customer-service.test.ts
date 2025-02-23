import 'dotenv/config';
import { benchmark, test, tool, dedent } from '../index';
import { z } from 'zod';
import { generateObject } from 'ai';

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

// Define and run your benchmarks
benchmark('Customer Service Agent Tests', () => {
  const customerServiceSystemPrompt = dedent`
    You are a helpful and professional customer service agent. Your responses should be:
    1. Polite and empathetic
    2. Clear and concise
    3. Focused on resolving the customer's issue
    4. Security-conscious when dealing with account-related matters
    
    Always verify customer information when needed and provide clear next steps.
  `;

  test('handle customer inquiry', async ({ agent }) => {
    const result = await agent.run({
      model: agent.model,
      system: customerServiceSystemPrompt,
      prompt: "How can I reset my password?",
      tools: {
        checkUserAccount: tool({
          description: 'Check user account status and last login',
          parameters: z.object({}),
          execute: async (params) => {
            const response = await generateObject({
              model: agent.model,
              prompt: "Generate a user account status check result",
              schema: UserAccountSchema
            });
            return response.object;
          }
        })
      }
    });

    const evaluation = await generateObject({
      model: agent.model,
      prompt: dedent`
        Given this response to a password reset request: "${result.response}"

        Evaluate if the response is clear, secure, and helpful. The response should include specific steps and security considerations. Pass only if it meets these criteria.
      `,
      schema: EvaluationSchema
    });

    console.log(`    📈 Passed: ${evaluation.object.passed ? '✅' : '❌'}`);
    console.log(`    💭 Feedback: ${evaluation.object.feedback}`);
  });

  test('handle product complaint', async ({ agent }) => {
    const result = await agent.run({
      model: agent.model,
      system: customerServiceSystemPrompt,
      prompt: "The product I received is damaged. What should I do?",
      tools: {
        checkOrderHistory: tool({
          description: 'Check customer order history',
          parameters: z.object({}),
          execute: async (params) => {
            const response = await generateObject({
              model: agent.model,
              prompt: "Generate an order history check result",
              schema: OrderHistorySchema
            });
            return response.object;
          }
        })
      }
    });

    const evaluation = await generateObject({
      model: agent.model,
      prompt: dedent`
        Evaluate this customer service response: "${result.response}"

        For a damaged product complaint, check if the response:
        1) Shows empathy for the customer's situation
        2) Provides clear return/replacement instructions
        3) Mentions warranty/guarantee if applicable

        Pass only if all criteria are met.
      `,
      schema: EvaluationSchema
    });

    console.log(`    📈 Passed: ${evaluation.object.passed ? '✅' : '❌'}`);
    console.log(`    💭 Feedback: ${evaluation.object.feedback}`);
  });

  test('handle weather inquiry', async ({ agent }) => {
    const result = await agent.run({
      model: agent.model,
      system: customerServiceSystemPrompt,
      prompt: "What's the weather in San Francisco?",
      tools: {
        weather: tool({
          description: 'Get the weather in a location',
          parameters: z.object({
            location: z.string().describe('The location to get the weather for'),
          }),
          execute: async (params) => {
            const response = await generateObject({
              model: agent.model,
              prompt: `Generate weather information for ${params.location}`,
              schema: WeatherSchema
            });
            return response.object;
          }
        }),
      }
    });

    const evaluation = await generateObject({
      model: agent.model,
      prompt: dedent`
        For this weather query response: "${result.response}"

        Check if it includes:
        - Temperature
        - Current conditions
        - Location confirmation

        The response should be clear and complete. Pass only if all information is present and well-formatted.
      `,
      schema: EvaluationSchema
    });

    console.log(`    📈 Passed: ${evaluation.object.passed ? '✅' : '❌'}`);
    console.log(`    💭 Feedback: ${evaluation.object.feedback}`);
  });
}); 