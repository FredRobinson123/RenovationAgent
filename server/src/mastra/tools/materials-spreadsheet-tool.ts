import { z } from 'zod';
import { createTimestampedSpreadsheetTool } from './spreadsheet-tool-factory.js';

export const MaterialRowSchema = z.object({
  material: z.string().describe('Material or product name'),
  supplier: z.string().describe('Supplier or showroom name'),
  price: z.string().optional().describe('Reference price or price range'),
  url: z.string().url().optional().describe('Direct product or supplier URL'),
});

export type MaterialRow = z.infer<typeof MaterialRowSchema>;

export const MaterialsSpreadsheetSchema = z.object({
  projectName: z.string().describe('Name of the sourcing request'),
  createdAt: z.string().describe('Timestamp when the spreadsheet was generated'),
  materials: z.array(MaterialRowSchema).describe('List of sourced materials'),
});

export type MaterialsSpreadsheet = z.infer<typeof MaterialsSpreadsheetSchema>;

const MaterialsSpreadsheetInputSchema = z.object({
  project_name: z.string().describe('Name of the sourcing request'),
  materials: z
    .array(MaterialRowSchema)
    .min(1, 'Provide at least one material/supplier to include in the spreadsheet.'),
});

export const generateMaterialsSpreadsheet = createTimestampedSpreadsheetTool({
  id: 'generate_materials_spreadsheet',
  description: 'Generates a materials sourcing spreadsheet for the specified area and categories.',
  inputSchema: MaterialsSpreadsheetInputSchema,
  outputSchema: MaterialsSpreadsheetSchema,
  buildSpreadsheet: ({ project_name, materials }, createdAt) => ({
    projectName: project_name,
    createdAt,
    materials,
  }),
});

