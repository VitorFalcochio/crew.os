import { z } from "zod";

export const delegationSchema = z.object({
  organizationId: z.uuid(),
  employeeId: z.string().min(1),
  title: z.string().min(4).max(160),
  description: z.string().min(10).max(10_000),
  priority: z.enum(["baixa", "média", "alta", "urgente"]),
  requiresApproval: z.boolean().default(true),
});

export interface GenerateTextInput { system: string; prompt: string; temperature?: number; maxOutputTokens?: number; safetyIdentifier?: string; reasoningEffort?: "none" | "low" | "medium" | "high" | "xhigh" | "max" }
export interface GenerateTextResult { text: string; usage?: { input: number; output: number }; providerRequestId?: string }
export interface StructuredInput<T> extends GenerateTextInput { schema: z.ZodType<T>; schemaName?: string }
export interface StreamInput extends GenerateTextInput { signal?: AbortSignal }

export interface AIProvider {
  readonly key: string;
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
  generateStructured<T>(input: StructuredInput<T>): Promise<T>;
  streamText(input: StreamInput): Promise<ReadableStream<Uint8Array>>;
}

export interface ToolContext { organizationId: string; employeeId: string; taskId: string; approved: boolean; recordActivity: (title: string, metadata?: Record<string, unknown>) => Promise<void> }
export interface ToolResult<T = unknown> { ok: boolean; data?: T; error?: string }
export interface EmployeeTool<TInput = unknown, TOutput = unknown> {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly requiresApproval: boolean;
  execute(input: TInput, context: ToolContext): Promise<ToolResult<TOutput>>;
}

export interface EmployeeRuntimeContext { organizationId: string; employeeId: string; taskId: string; identityMemory: string[]; organizationMemory: string[]; operationalMemory: string[]; permissions: string[] }
