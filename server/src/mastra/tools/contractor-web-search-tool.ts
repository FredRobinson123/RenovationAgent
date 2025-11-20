import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import Exa from 'exa-js';
import { webSearchResultSchema } from './design-web-search-tool.js';

const exa = new Exa(process.env.EXASEARCH_API_KEY);

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

export const contractorWebSearch = createTool({
  id: 'contractor_web_search',
  description:
    'Performs a web search focused on renovation contractors by specialty and service area.',
  inputSchema: ContractorSearchInputSchema,
  outputSchema: webSearchResultSchema,
  execute: async ({ context }) => {
    const { location, contractorType, numResults = 6 } = context;
    const query = `${contractorType} contractors in ${location} home renovation`;

    const searchResponse = await exa.searchAndContents(query, {
      numResults,
      type: 'auto',
      text: { maxCharacters: 400 },
    });

    const imageResults = searchResponse.results
      .filter((result) => typeof result.image === 'string' && result.image.trim().length > 0)
      .slice(0, 5)
      .map((result) => ({
        id: result.id,
        title: result.title || 'Contractor listing',
        description: result.text || null,
        imageUrl: result.image as string,
        sourceUrl: result.url,
      }));

    return {
      query,
      results: searchResponse.results.map((result) => ({
        title: result.title || 'Listing',
        url: result.url,
        snippet: result.text || 'No summary available',
      })),
      images: imageResults,
      timestamp: new Date().toISOString(),
    };
  },
});

