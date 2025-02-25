# Agent Bench

A framework for testing and benchmarking AI agents with automated optimization capabilities.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js->=18-green.svg)](https://nodejs.org/)

## Overview

Agent Bench provides a comprehensive toolkit for defining, testing, and optimizing AI agents. It allows you to:

- Define agent specifications in a structured YAML format
- Run automated tests to evaluate agent performance
- Generate comprehensive test reports with metrics
- Optimize agent prompts using AI-powered feedback loops

## Features

- **Declarative Agent Specifications**: Define agents, tools, benchmarks, and evaluation criteria in YAML
- **Automated Testing**: Run benchmarks against your agents with comprehensive reporting
- **AI-Powered Optimization**: Automatically improve agent system prompts based on test results
- **Tool Simulation**: Test agents with simulated tools and custom error handling
- **Flexible Evaluation**: Define custom evaluation criteria and scoring systems

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or pnpm (recommended)

### Install from npm

```bash
npm install agent-bench
```

Or with pnpm:

```bash
pnpm add agent-bench
```

### Install from source

```bash
git clone https://github.com/yourusername/agent-bench.git
cd agent-bench
pnpm install
pnpm build
```

## Usage

### Command Line Interface

Agent Bench provides a CLI for running tests, transpiling specifications, and optimizing agents:

```bash
# Run tests from a YAML specification
agent-bench test path/to/spec.yaml

# Transpile a YAML specification to a test file
agent-bench transpile path/to/spec.yaml

# Run tests and optimize the agent's system prompt
agent-bench optimize path/to/spec.yaml
```

### Programmatic API

```typescript
import { testSpec, transpileSpec } from 'agent-bench';

// Run tests from a YAML specification
const results = await testSpec('path/to/spec.yaml', {
  watch: false,
  reporter: 'default'
});

// Transpile a YAML specification to a test file
const testFilePath = await transpileSpec('path/to/spec.yaml', {
  output: 'path/to/output.test.ts'
});
```

## Agent Specification Format

Agent Bench uses a declarative YAML format to define agents, tools, and benchmarks:

```yaml
metadata:
  name: "Simple Customer Service Agent"
  version: "1.0"
  description: "A basic customer service agent for testing"

agent:
  model: gpt-4o-mini
  systemPrompt: |
    You are a helpful customer service agent. Assist users with their inquiries.
  toolChoice: "auto"
  maxSteps: 3

tools:
  checkUserAccount:
    description: "Check user account details"
    inputSchema:
      type: object
      properties:
        userId:
          type: string
    outputSchema: "UserAccountSchema"
    # Tool implementation details...

benchmarks:
  - name: "Password Reset Test"
    messages:
      - role: "user"
        content: "How do I reset my password?"
    # Benchmark configuration...
```

## CLI Commands

### `test`

Run tests from a YAML specification:

```bash
agent-bench test [options] <spec>
```

Options:
- `--output, -o`: Output path for the generated test file
- `--keep, -k`: Keep the generated test file after running
- `--watch, -w`: Watch for changes and rerun tests
- `--reporter, -r`: Test reporter to use (default, json, verbose)

### `transpile`

Transpile a YAML specification to a test file:

```bash
agent-bench transpile [options] <spec>
```

Options:
- `--output, -o`: Output path for the generated test file

### `optimize`

Run tests and optimize the agent's system prompt:

```bash
agent-bench optimize [options] <spec>
```

Options:
- `--iterations, -i`: Number of optimization iterations (default: 3)
- `--output, -o`: Output path for the optimized specification

## Examples

The `examples/` directory contains sample agent specifications and test files:

- `agent-spec.yaml`: A basic agent specification
- `customer-service.test.yaml`: A customer service agent test suite
- `customer-service.test.ts`: A transpiled test file

## Development

```bash
# Build the project
pnpm build

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run examples
pnpm examples
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

