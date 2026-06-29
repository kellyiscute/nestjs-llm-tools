import z from "zod";
import { MODULE_CONFIG_TOKEN, TOOL_CONTAINER_TOKEN } from "../lib/constants";
import { LlmTool, ToolParam } from "../lib/decorators";
import { LlmToolsLoader } from "../lib/llm-tools.loader";
import { DiscoveryModule } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import type { LlmToolDefinition } from "../dist";

describe("llm-tools.loader", () => {
  let llmToolsLoader: LlmToolsLoader;
  let moduleDef: TestingModule;

  beforeAll(async () => {
    class MockToolService {
      @LlmTool("")
      testTool(@ToolParam() param1: string) {}

      @LlmTool("")
      testTool2(@ToolParam({ type: z.string(), description: "param1" }) param1: any) {}
    }
    const testModule = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [
        { provide: TOOL_CONTAINER_TOKEN, useValue: [] },
        { provide: MODULE_CONFIG_TOKEN, useValue: { prefixClassName: true } },
        MockToolService,
        LlmToolsLoader,
      ],
    }).compile();
    moduleDef = testModule;
    llmToolsLoader = testModule.get(LlmToolsLoader);
    const app = testModule.createNestApplication();
    await app.init();
  });

  it("should be defined", () => {
    expect(llmToolsLoader).toBeDefined();
  });

  it("should find defined tools", () => {
    const container = moduleDef.get(TOOL_CONTAINER_TOKEN);
    expect(container).toHaveLength(2);
    expect(container[0].name).toBe("MockToolService.testTool");
  });

  it("should acquire param name correctly with decorator applied", () => {
    const container = moduleDef.get<LlmToolDefinition[]>(TOOL_CONTAINER_TOKEN);
    expect(container[1]?.parameters[0]?.name).toBe("param1");
  });
});
