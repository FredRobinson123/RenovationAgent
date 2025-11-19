import { Agent } from '@mastra/core/agent';
import { geminiFasttModel } from '../llms/index.js';
import { moodboardAgentSystemPrompt } from './prompts.js';

export const moodboardAgent = new Agent({
  name: 'Moodboard Agent',
  description: 'Acknowledges customer uploads and outlines the next moodboard steps.',
  instructions: moodboardAgentSystemPrompt,
  model: geminiFasttModel,
  defaultGenerateOptions: {
    providerOptions: {
      anthropic: {
        stream: false,
      },
    },
  },
});

