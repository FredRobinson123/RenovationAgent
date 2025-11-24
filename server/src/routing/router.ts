import type { IncomingMessage, ServerResponse } from 'node:http';
import { setCorsHeaders, sendJson } from '../http/http-utils.js';
import { agents } from '../mastra/agents/index.js';
import type { LoggerLike } from '../types.js';
import type { AuthenticatedUser } from '../services/auth-service.js';
import { handleImageUploadRequest, handleUploadDeleteRequest } from './upload-handler.js';

export type RouterDeps = {
  logger: LoggerLike;
  defaultPort: number;
  authenticateRequest: (req: IncomingMessage, res: ServerResponse) => Promise<AuthenticatedUser | undefined>;
  handleAgentRunRequest: (
    agentSlug: string,
    req: IncomingMessage,
    res: ServerResponse,
    authUser: AuthenticatedUser
  ) => Promise<void>;
};

export function createRequestHandler({ logger, defaultPort, authenticateRequest, handleAgentRunRequest }: RouterDeps) {
  const agentIds = Object.keys(agents);

  return async function requestHandler(req: IncomingMessage, res: ServerResponse) {
    try {
      setCorsHeaders(res);

      if (!req.url || !req.method) {
        sendJson(res, 400, { error: 'Invalid request' });
        return;
      }

      logger.debug('Incoming HTTP request', {
        method: req.method,
        url: req.url,
        hostHeader: req.headers.host,
        origin: req.headers.origin,
      });

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const hostHeader = req.headers.host ?? `localhost:${defaultPort}`;
      const url = new URL(req.url, `http://${hostHeader}`);
      if (req.method === 'GET' && url.pathname === '/health') {
        sendJson(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
        return;
      }

      if (req.method === 'GET' && url.pathname === '/') {
        sendJson(res, 200, {
          message: 'Renovation Agent server is running',
          agents: agentIds,
          agentEndpoints: agentIds.map((id) => `/api/agents/${id.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}/run`),
        });
        return;
      }

      if (req.method === 'POST' && url.pathname.startsWith('/api/agents/') && url.pathname.endsWith('/run')) {
        const [, , , agentSlug] = url.pathname.split('/');
        if (!agentSlug) {
          sendJson(res, 400, { error: 'Invalid agent path' });
          return;
        }

        const authUser = await authenticateRequest(req, res);
        if (!authUser) {
          return;
        }

        await handleAgentRunRequest(agentSlug, req, res, authUser);
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/uploads/images') {
        const authUser = await authenticateRequest(req, res);
        if (!authUser) {
          return;
        }
        await handleImageUploadRequest(req, res, authUser, { logger });
        return;
      }

      if (req.method === 'DELETE' && url.pathname.startsWith('/api/uploads/')) {
        const [, , , uploadId] = url.pathname.split('/');
        const authUser = await authenticateRequest(req, res);
        if (!authUser) {
          return;
        }
        await handleUploadDeleteRequest(uploadId, res, authUser, { logger });
        return;
      }

      sendJson(res, 404, { error: 'Route not found' });
    } catch (error) {
      logger.error('Request handler error', { err: error });
      sendJson(res, 500, { error: 'Internal server error' });
    }
  };
}
