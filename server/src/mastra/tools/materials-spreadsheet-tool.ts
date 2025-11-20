import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const MaterialRowSchema = z.object({
  material: z.string().describe('Material or product name'),
  vendor: z.string().describe('Supplier'),
  website: z.string().url().optional().describe('Direct product or vendor URL'),
  price: z.string().optional().describe('Reference price'),
  notes: z.string().optional().describe('Anything notable such as sustainability or certifications'),
});

export type MaterialRow = z.infer<typeof MaterialRowSchema>;

export const MaterialsSpreadsheetSchema = z.object({
  projectName: z.string().describe('Name of the sourcing request'),
  createdAt: z.string().describe('Timestamp when the spreadsheet was generated'),
  materials: z.array(MaterialRowSchema).describe('List of sourced materials'),
});

export type MaterialsSpreadsheet = z.infer<typeof MaterialsSpreadsheetSchema>;

export const generateMaterialsSpreadsheet = createTool({
  id: 'generate_materials_spreadsheet',
  description: 'Generates a materials sourcing spreadsheet for the specified area and categories.',
  inputSchema: z.object({
    project_name: z.string().describe('Name of the sourcing request'),
    materials: z
      .array(MaterialRowSchema)
      .min(1, 'Provide at least one material/vendor to include in the spreadsheet.'),
  }),
  outputSchema: MaterialsSpreadsheetSchema,
  execute: async ({ context }) => {
    const { project_name, materials } = context;

    return {
      projectName: project_name,
      createdAt: new Date().toISOString(),
      materials,
    };
  },
});

