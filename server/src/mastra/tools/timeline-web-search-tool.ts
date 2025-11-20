import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import Exa from 'exa-js';
import { webSearchResultSchema } from './design-web-search-tool.js';

const exa = new Exa(process.env.EXASEARCH_API_KEY);

const TimelineSearchInputSchema = z.object({
  taskSummary: z
    .string()
    .min(
      1,
      'Provide a condensed summary of the renovation tasks (e.g., "bathroom gut + tile + vanity").'
    ),
  numResults: z.number().int().min(1).max(10).optional(),
});

export const timelineWebSearch = createTool({
  id: 'timeline_web_search',
  description:
    'Searches homeowner forums and timeline guides to estimate realistic renovation task durations.',
  inputSchema: TimelineSearchInputSchema,
  outputSchema: webSearchResultSchema,
  execute: async ({ context }) => {
    const { taskSummary, numResults = 6 } = context;
    const query = `${taskSummary} renovation timeline reddit homeowners schedule`;

    const searchResponse = await exa.searchAndContents(query, {
      numResults,
      type: 'auto',
      text: { maxCharacters: 500 },
    });

    const imageResults = searchResponse.results
      .filter((result) => typeof result.image === 'string' && result.image.trim().length > 0)
      .slice(0, 5)
      .map((result) => ({
        id: result.id,
        title: result.title || 'Timeline insight',
        description: result.text || null,
        imageUrl: result.image as string,
        sourceUrl: result.url,
      }));

    return {
      query,
      results: searchResponse.results.map((result) => ({
        title: result.title || 'Timeline insight',
        url: result.url,
        snippet: result.text || 'No summary available',
      })),
      images: imageResults,
      timestamp: new Date().toISOString(),
    };
  },
});

