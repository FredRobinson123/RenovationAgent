import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import Exa from 'exa-js';

const exaClient = new Exa(process.env.EXASEARCH_API_KEY);

export const webSearchResultSchema = z.object({
  query: z.string().describe('The search query used'),
  results: z
    .array(
      z.object({
        title: z.string().describe('Title of the search result'),
        url: z.string().describe('URL of the search result'),
        snippet: z.string().describe('Snippet or summary of the search result'),
      })
    )
    .describe('List of search results'),
  images: z
    .array(
      z.object({
        id: z.string().describe('Unique identifier for the image result'),
        title: z.string().describe('Title or caption for the inspiration image'),
        description: z.string().nullable().describe('Supporting description for the image'),
        imageUrl: z.string().describe('Direct URL to the inspiration image'),
        sourceUrl: z.string().describe('Source page for the inspiration image'),
      })
    )
    .max(5)
    .describe('Up to five image-focused inspiration results'),
  timestamp: z.string().describe('Timestamp of when the search was performed'),
});

export type WebSearchResult = z.infer<typeof webSearchResultSchema>;

export type ExaSearchResult = {
  id: string;
  url: string;
  title?: string | null;
  text?: string | null;
  image?: string | null;
};

type SearchRequest = {
  query: string;
  numResults?: number;
  maxCharacters?: number;
};

type ExaSearchToolOptions<TSchema extends z.ZodTypeAny> = {
  id: string;
  description: string;
  inputSchema: TSchema;
  buildRequest: (input: z.infer<TSchema>) => SearchRequest;
  resultTitleFallback?: string;
  resultSnippetFallback?: string;
  imageTitleFallback?: string;
  defaultNumResults?: number;
  defaultMaxCharacters?: number;
  imageResultFilter?: (result: ExaSearchResult) => boolean;
};

export function createExaSearchTool<TSchema extends z.ZodTypeAny>({
  id,
  description,
  inputSchema,
  buildRequest,
  resultTitleFallback = 'Search result',
  resultSnippetFallback = 'No summary available',
  imageTitleFallback = 'Search inspiration',
  defaultNumResults = 5,
  defaultMaxCharacters = 500,
  imageResultFilter,
}: ExaSearchToolOptions<TSchema>) {
  return createTool({
    id,
    description,
    inputSchema,
    outputSchema: webSearchResultSchema,
    execute: async ({ context }) => {
      const { query, numResults, maxCharacters } = buildRequest(context);
      const searchResponse = await exaClient.searchAndContents(query, {
        numResults: numResults ?? defaultNumResults,
        type: 'auto',
        text: { maxCharacters: maxCharacters ?? defaultMaxCharacters },
      });

      const results: ExaSearchResult[] = Array.isArray(searchResponse.results)
        ? (searchResponse.results as ExaSearchResult[])
        : [];

      const normalizedResults = results.map((result) => ({
        title: result.title || resultTitleFallback,
        url: result.url,
        snippet: result.text || resultSnippetFallback,
      }));

      const imageResults = results
        .filter((result) => typeof result.image === 'string' && result.image.trim().length > 0)
        .filter((result) => (imageResultFilter ? imageResultFilter(result) : true))
        .slice(0, 5)
        .map((result) => ({
          id: result.id,
          title: result.title || imageTitleFallback,
          description: result.text || null,
          imageUrl: result.image as string,
          sourceUrl: result.url,
        }));

      return {
        query,
        results: normalizedResults,
        images: imageResults,
        timestamp: new Date().toISOString(),
      };
    },
  });
}

