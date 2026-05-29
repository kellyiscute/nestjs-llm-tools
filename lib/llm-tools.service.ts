import { Inject, Injectable } from "@nestjs/common";
import { MAPPED_TOOLS_TOKEN, TOOL_CONTAINER_TOKEN } from "./constants";
import type { LlmToolDefinition, MappedToolDefinition } from "./types";

@Injectable()
export class LlmToolsService {
  constructor(
    @Inject(MAPPED_TOOLS_TOKEN)
    private readonly tools: Record<string, MappedToolDefinition>,
    @Inject(TOOL_CONTAINER_TOKEN)
    private readonly container: LlmToolDefinition[],
  ) {}

  getTools() {
    return [...this.container];
  }

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
