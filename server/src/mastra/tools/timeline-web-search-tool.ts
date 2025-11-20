import { z } from 'zod';
import { createExaSearchTool } from './exa-search-tools.js';

const TimelineSearchInputSchema = z.object({
  taskSummary: z
    .string()
    .min(
      1,
      'Provide a condensed summary of the renovation tasks (e.g., "bathroom gut + tile + vanity").'
    ),
  numResults: z.number().int().min(1).max(10).optional(),
});

export const timelineWebSearch = createExaSearchTool({
  id: 'timeline_web_search',
  description:
    'Searches homeowner forums and timeline guides to estimate realistic renovation task durations.',
  inputSchema: TimelineSearchInputSchema,
  buildRequest: ({ taskSummary, numResults }) => ({
    query: `${taskSummary} renovation timeline reddit homeowners schedule`,
    numResults,
    maxCharacters: 500,
  }),
  resultTitleFallback: 'Timeline insight',
  resultSnippetFallback: 'No summary available',
  imageTitleFallback: 'Timeline insight',
  defaultNumResults: 6,
});

