import { z } from 'zod';
import { createExaSearchTool } from './exa-search-tools.js';

const ContractorSearchInputSchema = z.object({
  location: z
    .string()
    .min(1, 'A specific neighborhood, city, or region is required to source contractors.'),
  contractorType: z
    .string()
    .min(1, 'Describe the type of contractor (e.g., general contractor, tiler, electrician).'),
  numResults: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe('Maximum number of contractor search results to return, default is 6.'),
});

export const contractorWebSearch = createExaSearchTool({
  id: 'contractor_web_search',
  description:
    'Performs a web search focused on renovation contractors by specialty and service area.',
  inputSchema: ContractorSearchInputSchema,
  buildRequest: ({ location, contractorType, numResults }) => ({
    query: `${contractorType} contractors in ${location} home renovation`,
    numResults,
    maxCharacters: 400,
  }),
  resultTitleFallback: 'Listing',
  resultSnippetFallback: 'No summary available',
  imageTitleFallback: 'Contractor listing',
  defaultNumResults: 6,
});

