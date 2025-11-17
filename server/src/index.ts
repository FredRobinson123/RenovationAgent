/**
 * Server entry point
 * This file starts the development server and initializes the Mastra instance.
 * Run with: pnpm dev
 */
import './load-env.js';
import { createServer } from 'node:http';
import { serverConfig, serverEnvironmentSummary, redactToken } from './config/server-config.js';
import { createRequestHandler } from './routing/router.js';
import { createAuthService } from './services/auth-service.js';
import { createWorkflowRunner } from './services/workflow-runner.js';
import { resolveWorkflowInstance, listWorkflowIds } from './services/workflow-registry.js';
import { logger } from './utils/pino-logger.js';
import { sendJson } from './http/http-utils.js';
import { agents } from './mastra/agents/index.js';

const authService = createAuthService({
  logger,
  config: serverConfig,
  redactToken,
  sendJson,
});

const workflowRunner = createWorkflowRunner({
  logger,
  workflowTimeoutMs: serverConfig.workflowTimeoutMs,
  resolveWorkflowInstance,
});

const requestHandler = createRequestHandler({
  logger,
  defaultPort: serverConfig.port,
  authenticateRequest: authService.authenticateRequest,
  handleWorkflowRunRequest: workflowRunner.handleWorkflowRunRequest,
});

logger.info('Server environment configuration', serverEnvironmentSummary);

async function startServer() {
  try {
    logger.info('Starting Mastra server...');
    const workflowIds = listWorkflowIds();
    const agentIds = Object.keys(agents);
    logger.info(`Mastra instance initialized with ${agentIds.length} agents and ${workflowIds.length} workflows`);

    const server = createServer((req, res) => {
      requestHandler(req, res).catch((error) => {
        logger.error('Unhandled server error', { err: error });
        if (!res.headersSent) {
          sendJson(res, 500, { error: 'Internal server error' });
        } else {
          res.end();
        }
      });
    });

    server.listen(serverConfig.port, serverConfig.hostname, () => {
      logger.info(`Server ready at http://localhost:${serverConfig.port}`);
      logger.info('Use POST /api/workflows/{id}/run to execute workflows.');
    });

    process.on('SIGINT', () => {
      logger.info('Shutting down server...');
      server.close(() => process.exit(0));
    });

    process.on('SIGTERM', () => {
      logger.info('Shutting down server...');
      server.close(() => process.exit(0));
    });
  } catch (error) {
    logger.error('Failed to start server', { err: error });
    process.exit(1);
  }
}

startServer();
