import type { VercelRequest, VercelResponse } from '@vercel/node';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type JsonRecord = { [key: string]: JsonValue };

type LoggerLike = {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

type RuntimeDeps = {
  agentRunner: {
    handleAgentRunRequest: (
      agentSlug: string,
      req: VercelRequest,
      res: VercelResponse,
      authUser: { userId: string; email?: string }
    ) => Promise<void>;
  };
  authService: {
    authenticateRequest: (
      req: VercelRequest,
      res: VercelResponse
    ) => Promise<{ userId: string; email?: string } | undefined>;
  };
  logger: LoggerLike;
};

const defaultLogger: LoggerLike = {
  debug: (...args) => console.debug(...args),
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

let runtimeDepsPromise: Promise<RuntimeDeps> | undefined;

export function setCorsHeaders(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
}

export function sendJson(res: VercelResponse, statusCode: number, body: JsonRecord): void {
  setCorsHeaders(res);
  res.status(statusCode).json(body);
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
    agentRunnerModule,
    loggerModule,
    serverConfigModule,
  ] = await Promise.all([
    import('../../server/dist/services/auth-service.js'),
    import('../../server/dist/services/agent-runner.js'),
    import('../../server/dist/utils/pino-logger.js'),
    import('../../server/dist/config/server-config.js'),
  ]);

  const logger = (loggerModule.logger as LoggerLike | undefined) ?? defaultLogger;

  const authService = authServiceModule.createAuthService({
    logger,
    config: serverConfigModule.serverConfig,
    redactToken: serverConfigModule.redactToken,
    sendJson,
  });

  const agentRunner = agentRunnerModule.createAgentRunner({ logger });

  return {
    agentRunner,
    authService,
    logger,
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
