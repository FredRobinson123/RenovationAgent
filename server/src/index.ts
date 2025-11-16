/**
 * Server entry point
 * This file starts the development server and initializes the Mastra instance.
 * Run with: pnpm dev
 */
import 'dotenv/config';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { verifyToken } from '@clerk/backend';
import { mastra } from './mastra/index.js';
import { agents } from './mastra/agents/index.js';
import { workflows } from './mastra/workflows/index.js';
import { logger } from './utils/pino-logger.js';

const PORT = Number(process.env.PORT) || 5001;
const hostname = process.env.HOST || '0.0.0.0';
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

type JsonRecord = Record<string, unknown>;
type WorkflowInstance = {
  start: (args: { inputData: JsonRecord }) => Promise<{
    status: string;
    result: unknown;
    steps?: Record<string, unknown>;
    resumeLabels?: Record<string, unknown>;
  }>;
};
const workflowMap: Record<string, WorkflowInstance> =
  workflows as unknown as Record<string, WorkflowInstance>;

type AuthenticatedUser = {
  userId: string;
  email?: string;
};

function setCorsHeaders(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

async function readJsonBody(req: IncomingMessage): Promise<JsonRecord | undefined> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  const rawBody = Buffer.concat(chunks).toString('utf8').trim();
  if (!rawBody) {
    return undefined;
  }

  try {
    return JSON.parse(rawBody);
  } catch (error) {
    logger.warn('Failed to parse request body as JSON', { rawBody, err: error });
    throw new Error('Invalid JSON payload');
  }
}

function sendJson(res: ServerResponse, statusCode: number, payload: JsonRecord) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

async function authenticateRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<AuthenticatedUser | undefined> {
  if (!clerkSecretKey) {
    logger.error('CLERK_SECRET_KEY is not configured');
    sendJson(res, 500, { error: 'Server authentication is misconfigured' });
    return undefined;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendJson(res, 401, { error: 'Missing Authorization header' });
    return undefined;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    sendJson(res, 401, { error: 'Invalid Authorization header' });
    return undefined;
  }

  try {
    const payload = (await verifyToken(token, {
      secretKey: clerkSecretKey,
    })) as Record<string, unknown> & { sub?: string; email?: string };

    const userId = typeof payload.sub === 'string' ? payload.sub : undefined;
    if (!userId) {
      logger.warn('Clerk token missing subject');
      sendJson(res, 401, { error: 'Invalid auth token' });
      return undefined;
    }

    const email = typeof payload.email === 'string' ? payload.email : undefined;
    return { userId, email };
  } catch (error) {
    logger.warn('Failed to verify Clerk token', { err: error });
    sendJson(res, 401, { error: 'Invalid auth token' });
    return undefined;
  }
}

async function handleWorkflowRunRequest(
  workflowId: string,
  req: IncomingMessage,
  res: ServerResponse,
  authUser: AuthenticatedUser
) {
  const workflow =
    workflowMap[workflowId] ??
    (typeof mastra.getWorkflowById === 'function' ? mastra.getWorkflowById(workflowId) : undefined);

  if (!workflow) {
    sendJson(res, 404, { error: `Workflow "${workflowId}" not found` });
    return;
  }

  const body = await readJsonBody(req);
  const inputData = (body?.inputData ?? body) as JsonRecord | undefined;

  if (!inputData || typeof inputData !== 'object' || Array.isArray(inputData)) {
    sendJson(res, 400, { error: 'Request must include input data for the workflow' });
    return;
  }

  const workflowInput: JsonRecord = {
    ...inputData,
    userId: authUser.userId,
  };
  if (authUser.email) {
    workflowInput.userEmail = authUser.email;
  }

  logger.info('Executing workflow', {
    workflowId,
    inputKeys: Object.keys(workflowInput),
    userId: authUser.userId,
  });

  const runResult = await workflow.start({
    inputData: workflowInput,
  });

  sendJson(res, 200, {
    workflowId,
    status: runResult.status,
    result: runResult.result,
    metadata: {
      steps: Object.keys(runResult.steps ?? {}),
      resumeLabels: runResult.resumeLabels,
    },
  });
}

async function requestHandler(req: IncomingMessage, res: ServerResponse) {
  try {
    setCorsHeaders(res);

    if (!req.url || !req.method) {
      sendJson(res, 400, { error: 'Invalid request' });
      return;
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? `localhost:${PORT}`}`);
    const workflowIds = Object.keys(workflows);
    const agentIds = Object.keys(agents);

    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/') {
      sendJson(res, 200, {
        message: 'Renovation Agent server is running',
        workflows: workflowIds,
        agents: agentIds,
      });
      return;
    }

    if (req.method === 'POST' && url.pathname.startsWith('/api/workflows/') && url.pathname.endsWith('/run')) {
      const [, , , workflowId] = url.pathname.split('/');
      if (!workflowId) {
        sendJson(res, 400, { error: 'Invalid workflow path' });
        return;
      }
      const authUser = await authenticateRequest(req, res);
      if (!authUser) {
        return;
      }
      await handleWorkflowRunRequest(workflowId, req, res, authUser);
      return;
    }

    sendJson(res, 404, { error: 'Route not found' });
  } catch (error) {
    logger.error('Request handler error', { err: error });
    sendJson(res, 500, { error: 'Internal server error' });
  }
}

async function startServer() {
  try {
    logger.info('Starting Mastra server...');
    logger.debug('Mastra instance loaded', { hasMastraInstance: Boolean(mastra) });
    const workflowIds = Object.keys(workflows);
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

    server.listen(PORT, hostname, () => {
      logger.info(`Server ready at http://localhost:${PORT}`);
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

