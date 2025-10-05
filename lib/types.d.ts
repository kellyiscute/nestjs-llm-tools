export interface LlmToolDefinition {
  name: string;
  parameters: {
    name: string;
    type: string;
    description?: string;
  }
}
