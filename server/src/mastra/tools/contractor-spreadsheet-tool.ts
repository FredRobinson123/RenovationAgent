import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const ContractorRowSchema = z.object({
  name: z.string().describe('Contractor or firm name'),
  serviceType: z.string().describe('Their specialty or trade focus'),
  areaServed: z.string().describe('Primary neighborhood or city served'),
  website: z.string().url().optional().describe('Website or portfolio URL'),
  contact: z
    .string()
    .optional()
    .describe('Phone number or email for direct contact'),
  rating: z.string().optional().describe('Any qualitative rating or credential'),
  notes: z.string().optional().describe('Relevant notes (licensing, availability, differentiators)'),
});

export type ContractorRow = z.infer<typeof ContractorRowSchema>;

export const ContractorSpreadsheetSchema = z.object({
  projectName: z.string().describe('Name of the renovation project or brief'),
  location: z.string().describe('Specific area the customer provided'),
  createdAt: z.string().describe('Timestamp when the spreadsheet was generated'),
  contractors: z.array(ContractorRowSchema).describe('List of sourced contractors'),
});

export type ContractorSpreadsheet = z.infer<typeof ContractorSpreadsheetSchema>;

export const generateContractorSpreadsheet = createTool({
  id: 'generate_contractor_spreadsheet',
  description: 'Generates a contractor sourcing spreadsheet for the provided location and scope.',
  inputSchema: z.object({
    project_name: z.string().describe('Name of the renovation project'),
    location: z.string().describe('Specific neighborhood, city, or service area'),
    contractors: z
      .array(ContractorRowSchema)
      .min(1, 'Provide at least one contractor to include in the spreadsheet.'),
  }),
  outputSchema: ContractorSpreadsheetSchema,
  execute: async ({ context }) => {
    const { project_name, location, contractors } = context;

    return {
      projectName: project_name,
      location,
      createdAt: new Date().toISOString(),
      contractors,
    };
  },
});

