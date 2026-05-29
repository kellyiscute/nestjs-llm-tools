import { Inject, Injectable, type OnApplicationBootstrap } from "@nestjs/common";
import { DiscoveryService, MetadataScanner, Reflector } from "@nestjs/core";
import type { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";
import {
  MODULE_CONFIG_TOKEN,
  TOOL_CONTAINER_TOKEN,
  TOOL_PARAM_METAKEY,
  TOOLS_METAKEY,
} from "./constants";
import type {
  LlmToolDefinition,
  LlmToolParam,
  MappedToolDefinition,
  MappedToolParam,
  ToolParamOptions,
} from "./types";

function providerFilter(wrapper: InstanceWrapper) {
  return !wrapper.isAlias && wrapper.instance;
}

@Injectable()
export class LlmToolsLoader implements OnApplicationBootstrap {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    @Inject(TOOL_CONTAINER_TOKEN)
    private readonly container: LlmToolDefinition[],
    @Inject(MODULE_CONFIG_TOKEN)
    private readonly moduleOptions: { prefixClassName: boolean },
  ) {}

  onApplicationBootstrap() {
    const providers = [
      ...this.discoveryService.getProviders().filter(providerFilter),
      ...this.discoveryService.getControllers().filter(providerFilter),
    ];

    for (const provider of providers) {
      const methods = this.metadataScanner.getAllMethodNames(
        Object.getPrototypeOf(provider.instance),
      );

      const definedTools = Object.fromEntries(
        methods
          .map((m) => [m, this.reflector.get(TOOLS_METAKEY, provider.instance[m])])
          .filter(([, v]) => v !== undefined),
      );

      const paramsData = Object.fromEntries(
        methods
          .map((m) => [
            m,
            Reflect.getOwnMetadata(TOOL_PARAM_METAKEY, Object.getPrototypeOf(provider.instance), m),
          ])
          .filter(([, v]) => v !== undefined),
      );

      const mapped: Record<string, MappedToolDefinition> = {};
      const defs = Object.entries(definedTools).map(([methodName, options]) => {
        const params = paramsData[methodName] as Record<string, LlmToolParam>;
        const m = {
          name: this.moduleOptions.prefixClassName ? `${provider.name}.${methodName}` : methodName,
          description: (options as ToolParamOptions)?.description,
          parameters: params,
        };

        const paramLengths = Reflect.getMetadata(
          "design:paramtypes",
          Object.getPrototypeOf(provider.instance),
          methodName,
        ).length;
        const mappedParams = Object.fromEntries(
          Object.entries(params).map<[string, MappedToolParam]>(([i, p]) => [
            p.name,
            {
              ...p,
              paramIndex: Number.parseInt(i),
            },
          ]),
        );

        mapped[m.name] = {
          ...m,
          handler: provider.instance[methodName],
          handlerParamLen: paramLengths,
          parameters: mappedParams,
          instance: provider.instance,
        };

        return m;
      });

      this.container.push(...defs);
    }
  }
}
