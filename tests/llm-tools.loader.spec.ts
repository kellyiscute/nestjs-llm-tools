import { MODULE_CONFIG_TOKEN, TOOL_CONTAINER_TOKEN } from "@/constants";
import { LlmTool, ToolParam } from "@/decorators";
import { LlmToolsLoader } from "@/llm-tools.loader";
import { DiscoveryModule } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";

describe("llm-tools.loader", () => {
  let llmToolsLoader: LlmToolsLoader;
  let moduleDef: TestingModule;

  beforeAll(async () => {
    class MockToolService {
      @LlmTool("")
      testTool(@ToolParam() param1: string) {}
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
    expect(container).toHaveLength(1);
    expect(container[0].name).toBe("testTool");
  });
});
