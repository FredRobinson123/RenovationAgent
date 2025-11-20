import { z } from 'zod';
import { createExaSearchTool } from './exa-search-tools.js';

const MaterialsSearchInputSchema = z.object({
  location: z.string().min(1, 'Provide a specific area to localize the supplier search.'),
  materialType: z
    .string()
    .min(1, 'Describe the material or finish category you want to source.'),
  numResults: z.number().int().min(1).max(10).optional(),
});

export const materialsWebSearch = createExaSearchTool({
  id: 'materials_web_search',
  description: 'Looks up suppliers or showrooms for specific materials in the requested area.',
  inputSchema: MaterialsSearchInputSchema,
  buildRequest: ({ location, materialType, numResults }) => ({
    query: `${materialType} suppliers in ${location} home renovation`,
    numResults,
    maxCharacters: 400,
  }),
  resultTitleFallback: 'Listing',
  resultSnippetFallback: 'No summary available',
  imageTitleFallback: 'Supplier listing',
  defaultNumResults: 6,
});

