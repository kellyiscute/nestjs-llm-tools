import { Module, type Provider } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { LlmToolsService } from "./llm-tools.service";
import { MODULE_CONFIG_TOKEN, TOOL_CONTAINER_TOKEN } from "./constants";

export interface LlmToolsModuleOptions {
  /**
   * Prefix tool name with class name
   * @default true
   */
  prefixClassName?: boolean;
}

@Module({})
export class LlmToolsModule {
  private static StaticProviders: Provider[] = [
    {
      provide: TOOL_CONTAINER_TOKEN,
      useValue: [],
    },
  ];

  static forRoot(options?: LlmToolsModuleOptions) {
    options = { prefixClassName: true, ...options };

    return {
      module: LlmToolsModule,
      import: [DiscoveryModule],
      providers: [
        ...this.StaticProviders,
        LlmToolsService,
        { provide: MODULE_CONFIG_TOKEN, useValue: options },
      ],
      exports: [LlmToolsService],
    };
  }
}
