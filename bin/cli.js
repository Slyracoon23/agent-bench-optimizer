#!/usr/bin/env node

import { run } from '../dist/cli/index.js';

// Check if OpenAI API key is available
if (!process.env.OPENAI_API_KEY) {
  console.error('\x1b[31mError: OPENAI_API_KEY environment variable is not set\x1b[0m');
  console.error('Please set it before running prompt-spec:');
  console.error('  export OPENAI_API_KEY=your_api_key_here');
  console.error('  # or');
  console.error('  OPENAI_API_KEY=your_api_key_here prompt-spec <command>');
  process.exit(1);
}

run();