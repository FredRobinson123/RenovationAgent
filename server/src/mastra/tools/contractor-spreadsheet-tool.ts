import { z } from 'zod';
import { createTimestampedSpreadsheetTool } from './spreadsheet-tool-factory.js';

export const ContractorRowSchema = z.object({
  name: z.string().describe('Name of company or individual contractor'),
  specialty: z.string().describe('Their specialty or trade focus'),
  url: z.string().url().optional().describe('Website or portfolio URL'),
});

export type ContractorRow = z.infer<typeof ContractorRowSchema>;

export const ContractorSpreadsheetSchema = z.object({
  projectName: z.string().describe('Name of the renovation project or brief'),
  createdAt: z.string().describe('Timestamp when the spreadsheet was generated'),
  contractors: z.array(ContractorRowSchema).describe('List of sourced contractors'),
});

export type ContractorSpreadsheet = z.infer<typeof ContractorSpreadsheetSchema>;

const ContractorSpreadsheetInputSchema = z.object({
  project_name: z.string().describe('Name of the renovation project'),
  contractors: z
    .array(ContractorRowSchema)
    .min(1, 'Provide at least one contractor to include in the spreadsheet.'),
});

export const generateContractorSpreadsheet = createTimestampedSpreadsheetTool({
  id: 'generate_contractor_spreadsheet',
  description: 'Generates a contractor sourcing spreadsheet for the provided location and scope.',
  inputSchema: ContractorSpreadsheetInputSchema,
  outputSchema: ContractorSpreadsheetSchema,
  buildSpreadsheet: ({ project_name, contractors }, createdAt) => ({
    projectName: project_name,
    createdAt,
    contractors,
  }),
});

