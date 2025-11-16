import '../load-env.js';
import { Mastra } from '@mastra/core';
import { agents } from './agents/index.js';
import { workflows } from './workflows/index.js';
import { LibSQLStore } from '@mastra/libsql';
import { createLogger } from '../utils/pino-logger.js';

export const mastra = new Mastra({
    agents,
    workflows,
    storage: new LibSQLStore({
        url: ':memory:',
    }),
    logger: createLogger({
        level: (process.env.LOG_LEVEL as any) || 'info',
        name: 'mastra',
    }),
});