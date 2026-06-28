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
pnpm add nestjs-llm-tools
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
    @ToolParam({ description: 'The city and state, e.g., San Francisco, CA' })
    location: string,

    @ToolParam({
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

### Type Inference Rules

The `@ToolParam()` decorator supports automatic type and name inference:

- **Parameter names** are automatically inferred from function signatures
- **Primitive types** (`string`, `number`, `boolean`) are automatically inferred from TypeScript types
- **Complex types** (enums, objects, arrays, unions) require explicit Zod schemas

```typescript
// ✅ Primitive types - no explicit type needed
@ToolParam({ description: 'User name' })
name: string

@ToolParam({ description: 'User age' })
age: number

@ToolParam({ description: 'Is active' })
isActive: boolean

// ✅ Complex types - explicit Zod schema required
@ToolParam({
  type: z.enum(['admin', 'user', 'guest']),
  description: 'User role'
})
role: string

@ToolParam({
  type: z.object({ street: z.string(), city: z.string() }),
  description: 'User address'
})
address: { street: string; city: string }
```

### 3. Use the LlmToolsService

The module automatically discovers and registers all tools. Inject `LlmToolsService` to access and execute them:

```typescript
import { Injectable } from '@nestjs/common';
import { LlmToolsService } from 'nestjs-llm-tools';

@Injectable()
export class LlmService {
  constructor(private readonly llmToolsService: LlmToolsService) {}

  async chat(userMessage: string) {
    // Get all available tools
    const tools = this.llmToolsService.getTools();

    // Send to your LLM API (e.g., Anthropic, OpenAI)
    const response = await yourLlmApi.sendMessage({
      message: userMessage,
      // WARN: You need to transform the tool definitions accordingly
      tools: tools
    });

    // If the LLM wants to call a tool
    if (response.toolCalls) {
      for (const toolCall of response.toolCalls) {
        const result = await this.llmToolsService.callTool(
          toolCall.name,
          toolCall.parameters
        );

        // Send result back to LLM
        // ...
      }
    }

    return response;
  }
}
```

#### Direct Token Injection

You can also inject the tool container token directly if you only need the definitions:

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { TOOL_CONTAINER_TOKEN } from 'nestjs-llm-tools';
import type { LlmToolDefinition } from 'nestjs-llm-tools';

@Injectable()
export class MyService {
  constructor(
    @Inject(TOOL_CONTAINER_TOKEN)
    private readonly tools: LlmToolDefinition[]
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

### Services

#### `LlmToolsService`

The main service for interacting with registered LLM tools.

**Methods:**

##### `getTools(): LlmToolDefinition[]`

Retrieves all registered LLM tool definitions. Returns a copy of the tool definitions array that can be sent to LLM APIs.

```typescript
const tools = this.llmToolsService.getTools();
// Returns array of tool definitions with name, description, and parameters
```

##### `getOpenAiTools(): ChatCompletionFunctionTool[]`

Returns tools formatted for the OpenAI SDK. Each tool includes the function name, description, and parameters as JSON Schema.

```typescript
import OpenAI from 'openai';

const openai = new OpenAI();
const tools = this.llmToolsService.getOpenAiTools();

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'What is the weather in Tokyo?' }],
  tools: tools,
});
```

##### `getToolsWithJsonSchemaParams()`

Returns tool definitions with parameters converted to JSON Schema format. Useful for LLM APIs that require JSON Schema parameter definitions.

```typescript
const tools = this.llmToolsService.getToolsWithJsonSchemaParams();
// Returns tools with parameters as JSON Schema objects
```

##### `callTool(name: string, params: Record<string, unknown>, inject?: Record<number, unknown>): any`

Executes a registered LLM tool by name with the provided parameters.

- **Parameters:**
  - `name` - The name of the tool to execute
  - `params` - Parameters from the LLM function call, keyed by parameter name
  - `inject` - (Optional) Additional parameters to inject by index position for context injection

- **Returns:** The result from executing the tool handler

- **Throws:**
  - `Error` if the tool name is not found
  - `Error` if a parameter name doesn't match any defined parameter

```typescript
// Basic usage
const result = await this.llmToolsService.callTool(
  'WeatherService_getWeather',
  { location: 'San Francisco, CA', units: 'celsius' }
);

// With parameter injection (e.g., for request context)
const result = await this.llmToolsService.callTool(
  'UserService_getCurrentUser',
  {},
  { 0: request.user } // Inject at parameter index 0
);
```

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

## Development

### Setup

```bash
# Install dependencies
pnpm install

# Run linter
pnpm run lint
```

### Testing

```bash
# Run tests
pnpm run test
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
