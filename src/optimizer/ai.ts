import { RunResult } from '@/runner/vitest.js';
import { Optimizer } from '@/schemas/agent-spec.js';
import { inspect } from 'node:util';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

/**
 * Default prompt template for optimizing system messages based on test results
 */
const DEFAULT_FEEDBACK_PROMPT = `
You are an expert AI prompt engineer. Your task is to improve the system prompt for an AI agent based on test results.

# Current System Prompt
{{currentPrompt}}

# Test Results
{{testResults}}

# Agent Responses
{{responseData}}

# Task
Analyze the test results and the agent's actual responses to identify why the agent failed. 
Then, improve the system prompt to address these failures.

Focus on making the system prompt more:
1. Clear and specific about the agent's role and capabilities
2. Explicit about constraints and requirements
3. Structured with examples if helpful

Return ONLY the improved system prompt. Do not include explanations, just the new prompt text.
`;

/**
 * Uses AI to optimize a system prompt based on test results
 * 
 * @param currentPrompt The current system prompt
 * @param testResult The test result to analyze
 * @param config Optimizer configuration
 * @returns An improved system prompt
 */
export async function optimizePromptWithAI(
  currentPrompt: string,
  testResult: RunResult,
  config: Optimizer
): Promise<string> {
  console.log(`Optimizing prompt using model: ${config.model}`);
  console.log(`Strategy: ${config.strategy}`);
  
  // Prepare test results data for the prompt
  const testResultsText = formatTestResults(testResult, config.strategy);
  
  // Prepare response data if available
  const responseDataText = formatResponseData(testResult);
  
  // Use the custom feedback prompt if provided, otherwise use the default
  const feedbackPrompt = config.feedbackPrompt || DEFAULT_FEEDBACK_PROMPT;
  
  // Replace placeholders in the feedback prompt
  const prompt = feedbackPrompt
    .replace('{{currentPrompt}}', currentPrompt)
    .replace('{{testResults}}', testResultsText)
    .replace('{{responseData}}', responseDataText);
  
  try {
    // Call the AI SDK instead of OpenAI directly
    const response = await generateText({
      model: openai(config.model),
      system: 'You are an expert AI prompt engineer specializing in agent system prompts.',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
    });
    
    // Extract the content from the response
    const improvedPrompt = response.text;
    
    if (!improvedPrompt) {
      console.warn('Warning: AI returned empty response. Using original prompt.');
      return currentPrompt;
    }
    
    return improvedPrompt;
  } catch (error) {
    console.error('Error calling AI service:', error);
    throw new Error(`Failed to optimize prompt: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Formats agent response data for inclusion in the AI prompt
 * 
 * @param result Test run results containing response data
 * @returns Formatted response data as text
 */
function formatResponseData(result: RunResult): string {
  if (!result.responseData || result.responseData.length === 0) {
    return "No response data available.";
  }
  
  let output = "Agent Response Analysis:\n\n";
  
  result.responseData.forEach((data, i) => {
    output += `Task: ${data.taskName}\n`;
    output += `- Prompt: ${data.data.prompt?.substring(0, 200)}${data.data.prompt?.length > 200 ? '...' : ''}\n`;
    
    const response = data.data.response;
    if (typeof response === 'string') {
      output += `- Response: ${response.substring(0, 500)}${response.length > 500 ? '...' : ''}\n`;
    } else if (response && typeof response.text === 'string') {
      output += `- Response: ${response.text.substring(0, 500)}${response.text.length > 500 ? '...' : ''}\n`;
    } else {
      output += `- Response: ${JSON.stringify(response).substring(0, 300)}...\n`;
    }
    
    output += `- System Message: ${data.data.systemMessage.substring(0, 100)}...\n\n`;
  });
  
  return output;
}

/**
 * Formats test results for inclusion in the AI prompt
 * 
 * @param result Test run results
 * @param strategy Optimization strategy
 * @returns Formatted test results as text
 */
function formatTestResults(result: RunResult, strategy: string): string {
  switch (strategy) {
    case 'error_analysis':
      return formatErrorAnalysis(result);
    case 'completion_analysis':
      return formatCompletionAnalysis(result);
    default:
      return formatErrorAnalysis(result);
  }
}

/**
 * Formats test results focusing on errors
 */
function formatErrorAnalysis(result: RunResult): string {
  const { success, taskResults, taskErrors } = result;
  
  // Calculate pass rate
  const totalTasks = taskResults.length;
  const passedTasks = taskResults.filter(task => task.state === 'pass').length;
  const passRate = totalTasks > 0 ? (passedTasks / totalTasks) * 100 : 0;
  
  let output = `Overall test success: ${success ? 'PASSED' : 'FAILED'}\n`;
  output += `Pass rate: ${passRate.toFixed(2)}% (${passedTasks}/${totalTasks} tasks)\n\n`;
  
  // Add task results
  output += 'Task Results:\n';
  taskResults.forEach(task => {
    output += `- ${task.name}: ${task.state} (${task.duration}ms)\n`;
    if (task.error) {
      output += `  Error: ${task.error.message}\n`;
    }
  });
  
  // Add detailed errors
  if (taskErrors.length > 0) {
    output += '\nDetailed Errors:\n';
    taskErrors.forEach((error, i) => {
      output += `Error #${i + 1}: ${error.message}\n`;
      if (error.stack) {
        // Include only the first few lines of the stack trace
        const stackLines = error.stack.split('\n').slice(0, 3);
        output += `${stackLines.join('\n')}\n`;
      }
    });
  }
  
  return output;
}

/**
 * Formats test results focusing on completion analysis
 * This would typically include the actual agent responses
 * For now, it's a simple placeholder
 */
function formatCompletionAnalysis(result: RunResult): string {
  // In a real implementation, this would extract and format the agent's responses
  // For now, we'll use the same format as error analysis
  return formatErrorAnalysis(result);
} 