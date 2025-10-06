export function getParamName(target: any, propertyKey: string, parameterIndex: number): string {
  const method = target[propertyKey];
  const funcStr = method.toString();

  // Extract parameters from function string
  const params =
    funcStr
      .match(/\(([^)]*)\)/)?.[1]
      .split(",")
      .map((p: string) => p.trim().split(/[=:]/)[0]?.trim()) || [];

  return params[parameterIndex];
}
