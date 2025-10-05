import { getParamName } from "@/utils";

describe('getParamName', () => {
  it('should return the correct parameter name', () => {
    class TestClass {
      method(param1: string, param2: number) {}
    }

    const paramName1 = getParamName(TestClass.prototype, 'method', 0);
    const paramName2 = getParamName(TestClass.prototype, 'method', 1);

    expect(paramName1).toBe('param1');
    expect(paramName2).toBe('param2');
  });

  it('should handle parameters with default values', () => {
    class TestClass {
      method(param1: string = 'default', param2: number = 42) {}
    }

    const paramName1 = getParamName(TestClass.prototype, 'method', 0);
    const paramName2 = getParamName(TestClass.prototype, 'method', 1);

    expect(paramName1).toBe('param1');
    expect(paramName2).toBe('param2');
  });

  it('should return undefined for out-of-bounds parameter index', () => {
    class TestClass {
      method(param1: string) {}
    }

    const paramName = getParamName(TestClass.prototype, 'method', 1);

    expect(paramName).toBeUndefined();
  });
});
