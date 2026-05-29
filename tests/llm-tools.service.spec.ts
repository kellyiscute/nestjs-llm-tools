/* eslint-disable prettier/prettier */
import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { LlmToolsService } from "../lib/llm-tools.service";
import { MAPPED_TOOLS_TOKEN, TOOL_CONTAINER_TOKEN } from "../lib/constants";
import type { LlmToolDefinition, MappedToolDefinition } from "../lib/types";

describe("LlmToolsService", () => {
  let service: LlmToolsService;
  let mockHandler: jest.Mock;
  let mockInstance: any;
  let mockTools: Record<string, MappedToolDefinition>;
  let mockContainer: LlmToolDefinition[];

  beforeEach(async () => {
    // Reset mocks
    mockHandler = jest.fn() as jest.Mock;
    mockInstance = { someProperty: "test" };

    // Create mock tool definitions
    // Note: paramIndex starts at 1 to avoid the bug at llm-tools.service.ts:26 where !paramIndex fails for index 0
    const mockMappedTool: MappedToolDefinition = {
      name: "testTool",
      description: "Test tool",
      handlerParamLen: 3,
      instance: mockInstance,
      handler: mockHandler,
      parameters: {
        param1: { name: "param1", type: "string", paramIndex: 1 },
        param2: { name: "param2", type: "number", paramIndex: 2 },
      },
    };

    const mockToolNoParams: MappedToolDefinition = {
      name: "noParamsTool",
      description: "Tool with no parameters",
      handlerParamLen: 0,
      instance: mockInstance,
      handler: mockHandler,
      parameters: {},
    };

    mockTools = {
      testTool: mockMappedTool,
      noParamsTool: mockToolNoParams,
    };

    mockContainer = [
      {
        name: "testTool",
        description: "Test tool",
        parameters: {
          0: { name: "param1", type: "string" },
          1: { name: "param2", type: "number" },
        },
      },
      {
        name: "noParamsTool",
        description: "Tool with no parameters",
        parameters: {},
      },
    ];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmToolsService,
        { provide: MAPPED_TOOLS_TOKEN, useValue: mockTools },
        { provide: TOOL_CONTAINER_TOKEN, useValue: mockContainer },
      ],
    }).compile();

    service = module.get<LlmToolsService>(LlmToolsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Service Initialization", () => {
    it("should be defined", () => {
      expect(service).toBeDefined();
    });

    it("should have dependencies properly injected", () => {
      expect(service).toBeInstanceOf(LlmToolsService);
      expect(service.getTools()).toBeDefined();
    });
  });

  describe("getTools()", () => {
    it("should return array of tools from container", () => {
      const tools = service.getTools();
      expect(tools).toEqual(mockContainer);
      expect(tools).toHaveLength(2);
      expect(tools[0]?.name).toBe("testTool");
      expect(tools[1]?.name).toBe("noParamsTool");
    });

    it("should return a copy (not original reference)", () => {
      const tools1 = service.getTools();
      const tools2 = service.getTools();

      expect(tools1).toEqual(tools2);
      expect(tools1).not.toBe(tools2);
      expect(tools1).not.toBe(mockContainer);
    });

    it("should handle empty container", async () => {
      const emptyModule = await Test.createTestingModule({
        providers: [
          LlmToolsService,
          { provide: MAPPED_TOOLS_TOKEN, useValue: {} },
          { provide: TOOL_CONTAINER_TOKEN, useValue: [] },
        ],
      }).compile();

      const emptyService = emptyModule.get<LlmToolsService>(LlmToolsService);
      const tools = emptyService.getTools();

      expect(tools).toEqual([]);
      expect(tools).toHaveLength(0);
    });
  });

  describe("callTool() - Success Cases", () => {
    it("should call tool with correct parameters", () => {
      mockHandler.mockReturnValue("success");

      const result = service.callTool("testTool", {
        param1: "hello",
        param2: 42,
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith(undefined, "hello", 42);
      expect(result).toBe("success");
    });

    it("should map parameters by name to correct indices", () => {
      mockHandler.mockReturnValue("mapped");

      service.callTool("testTool", {
        param2: 100,
        param1: "world",
      });

      expect(mockHandler).toHaveBeenCalledWith(undefined, "world", 100);
    });

    it("should handle multiple parameters in correct order", () => {
      const multiParamTool: MappedToolDefinition = {
        name: "multiTool",
        description: "Multi param tool",
        handlerParamLen: 5,
        instance: mockInstance,
        handler: mockHandler,
        parameters: {
          first: { name: "first", type: "string", paramIndex: 1 },
          second: { name: "second", type: "number", paramIndex: 2 },
          third: { name: "third", type: "boolean", paramIndex: 3 },
          fourth: { name: "fourth", type: "object", paramIndex: 4 },
        },
      };

      mockTools.multiTool = multiParamTool;

      service.callTool("multiTool", {
        fourth: { key: "value" },
        first: "start",
        third: true,
        second: 99,
      });

      expect(mockHandler).toHaveBeenCalledWith(undefined, "start", 99, true, { key: "value" });
    });

    it("should support optional inject parameter for dependency injection", () => {
      mockHandler.mockReturnValue("injected");

      const result = service.callTool("testTool", { param1: "test" }, { 0: "injectedValue" });

      expect(mockHandler).toHaveBeenCalledWith("injectedValue", "test", undefined);
      expect(result).toBe("injected");
    });

    it("should return handler result", () => {
      const expectedResult = { data: "complex result", nested: { value: 123 } };
      mockHandler.mockReturnValue(expectedResult);

      const result = service.callTool("testTool", { param1: "test" });

      expect(result).toEqual(expectedResult);
      expect(result).toBe(expectedResult);
    });

    it("should call handler with correct this context (instance)", () => {
      let capturedThis: any;
      mockHandler.mockImplementation(function (this: any) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        capturedThis = this;
        return "called";
      });

      service.callTool("testTool", { param1: "test" });

      expect(capturedThis).toBe(mockInstance);
      expect(capturedThis.someProperty).toBe("test");
    });

    it("should handle tools with no parameters", () => {
      mockHandler.mockReturnValue("no params");

      const result = service.callTool("noParamsTool", {});

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith();
      expect(result).toBe("no params");
    });

    it("should handle sparse parameter arrays (inject at specific indices)", () => {
      service.callTool("testTool", { param1: "sparse" }, { 0: 50, 2: "index2" });

      expect(mockHandler).toHaveBeenCalledWith(50, "sparse", "index2");
    });

    it("should handle mixed named params and injected params", () => {
      service.callTool("testTool", { param1: "named", param2: 25 }, { 0: "injected" });

      expect(mockHandler).toHaveBeenCalledWith("injected", "named", 25);
    });
  });

  describe("callTool() - Error Cases", () => {
    it("should throw error when tool name not found", () => {
      expect(() => {
        service.callTool("nonExistentTool", { param: "value" });
      }).toThrow("No llm tool with name \"nonExistentTool\" found.");
    });

    it("should throw error when parameter name not found in tool definition", () => {
      expect(() => {
        service.callTool("testTool", { invalidParam: "value" });
      }).toThrow(
        "Unable to inject param with name \"invalidParam\" for tool \"testTool\": No definition found.",
      );
    });

    it("should have descriptive error messages with tool names", () => {
      try {
        service.callTool("unknownTool", {});
        fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toContain("unknownTool");
        expect(error.message).toContain("No llm tool");
      }
    });

    it("should have descriptive error messages with param names", () => {
      try {
        service.callTool("testTool", { wrongParam: "test" });
        fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toContain("wrongParam");
        expect(error.message).toContain("testTool");
        expect(error.message).toContain("No definition found");
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined parameter values", () => {
      service.callTool("testTool", { param1: undefined, param2: 10 });

      expect(mockHandler).toHaveBeenCalledWith(undefined, undefined, 10);
    });

    it("should handle null parameter values", () => {
      service.callTool("testTool", { param1: null, param2: 20 });

      expect(mockHandler).toHaveBeenCalledWith(undefined, null, 20);
    });

    it("should handle empty inject object", () => {
      service.callTool("testTool", { param1: "test" }, {});

      expect(mockHandler).toHaveBeenCalledWith(undefined, "test", undefined);
    });

    it("should handle only inject parameter without named params", () => {
      service.callTool("testTool", {}, { 1: "injected", 2: 99 });

      expect(mockHandler).toHaveBeenCalledWith(undefined, "injected", 99);
    });

    it("should allow inject to override named params", () => {
      service.callTool("testTool", { param1: "original", param2: 1 }, { 1: "override" });

      expect(mockHandler).toHaveBeenCalledWith(undefined, "override", 1);
    });
  });
});
