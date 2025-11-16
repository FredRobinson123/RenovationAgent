import '../load-env.js';
import { Mastra } from '@mastra/core';
import { agents } from './agents';
import { workflows } from './workflows';
import { LibSQLStore } from '@mastra/libsql';
import { createLogger } from '../utils/pino-logger';

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