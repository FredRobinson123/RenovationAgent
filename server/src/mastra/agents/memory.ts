import { LibSQLStore } from '@mastra/libsql';
import { Memory } from '@mastra/memory';

const DEFAULT_AGENT_MEMORY_URL = 'file:../mastra.db';

export function resolveAgentMemoryUrl(): string {
  const configuredUrl = process.env.MASTRA_MEMORY_URL?.trim();
  if (configuredUrl) {
    return configuredUrl;
  }

  if (process.env.VERCEL === '1' || process.env.AWS_REGION || process.env.LAMBDA_TASK_ROOT) {
    return ':memory:';
  }

  return DEFAULT_AGENT_MEMORY_URL;
}

export function createAgentMemory(): Memory {
  return new Memory({
    storage: new LibSQLStore({
      url: resolveAgentMemoryUrl(),
    }),
    options: {
      lastMessages: 10,
      semanticRecall: false,
      threads: {
        generateTitle: false,
      },
    },
  });
}
