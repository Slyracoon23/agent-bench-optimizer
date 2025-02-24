import fs from 'fs';
import yaml from 'js-yaml';
import { AgentSpecSchema, AgentSpec } from '../schemas/agent-spec';
import { z } from 'zod';

/**
 * Parses a YAML agent specification file and validates it
 * 
 * @param filePath Path to the YAML specification file
 * @returns Parsed and validated agent specification
 */
export async function parseYamlSpec(filePath: string): Promise<AgentSpec> {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsed = yaml.load(fileContent) as unknown;
    
    // Validate the parsed YAML against our schema
    return AgentSpecSchema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error in spec file:');
      console.error(JSON.stringify(error.format(), null, 2));
    } else {
      console.error(`Error parsing YAML file: ${filePath}`);
      console.error(error);
    }
    throw error;
  }
}