import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { geminiFasttModel } from '../llms/index.js';
import { budgetAgentSystemPrompt } from './prompts.js';
import { generateBudgetSpreadsheet } from '../tools/create-budget-spreadsheet-tool.js';



export const budgetAgent = new Agent({
   name: 'Budget Agent',
   description: 'An agent that helps users create detailed renovation budgets.',
   instructions: budgetAgentSystemPrompt,
   model: geminiFasttModel,
   tools: {
    generateBudgetSpreadsheet,
   },
   defaultGenerateOptions: {
       toolChoice: 'auto', // https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#tool-choice
       providerOptions: {
           anthropic: {
               stream: false
           }
       },
   },



   memory: new Memory({
       storage: new LibSQLStore({
           url: 'file:../mastra.db',
       }),
       options: {
           lastMessages: 10,
           semanticRecall: false,
           threads: {
               generateTitle: false,
           },
       },
   }),
});