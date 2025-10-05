import { SetMetadata } from "@nestjs/common";
import { TOOLS_METAKEY, TOOL_PARAM_METAKEY } from "./constants";
import type { ZodType } from "zod";
import { getParamName } from "./utils";

export const LlmTool = (description: string) => SetMetadata(TOOLS_METAKEY, { description });

export interface ToolParamOptions {
  name?: string;
  type?: ZodType;
  description?: string;
};

export const ToolParam = (option?: ToolParamOptions) => {
  return function(target: object, propertyKey: string | symbol, parameterIndex: number) {
    let meta = Reflect.getOwnMetadata(TOOL_PARAM_METAKEY, target, propertyKey);
    if (!meta) {
      meta = {};
      Reflect.defineMetadata(TOOL_PARAM_METAKEY, meta, target, propertyKey);
    }

    // Try to infer the name using TypeScript if not provided
    const name = option?.name ?? getParamName(target, propertyKey.toString(), parameterIndex);
    if (!name) {
      throw new Error(`Cannot infer parameter name. Please specify the 'name' option in ToolParam for ${target}.${propertyKey.toString()}[${parameterIndex}].`);
    }

    // Try to infer the type using reflect-metadata if not provided
    const type = option?.type ?? Reflect.getMetadata("design:paramtypes", target, propertyKey)[parameterIndex];
    if (!type) {
      throw new Error(`Cannot infer parameter type. Please specify the 'type' option in ToolParam for ${target}.${propertyKey.toString()}[${parameterIndex}].`);
    }

    option ??= {};

    option.name = name;
    option.type = type;

    meta[parameterIndex] = option;
    Reflect.defineMetadata(TOOL_PARAM_METAKEY, meta, target, propertyKey);
  };
}
