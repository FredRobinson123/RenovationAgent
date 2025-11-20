import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import Exa from 'exa-js';


const exa = new Exa(process.env.EXASEARCH_API_KEY);
const DESIGN_DOMAINS = ['pinterest.com', 'pin.it'];

function isAllowedDesignDomain(rawUrl?: string | null): boolean {
    if (!rawUrl) return false;
    try {
        const host = new URL(rawUrl).hostname.toLowerCase();
        return DESIGN_DOMAINS.some(
            domain => host === domain || host.endsWith(`.${domain}`)
        );
    } catch {
        return false;
    }
}


export const webSearchResultSchema = z.object({
    query: z.string().describe('The search query used'),
    results: z.array(z.object({
        title: z.string().describe('Title of the search result'),
        url: z.string().describe('URL of the search result'),
        snippet: z.string().describe('Snippet or summary of the search result'),
    })).describe('List of search results'),
    images: z.array(z.object({
        id: z.string().describe('Unique identifier for the image result'),
        title: z.string().describe('Title or caption for the inspiration image'),
        description: z.string().nullable().describe('Supporting description for the image'),
        imageUrl: z.string().describe('Direct URL to the inspiration image'),
        sourceUrl: z.string().describe('Source page for the inspiration image'),
    })).max(5).describe('Up to five image-focused inspiration results'),
    timestamp: z.string().describe('Timestamp of when the search was performed'),
})


export type WebSearchResult = z.infer<typeof webSearchResultSchema>;


export const designWebSearch = createTool({
    id: 'design_web_search',
    description: 'Performs a web search to gather information related to design topics such as interior design, exterior design, architecture, and home improvement.',
    inputSchema: z.object({
        query: z.string().describe('The search query related to design topics'),
        numResults: z.number().optional().describe('Number of search results to return, default is 5'),
    }),
    outputSchema: webSearchResultSchema,
    execute: async ({ context }) => {
        const { query, numResults = 5 } = context;

        const searchResponse = await exa.searchAndContents(query, {
            numResults,
            type: 'auto',
            text: { maxCharacters: 500 }
        });

        const curatedResults = searchResponse.results.filter((result) =>
            isAllowedDesignDomain(result.url)
        );

        const imageResults = curatedResults
            .filter((result) => typeof result.image === 'string' && result.image.trim().length > 0)
            .slice(0, 5)
            .map((result) => ({
                id: result.id,
                title: result.title || 'Design inspiration',
                description: result.text || null,
                imageUrl: result.image as string,
                sourceUrl: result.url,
            }));

        return {
            query,
            results: searchResponse.results.map(result => ({
                title: result.title || 'No title available',
                url: result.url,
                snippet: result.text || 'No result available',
            })),
            images: imageResults,
            timestamp: new Date().toISOString(),
        };
    }
});