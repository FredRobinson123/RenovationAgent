import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import Exa from 'exa-js';
import { webSearchResultSchema } from './design-web-search-tool.js';

const exa = new Exa(process.env.EXASEARCH_API_KEY);

const MaterialsSearchInputSchema = z.object({
  location: z.string().min(1, 'Provide a specific area to localize the supplier search.'),
  materialType: z
    .string()
    .min(1, 'Describe the material or finish category you want to source.'),
  numResults: z.number().int().min(1).max(10).optional(),
});

export const materialsWebSearch = createTool({
  id: 'materials_web_search',
  description: 'Looks up suppliers or showrooms for specific materials in the requested area.',
  inputSchema: MaterialsSearchInputSchema,
  outputSchema: webSearchResultSchema,
  execute: async ({ context }) => {
    const { location, materialType, numResults = 6 } = context;
    const query = `${materialType} suppliers in ${location} home renovation`;

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
        title: result.title || 'Supplier listing',
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

