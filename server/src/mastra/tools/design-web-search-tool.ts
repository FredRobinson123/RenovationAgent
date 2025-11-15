import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import Exa from 'exa-js';


const exa = new Exa(process.env.EXASEARCH_API_KEY);


export const webSearchResultSchema = z.object({
    query: z.string().describe('The search query used'),
    results: z.array(z.object({
        title: z.string().describe('Title of the search result'),
        url: z.string().describe('URL of the search result'),
        snippet: z.string().describe('Snippet or summary of the search result'),
    })).describe('List of search results'),
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
            numResults: numResults,
            type: 'auto',
            text: { maxCharacters: 500 }
        });


        return {
            query: query,
            results: searchResponse.results.map(result => ({
                title: result.title || 'No title available',
                url: result.url,
                snippet: result.text || 'No result available',
            })),
            timestamp: new Date().toISOString(),
        };
    }
});