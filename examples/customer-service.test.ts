import 'dotenv/config';
import { benchmark, test, tool, generateFromInput } from '../index';
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

// Define and run your benchmarks
benchmark('Customer Service Agent Tests', () => {
  test('handle customer inquiry', async ({ agent, judge }) => {
    const result = await agent.run({
      input: "How can I reset my password?",
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

    await judge.evaluate(result, {
      accuracy: 0.9,
      helpfulness: 0.8,
      tone: 0.9
    });
  });

  test('handle product complaint', async ({ agent, judge }) => {
    const result = await agent.run({
      input: "The product I received is damaged. What should I do?",
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

    await judge.evaluate(result, {
      empathy: 0.9,
      solutionQuality: 0.8,
      professionalism: 0.9
    });
  });

  test('handle weather inquiry', async ({ agent, judge }) => {
    const result = await agent.run({
      input: "What's the weather in San Francisco?",
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

    await judge.evaluate(result, {
      accuracy: 0.9,
      relevance: 0.8,
      completeness: 0.9
    });
  });
}); 