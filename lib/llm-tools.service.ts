import { Inject, Injectable } from "@nestjs/common";
import { MAPPED_TOOLS_TOKEN, TOOL_CONTAINER_TOKEN } from "./constants";
import type { LlmToolDefinition, MappedToolDefinition } from "./types";
import type { ChatCompletionFunctionTool } from "openai/resources/index.mjs";
import { type JSONSchema } from "json-schema-typed";

/**
 * Service for managing and executing LLM tools.
 *
 * This service provides methods to retrieve registered LLM tool definitions
 * and execute them with parameters from LLM function calls.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   constructor(private readonly llmToolsService: LlmToolsService) {}
 *
 *   async handleLlmResponse() {
 *     // Get all available tools
 *     const tools = this.llmToolsService.getTools();
 *
 *     // Send tools to LLM and get response...
 *
 *     // Execute the tool call
 *     const result = await this.llmToolsService.callTool(
 *       'WeatherService_getWeather',
 *       { location: 'San Francisco, CA', units: 'celsius' }
 *     );
 *   }
 * }
 * ```
 */
@Injectable()
export class LlmToolsService {
  constructor(
    @Inject(MAPPED_TOOLS_TOKEN)
    private readonly tools: Record<string, MappedToolDefinition>,
    @Inject(TOOL_CONTAINER_TOKEN)
    private readonly container: LlmToolDefinition[],
  ) {}

  /**
   * Retrieves all registered LLM tool definitions.
   *
   * Returns an array of tool definitions that can be sent to LLM APIs
   * for function calling. Each definition includes the tool name, description,
   * and parameter schemas.
   *
   * @returns A copy of the tool definitions array
   *
   * @example
   * ```typescript
   * const tools = this.llmToolsService.getTools();
   * // Returns: [
   * //   {
   * //     name: 'WeatherService_getWeather',
   * //     description: 'Get the current weather for a specific location',
   * //     parameters: { ... }
   * //   },
   * //   ...
   * // ]
   * ```
   */
  getTools() {
    return [...this.container];
  }

  convertToolParamsToJsonSchema(toolParams: LlmToolDefinition["parameters"]) {
    const params: Record<string, JSONSchema> = {};

    for (const p of Object.values(toolParams)) {
      if (typeof p.type === "string") {
        params[p.name] = {
          description: p.description,
          type: p.type,
        };
      } else {
        const schema = p.type.toJSONSchema() as any;
        params[p.name] = schema;
      }
    }
    return {
      type: "object",
      properties: params,
      required: Array.from(Object.keys(params)),
      additionalProperties: false,
    };
  }

  getToolsWithJsonSchemaParams() {
    return this.container.map((t) => ({
      ...t,
      parameters: this.convertToolParamsToJsonSchema(t.parameters),
    }));
  }

  getOpenAiTools() {
    const result: ChatCompletionFunctionTool[] = [];
    for (const tool of this.container) {
      const t: ChatCompletionFunctionTool = {
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: this.convertToolParamsToJsonSchema(tool.parameters),
        },
      };
      result.push(t);
    }

    return result;
  }

  /**
   * Executes a registered LLM tool by name with the provided parameters.
   *
   * This method handles parameter mapping and injection, then invokes the
   * underlying tool handler method. It supports both LLM-provided parameters
   * and additional injected parameters (e.g., for passing request context).
   *
   * @param name - The name of the tool to execute
   * @param params - Parameters from the LLM function call, keyed by parameter name
   * @param inject - Optional additional parameters to inject by index position
   * @returns The result from executing the tool handler
   *
   * @throws {Error} If the tool name is not found
   * @throws {Error} If a parameter name doesn't match any defined parameter
   *
   * @example
   * ```typescript
   * // Basic usage
   * const weather = await this.llmToolsService.callTool(
   *   'WeatherService_getWeather',
   *   { location: 'San Francisco, CA', units: 'celsius' }
   * );
   *
   * // With injected parameters (e.g., request context)
   * const result = await this.llmToolsService.callTool(
   *   'UserService_getCurrentUser',
   *   {},
   *   { 0: request.user } // Inject user at parameter index 0
   * );
   * ```
   */
  callTool(name: string, params: Record<string, unknown>, inject?: Record<number, unknown>) {
    const tool = this.tools[name];
    if (!tool) {
      throw new Error(`No llm tool with name "${name}" found.`);
    }
    const preppedParams: unknown[] = new Array(tool.handlerParamLen);
    for (const paramKey in params) {
      const paramIndex = tool.parameters[paramKey]?.paramIndex;
      if (paramIndex == null) {
        throw new Error(
          `Unable to inject param with name "${paramKey}" for tool "${name}": No definition found.`,
        );
      }
      preppedParams[paramIndex] = params[paramKey];
    }

    if (inject) {
      for (const i in inject) {
        preppedParams[i] = inject[i];
      }
    }

    return tool.handler.apply(tool.instance, preppedParams);
  }
}
