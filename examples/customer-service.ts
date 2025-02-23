import 'dotenv/config';
import { benchmark, test, runTests } from '../index';

// Define and run your benchmarks
benchmark('Customer Service Agent Tests', () => {
  test('handle customer inquiry', async ({ agent, judge }) => {
    const result = await agent.run({
      input: "How can I reset my password?",
      tools: {
        checkUserAccount: async () => ({ exists: true, lastLogin: '2024-03-15' })
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
        checkOrderHistory: async () => ({ 
          lastOrder: {
            id: '12345',
            date: '2024-03-10',
            status: 'delivered'
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
});

// Run all benchmarks
runTests().catch(console.error); 