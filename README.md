# NestJS LLM Tools

A NestJS module that provides decorators and utilities for defining LLM (Large Language Model) function calling tools using TypeScript decorators. This library enables you to easily expose NestJS service methods as structured tools that can be used with LLM APIs.

## Features

- 🎯 **Decorator-based Tool Definition**: Use simple decorators to mark methods as LLM tools
- 🔍 **Automatic Discovery**: Automatically discovers and registers tools from providers and controllers
- 📝 **Type Safety**: Leverages TypeScript decorators and Zod for type validation
- ⚙️ **Configurable**: Customize tool naming and behavior
- 🧪 **Well Tested**: Includes comprehensive test coverage

## Installation

```bash
npm install nestjs-llm-tools
# or
yarn add nestjs-llm-tools
# or
bun add nestjs-llm-tools
```

### Peer Dependencies

This package requires the following peer dependencies:

```bash
npm install @nestjs/common @nestjs/core reflect-metadata zod
```

## Usage

### 1. Import the Module

Import `LlmToolsModule` in your NestJS application:

```typescript
import { Module } from '@nestjs/common';
import { LlmToolsModule } from 'nestjs-llm-tools';

@Module({
  imports: [
    LlmToolsModule.forRoot({
      prefixClassName: true, // Optional: prefix tool names with class name (default: true)
    }),
  ],
})
export class AppModule {}
```

### 2. Define Tools Using Decorators

Use the `@LlmTool()` and `@ToolParam()` decorators to define tools in your services:

```typescript
import { Injectable } from '@nestjs/common';
import { LlmTool, ToolParam } from 'nestjs-llm-tools';
import { z } from 'zod';

@Injectable()
export class WeatherService {
  @LlmTool('Get the current weather for a specific location')
  getWeather(
    @ToolParam({
      name: 'location',
      type: z.string(),
      description: 'The city and state, e.g., San Francisco, CA'
    })
    location: string,

    @ToolParam({
      name: 'units',
      type: z.enum(['celsius', 'fahrenheit']).optional(),
      description: 'Temperature unit'
    })
    units?: string
  ) {
    // Your implementation
    return {
      location,
      temperature: 72,
      units: units || 'fahrenheit'
    };
  }
}
```

### 3. Access Tool Definitions

The module automatically discovers and registers all tools. You can inject `LlmToolsService` to access them:

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { LlmToolsService, TOOL_CONTAINER_TOKEN } from 'nestjs-llm-tools';

@Injectable()
export class MyService {
  constructor(
    @Inject(TOOL_CONTAINER_TOKEN)
    private readonly tools: any[]
  ) {
    // Access all registered tools
    console.log(this.tools);
  }
}
```

## API Reference

### Decorators

#### `@LlmTool(description: string)`

Marks a method as an LLM tool.

- **Parameters:**
  - `description`: A description of what the tool does

#### `@ToolParam(options?: ToolParamOptions)`

Marks a method parameter as a tool parameter.

- **Options:**
  - `name?: string` - The parameter name (auto-inferred if not provided)
  - `type?: ZodType` - Zod schema for parameter validation
  - `description?: string` - Parameter description for the LLM

### Module Options

#### `LlmToolsModuleOptions`

Configuration options for the module:

```typescript
interface LlmToolsModuleOptions {
  /**
   * Prefix tool name with class name
   * @default true
   */
  prefixClassName?: boolean;
}
```

### Types

#### `LlmToolDefinition`

```typescript
interface LlmToolDefinition {
  name: string;
  parameters: {
    name: string;
    type: string;
    description?: string;
  };
}
```

## Development

### Setup

```bash
# Install dependencies
bun install

# Run linter
bun run lint
```

### Testing

```bash
# Run tests
bun test
```

### Project Structure

```
nestjs-llm-tools/
├── lib/
│   ├── decorators.ts          # @LlmTool and @ToolParam decorators
│   ├── llm-tools.module.ts    # Main module definition
│   ├── llm-tools.loader.ts    # Tool discovery and registration
│   ├── llm-tools.service.ts   # Service for accessing tools
│   ├── constants.ts           # Module constants
│   ├── types.d.ts            # TypeScript type definitions
│   └── utils/                # Utility functions
├── tests/                    # Test files
└── index.ts                  # Main entry point
```

## How It Works

1. **Discovery Phase**: On application bootstrap, the `LlmToolsLoader` scans all providers and controllers
2. **Metadata Extraction**: It uses NestJS reflection capabilities to find methods decorated with `@LlmTool`
3. **Parameter Mapping**: Extracts parameter metadata from `@ToolParam` decorators
4. **Registration**: Compiles tool definitions and stores them in a container for runtime access

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Author

Built with ❤️ for the NestJS and LLM community
