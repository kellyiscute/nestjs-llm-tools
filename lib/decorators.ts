import { SetMetadata } from "@nestjs/common";
import { TOOLS_METAKEY, TOOL_PARAM_METAKEY } from "./constants";
import { getParamName } from "./utils";
import type { ToolParamOptions } from "./types";

export const LlmTool = (description: string) => SetMetadata(TOOLS_METAKEY, { description });

const PRIMITIVE_TYPE_MAP: Map<object, string> = new Map();
PRIMITIVE_TYPE_MAP.set(String, "string");
PRIMITIVE_TYPE_MAP.set(Number, "number");
PRIMITIVE_TYPE_MAP.set(Boolean, "boolean");

export const ToolParam = (option?: ToolParamOptions) => {
  return function (target: object, propertyKey: string | symbol, parameterIndex: number) {
    let meta = Reflect.getOwnMetadata(TOOL_PARAM_METAKEY, target, propertyKey);
    if (!meta) {
      meta = {};
      Reflect.defineMetadata(TOOL_PARAM_METAKEY, meta, target, propertyKey);
    }

    // Try to infer the name using TypeScript if not provided
    const name = option?.name ?? getParamName(target, propertyKey.toString(), parameterIndex);
    if (!name) {
      throw new Error(
        `Cannot infer parameter name. Please specify the 'name' option in ToolParam for ${target}.${propertyKey.toString()}[${parameterIndex}].`,
      );
    }

    // Try to infer the type using reflect-metadata if not provided
    const designType = Reflect.getMetadata("design:paramtypes", target, propertyKey)[
      parameterIndex
    ];
    if (!PRIMITIVE_TYPE_MAP.has(designType)) {
      throw new Error(
        `Cannot use inferred type ${designType.toString()} except for number, string or boolean`,
      );
    }

    const type = option?.type ?? PRIMITIVE_TYPE_MAP.get(designType);
    if (!type) {
      throw new Error(
        `Cannot infer parameter type. Please specify the 'type' option in ToolParam for ${target}.${propertyKey.toString()}[${parameterIndex}].`,
      );
    }

    option ??= {};

    option.name = name;
    option.type = type;

    meta[parameterIndex] = option;
    Reflect.defineMetadata(TOOL_PARAM_METAKEY, meta, target, propertyKey);
  };
};
