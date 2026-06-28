import type { ZodType } from "zod";

export interface LlmToolParam {
  name: string;
  type: string | ZodType;
  description?: string;
}

export interface LlmToolDefinition {
  name: string;
  description?: string;
  parameters: Record<number, LlmToolParam>;
}

export interface ToolParamOptions {
  name?: string;
  type?: ZodType | "string" | "number" | "boolean";
  description?: string;
}

export interface MappedToolParam extends LlmToolParam {
  paramIndex: number;
}

export interface MappedToolDefinition extends LlmToolDefinition {
  handlerParamLen: number;
  instance: any;
  handler: (...any) => any;
  /**
   * Record<paramName: string, ParamDef>
   */
  parameters: Record<string, MappedToolParam>;
}
