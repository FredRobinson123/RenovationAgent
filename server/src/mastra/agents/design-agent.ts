import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { geminiFasttModel } from '../llms/index.js';
import { designAgentSystemPrompt } from './prompts.js';
import { designWebSearch } from '../tools/design-web-search-tool.js';



export const designAgent = new Agent({
   name: 'Design Agent',
   description: 'An agent that helps users with interior and exterior design projects.',
   instructions: designAgentSystemPrompt,
   model: geminiFasttModel,
   tools: {
      designWebSearch
   },
   defaultGenerateOptions: {
      toolChoice: 'auto', // https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#tool-choice
      providerOptions: {
         anthropic: {
            stream: false
         }
      }
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
   })
});