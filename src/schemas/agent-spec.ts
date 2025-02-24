import { z } from 'zod';

// Schema definitions for properties/components
export const MetadataSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  date: z.string().optional(),
});

export const SchemaPropertySchema = z.object({
  type: z.string(),
  properties: z.record(z.object({
    type: z.string(),
    description: z.string().optional(),
  }).passthrough()),
  required: z.array(z.string()).optional(),
}).passthrough();

export const GeneratorSchema = z.union([
  z.object({
    type: z.literal('date'),
    range: z.object({
      start: z.string(),
      end: z.string(),
    }),
  }).passthrough(),
  z.object({
    type: z.literal('list'),
    values: z.array(z.any()),
  }).passthrough(),
  z.object({
    type: z.literal('pattern'),
    format: z.string(),
  }).passthrough(),
  z.object({
    type: z.literal('number'),
    range: z.object({
      min: z.number(),
      max: z.number(),
    }),
  }).passthrough(),
]);

export const ToolSchema = z.object({
  description: z.string(),
  inputSchema: z.object({
    type: z.string(),
    properties: z.record(z.any()).optional(),
  }).passthrough(),
  outputSchema: z.union([z.string(), z.any()]),
  generate: z.object({
    template: z.record(z.any()),
  }).optional(),
}).passthrough();

export const MessageSchema = z.object({
  role: z.string(),
  content: z.string(),
});

export const BenchmarkSchema = z.object({
  name: z.string(),
  seed: z.number().optional(),
  messages: z.array(MessageSchema),
  tools: z.array(z.string()).optional(),
  judge: z.object({
    evaluationPrompt: z.string(),
    evaluationSchema: z.string(),
    expected: z.object({
      passed: z.boolean(),
      score: z.object({
        min: z.number(),
      }).optional(),
    }).passthrough(),
  }),
}).passthrough();

export const AgentSchema = z.object({
  model: z.string(),
  systemPrompt: z.string(),
  toolChoice: z.union([z.string(), z.record(z.any())]),
  maxSteps: z.number().optional(),
}).passthrough();

// Main schema for the entire agent specification
export const AgentSpecSchema = z.object({
  metadata: MetadataSchema,
  schemas: z.record(SchemaPropertySchema),
  generators: z.record(GeneratorSchema).optional(),
  agent: AgentSchema,
  tools: z.record(ToolSchema),
  benchmarks: z.array(BenchmarkSchema),
});

export type AgentSpec = z.infer<typeof AgentSpecSchema>;
export type Tool = z.infer<typeof ToolSchema>;
export type Benchmark = z.infer<typeof BenchmarkSchema>;