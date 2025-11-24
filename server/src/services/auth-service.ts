import { verifyToken as clerkVerifyToken } from '@clerk/backend';
import { parse as parseCookies } from 'cookie';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ServerConfig } from '../config/server-config.js';
import type { JsonRecord, LoggerLike } from '../types.js';

export type AuthenticatedUser = {
  userId: string;
  email?: string;
};

export type AuthServiceDeps = {
  logger: LoggerLike;
  config: Pick<ServerConfig, 'clerkSecretKey' | 'missingClerkSecretMessage'>;
  redactToken: (token: string | undefined | null) => string;
  sendJson: (res: ServerResponse, statusCode: number, payload: JsonRecord) => void;
  tokenVerifier?: typeof clerkVerifyToken;
};

export function createAuthService({
  logger,
  config,
  redactToken,
  sendJson,
  tokenVerifier = clerkVerifyToken,
}: AuthServiceDeps) {
  async function verifyClerkTokenInternal(
    token: string,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<AuthenticatedUser | undefined> {
    const startedAt = Date.now();
    logger.debug('Verifying Clerk token', {
      url: req.url,
      token: redactToken(token),
    });
    try {
      const payload = (await tokenVerifier(token, {
        secretKey: config.clerkSecretKey,
      })) as Record<string, unknown> & { sub?: string; email?: string };

      const userId = typeof payload.sub === 'string' ? payload.sub : undefined;
      if (!userId) {
        logger.warn('Clerk token missing subject', { url: req.url });
        sendJson(res, 401, { error: 'Invalid auth token' });
        return undefined;
      }

      const email = typeof payload.email === 'string' ? payload.email : undefined;
      logger.debug('Clerk token verified', {
        url: req.url,
        userId,
        email,
        durationMs: Date.now() - startedAt,
      });
      return { userId, email };
    } catch (error) {
      logger.warn('Failed to verify Clerk token', {
        err: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        url: req.url,
        durationMs: Date.now() - startedAt,
      });
      sendJson(res, 401, { error: 'Invalid auth token' });
      return undefined;
    }
  }

  async function authenticateRequest(req: IncomingMessage, res: ServerResponse): Promise<AuthenticatedUser | undefined> {
    logger.debug('Authenticating agent request', {
      url: req.url,
      hasAuthHeader: Boolean(req.headers.authorization),
      hasSessionCookie: Boolean(req.headers.cookie?.includes('__session')),
    });

    if (!config.clerkSecretKey) {
      logger.error('CLERK_SECRET_KEY is not configured');
      sendJson(res, 500, { error: config.missingClerkSecretMessage });
      return undefined;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const cookiesHeader = req.headers.cookie;
      const cookies = cookiesHeader ? parseCookies(cookiesHeader) : {};
      const cookieToken = cookies['__session'];
      if (!cookieToken) {
        logger.warn('Missing or malformed Authorization header', {
          hasHeader: Boolean(authHeader),
          headerPrefix: authHeader?.slice(0, 10),
          url: req.url,
          hasSessionCookie: Boolean(cookieToken),
        });
        sendJson(res, 401, { error: 'Missing Authorization header' });
        return undefined;
      }

      logger.debug('Using Clerk session cookie for authentication', {
        url: req.url,
        cookieToken: redactToken(cookieToken),
      });
      return verifyClerkTokenInternal(cookieToken, req, res);
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      logger.warn('Authorization header did not contain a token', {
        url: req.url,
      });
      sendJson(res, 401, { error: 'Invalid Authorization header' });
      return undefined;
    }

    logger.debug('Using Authorization header for authentication', {
      url: req.url,
      token: redactToken(token),
    });
    return verifyClerkTokenInternal(token, req, res);
  }

  return {
    authenticateRequest,
    verifyClerkToken: verifyClerkTokenInternal,
  };
}
