/**
 * Shared initialisation for all Vercel serverless functions.
 *
 * Module-scope singletons are created once per cold start and reused across
 * warm invocations, matching the behaviour of the long-running Railway server.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createAuthService } from '../../server/src/services/auth-service.js';
import { createAgentRunner } from '../../server/src/services/agent-runner.js';
import { logger } from '../../server/src/utils/pino-logger.js';
import { sendJson, setCorsHeaders } from '../../server/src/http/http-utils.js';
import { serverConfig, redactToken } from '../../server/src/config/server-config.js';

export { logger, sendJson, setCorsHeaders, serverConfig };

export const authService = createAuthService({
  logger,
  config: serverConfig,
  redactToken,
  sendJson,
});

export const agentRunner = createAgentRunner({ logger });

/**
 * Handle CORS preflight. Returns `true` if the request was an OPTIONS
 * preflight and has already been answered (caller should return early).
 */
export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
