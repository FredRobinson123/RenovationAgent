import type { ServerResponse } from 'node:http';
import type { VercelRequest, VercelResponse } from '@vercel/node';

type JsonRecord = Record<string, unknown>;

type LoggerLike = {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

type RuntimeDeps = {
  authService: {
    authenticateRequest: (
      req: VercelRequest,
      res: VercelResponse
    ) => Promise<{ userId: string; email?: string } | undefined>;
  };
  logger: LoggerLike;
};

type AgentRuntimeDeps = RuntimeDeps & {
  agentRunner: {
    handleAgentRunRequest: (
      agentSlug: string,
      req: VercelRequest,
      res: VercelResponse,
      authUser: { userId: string; email?: string }
    ) => Promise<void>;
  };
};

const defaultLogger: LoggerLike = {
  debug: (...args) => console.debug(...args),
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

let runtimeDepsPromise: Promise<RuntimeDeps> | undefined;
let agentRuntimeDepsPromise: Promise<AgentRuntimeDeps> | undefined;

type JsonResponse = ServerResponse & Partial<Pick<VercelResponse, 'status' | 'json'>>;

export function setCorsHeaders(res: Pick<ServerResponse, 'setHeader'>): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
}

export function sendJson(res: JsonResponse, statusCode: number, body: JsonRecord): void {
  setCorsHeaders(res);
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(statusCode).json(body);
    return;
  }

  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

export async function getRuntimeDeps(): Promise<RuntimeDeps> {
  if (!runtimeDepsPromise) {
    runtimeDepsPromise = initializeRuntimeDeps().catch((error) => {
      runtimeDepsPromise = undefined;
      throw error;
    });
  }

  return runtimeDepsPromise;
}

export async function getAgentRuntimeDeps(): Promise<AgentRuntimeDeps> {
  if (!agentRuntimeDepsPromise) {
    agentRuntimeDepsPromise = initializeAgentRuntimeDeps().catch((error) => {
      agentRuntimeDepsPromise = undefined;
      throw error;
    });
  }

  return agentRuntimeDepsPromise;
}

export function sendInitializationError(
  res: VercelResponse,
  error: unknown,
  fallbackMessage = 'Server initialization failed.'
): void {
  const message = getErrorMessage(error, fallbackMessage);
  defaultLogger.error('Serverless function initialization failed', {
    err: error instanceof Error ? { message: error.message, stack: error.stack } : error,
  });
  sendJson(res, 500, { error: message });
}

async function initializeRuntimeDeps(): Promise<RuntimeDeps> {
  const [
    authServiceModule,
    loggerModule,
    serverConfigModule,
  ] = await Promise.all([
    import('../../server/src/services/auth-service.js'),
    import('../../server/src/utils/pino-logger.js'),
    import('../../server/src/config/server-config.js'),
  ]);

  const logger = (loggerModule.logger as LoggerLike | undefined) ?? defaultLogger;

  const authService = authServiceModule.createAuthService({
    logger,
    config: serverConfigModule.serverConfig,
    redactToken: serverConfigModule.redactToken,
    sendJson,
  });

  return {
    authService,
    logger,
  };
}

async function initializeAgentRuntimeDeps(): Promise<AgentRuntimeDeps> {
  const [runtimeDeps, agentRunnerModule] = await Promise.all([
    getRuntimeDeps(),
    import('../../server/src/services/agent-runner.js'),
  ]);

  return {
    ...runtimeDeps,
    agentRunner: agentRunnerModule.createAgentRunner({ logger: runtimeDeps.logger }),
  };
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) {
      return message;
    }
  }

  return fallbackMessage;
}
