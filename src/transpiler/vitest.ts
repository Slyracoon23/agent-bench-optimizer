import { AgentSpec, Tool } from '../schemas/agent-spec';
import dedent from 'dedent';

/**
 * Transpiles an agent specification into a Vitest test file
 * 
 * @param spec The parsed agent specification
 * @returns Generated TypeScript code for Vitest tests
 */
export function transpileToVitest(spec: AgentSpec): string {
  const imports = generateImports();
  const schemas = generateSchemas(spec.schemas);
  const tests = generateTests(spec);
  
  return dedent`
    ${imports}
    
    ${schemas}
    
    describe('${spec.metadata.name}', () => {
      const customerServiceSystemPrompt = dedent\`
        ${spec.agent.systemPrompt.replace(/`/g, '\\`')}
      \`;
      
      const model = openai('${spec.agent.model}');
      
      ${tests}
    });
  `;
}

/**
 * Generates import statements for the test file
 */
function generateImports(): string {
  return dedent`
    import 'dotenv/config';
    import { z } from 'zod';
    import { describe, it, expect } from 'vitest';
    import dedent from 'dedent';
    import { openai } from '@ai-sdk/openai';
    import { generateText, generateObject } from 'ai';

    // Ensure API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error('Error: OPENAI_API_KEY environment variable is not set.');
      console.error('Please set it in your .env file or environment variables.');
      process.exit(1);
    }
  `;
}

/**
 * Generates Zod schema definitions from the spec
 */
function generateSchemas(schemas: Record<string, any>): string {
  return Object.entries(schemas)
    .map(([name, schema]) => {
      const schemaProps = Object.entries(schema.properties || {})
        .map(([propName, propDef]: [string, any]) => {
          let zodType = 'z.any()';
          if (propDef.type === 'string') zodType = 'z.string()';
          if (propDef.type === 'number') zodType = 'z.number()';
          if (propDef.type === 'boolean') zodType = 'z.boolean()';
          if (propDef.type === 'object') {
            // Handle nested objects
            if (propDef.properties) {
              const nestedProps = Object.entries(propDef.properties)
                .map(([nestedName, nestedDef]: [string, any]) => {
                  let nestedType = 'z.any()';
                  if (nestedDef.type === 'string') nestedType = 'z.string()';
                  if (nestedDef.type === 'number') nestedType = 'z.number()';
                  if (nestedDef.type === 'boolean') nestedType = 'z.boolean()';
                  return `${nestedName}: ${nestedType}`;
                })
                .join(',\n      ');
              
              zodType = `z.object({\n      ${nestedProps}\n    })`;
            } else {
              zodType = 'z.object({})';
            }
          }
          return `  ${propName}: ${zodType}`;
        })
        .join(',\n');
      
      return dedent`
        const ${name} = z.object({
        ${schemaProps}
        });
      `;
    })
    .join('\n\n');
}

/**
 * Generates test cases from benchmarks
 */
function generateTests(spec: AgentSpec): string {
  return spec.benchmarks
    .map(benchmark => {
      const toolsParam = benchmark.tools && benchmark.tools.length > 0
        ? generateToolsParam(spec.tools, benchmark.tools)
        : '{}';
      
      // Get initial message from the benchmark
      const initialMessage = benchmark.messages.find(m => m.role === 'user')?.content || '';
      
      return dedent`
        it('${benchmark.name}', async () => {
          const result = await generateText({
            model,
            system: customerServiceSystemPrompt,
            prompt: ${JSON.stringify(initialMessage)},
            ${spec.agent.maxSteps ? `maxSteps: ${spec.agent.maxSteps},` : ''}
            tools: ${toolsParam}
          });
        
          console.log('\\n    📊 Complete Result:');
          console.log(JSON.stringify(result, null, 2).split('\\n').map(line => \`    \${line}\`).join('\\n'));
        
          const evaluation = await generateObject({
            model,
            prompt: dedent\`
              Given this customer service response result:
              \${JSON.stringify(result, null, 2)}
        
              ${benchmark.judge.evaluationPrompt.replace(/\{result\}/g, '${JSON.stringify(result, null, 2)}')}
            \`,
            schema: ${benchmark.judge.evaluationSchema}
          });
        
          console.log('\\n    🤖 Evaluation Result:');
          console.log(JSON.stringify(evaluation.object, null, 2).split('\\n').map(line => \`    \${line}\`).join('\\n'));
          console.log(\`    📈 Final Verdict: \${evaluation.object.passed ? '✅ PASSED' : '❌ FAILED'}\`);
          
          expect(evaluation.object.passed, evaluation.object.feedback).toBe(true);
          ${benchmark.judge.expected.score ? 
            `expect(evaluation.object.score).toBeGreaterThanOrEqual(${benchmark.judge.expected.score.min});` : 
            ''}
        });
      `;
    })
    .join('\n\n');
}

/**
 * Generates tool parameters for the test
 */
function generateToolsParam(allTools: Record<string, Tool>, toolNames: string[]): string {
  const toolEntries = toolNames.map(name => {
    const tool = allTools[name];
    if (!tool) return null;
    
    return `
      ${name}: {
        description: ${JSON.stringify(tool.description)},
        parameters: z.object({
          ${generateToolParameters(tool.inputSchema)}
        }),
        execute: async (params) => {
          const response = await generateObject({
            model,
            prompt: \`Generate ${name} result \${JSON.stringify(params)}\`,
            schema: ${typeof tool.outputSchema === 'string' ? tool.outputSchema : JSON.stringify(tool.outputSchema)}
          });
          return response.object;
        }
      }`;
  }).filter(Boolean);
  
  return `{${toolEntries.join(',')}}`;
}

/**
 * Generates Zod parameters for tool inputs
 */
function generateToolParameters(inputSchema: any): string {
  if (!inputSchema || !inputSchema.properties) return '';
  
  return Object.entries(inputSchema.properties)
    .map(([name, def]: [string, any]) => {
      let zodType = 'z.any()';
      if (def.type === 'string') zodType = 'z.string()';
      if (def.type === 'number') zodType = 'z.number()';
      if (def.type === 'boolean') zodType = 'z.boolean()';
      
      return `${name}: ${zodType}${def.description ? `.describe(${JSON.stringify(def.description)})` : ''}`;
    })
    .join(',\n          ');
}