import { createTool } from '@mastra/core/tools';
import type { z } from 'zod';

type TimestampedSpreadsheetToolOptions<
  TInputSchema extends z.ZodTypeAny,
  TOutputSchema extends z.ZodTypeAny
> = {
  id: string;
  description: string;
  inputSchema: TInputSchema;
  outputSchema: TOutputSchema;
  buildSpreadsheet: (
    input: z.infer<TInputSchema>,
    createdAt: string
  ) => z.infer<TOutputSchema>;
};

export function createTimestampedSpreadsheetTool<
  TInputSchema extends z.ZodTypeAny,
  TOutputSchema extends z.ZodTypeAny
>({
  id,
  description,
  inputSchema,
  outputSchema,
  buildSpreadsheet,
}: TimestampedSpreadsheetToolOptions<TInputSchema, TOutputSchema>) {
  return createTool({
    id,
    description,
    inputSchema,
    outputSchema,
    execute: async ({ context }) => {
      const createdAt = new Date().toISOString();
      return buildSpreadsheet(context, createdAt);
    },
  });
}

