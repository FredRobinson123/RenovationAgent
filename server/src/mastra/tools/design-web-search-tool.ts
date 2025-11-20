import { z } from 'zod';
import { createExaSearchTool, webSearchResultSchema } from './exa-search-tools.js';
import type { ExaSearchResult, WebSearchResult } from './exa-search-tools.js';

export { webSearchResultSchema };
export type { WebSearchResult };

const DESIGN_DOMAINS = ['pinterest.com', 'pin.it'];

const designWebSearchInputSchema = z.object({
  query: z.string().describe('The search query related to design topics'),
  numResults: z.number().optional().describe('Number of search results to return, default is 5'),
});

function isAllowedDesignDomain(rawUrl?: string | null): boolean {
  if (!rawUrl) return false;
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return DESIGN_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

export const designWebSearch = createExaSearchTool({
  id: 'design_web_search',
  description:
    'Performs a web search to gather information related to design topics such as interior design, exterior design, architecture, and home improvement.',
  inputSchema: designWebSearchInputSchema,
  buildRequest: ({ query, numResults }) => ({
    query,
    numResults,
    maxCharacters: 500,
  }),
  resultTitleFallback: 'No title available',
  resultSnippetFallback: 'No result available',
  imageTitleFallback: 'Design inspiration',
  defaultNumResults: 5,
  imageResultFilter: (result: ExaSearchResult) => isAllowedDesignDomain(result.url),
});