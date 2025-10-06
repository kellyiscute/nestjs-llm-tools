import type { ZodType } from "zod";

export interface LlmToolDefinition {
  name: string;
  parameters: {
    name: string;
    type: string;
    description?: string;
  };
}

export interface ToolParamOptions {
  name?: string;
  type?: ZodType;
  description?: string;
}
