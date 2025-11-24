import test from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createAuthService } from '../services/auth-service.js';
import type { JsonRecord, LoggerLike } from '../types.js';

type TokenVerifier = typeof import('@clerk/backend').verifyToken;

const baseConfig = {
  clerkSecretKey: 'test-secret',
  missingClerkSecretMessage: 'missing key',
};

const createLoggerStub = (): LoggerLike => {
  const log = (_message: string, _metadata?: Record<string, unknown>) => undefined;
  return {
    debug: log,
    info: log,
    warn: log,
    error: log,
  };
};

const createSendRecorder = () => {
  const calls: Array<{ statusCode: number; payload: JsonRecord }> = [];
  const sendJson = (_res: ServerResponse, statusCode: number, payload: JsonRecord) => {
    calls.push({ statusCode, payload });
  };
  return { sendJson, calls };
};

test('authenticateRequest responds 401 when no auth header or cookie is provided', async () => {
  const logger = createLoggerStub();
  const { sendJson, calls } = createSendRecorder();
  const authService = createAuthService({
    logger,
    config: baseConfig,
    redactToken: () => '',
    sendJson,
  });

  const req = {
    headers: {},
    url: '/api/agents/foo/run',
    method: 'POST',
  } as IncomingMessage;
  const res = {} as ServerResponse;

  const result = await authService.authenticateRequest(req, res);

  assert.strictEqual(result, undefined);
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].statusCode, 401);
  assert.deepStrictEqual(calls[0].payload, { error: 'Missing Authorization header' });
});

test('authenticateRequest verifies Bearer token successfully', async () => {
  const logger = createLoggerStub();
  const { sendJson, calls } = createSendRecorder();
  const verifierCalls: Array<{ token: string; secretKey?: string }> = [];
  const tokenVerifierStub: TokenVerifier = async (token, options = {}) => {
    verifierCalls.push({ token, secretKey: options.secretKey });
    return { sub: 'user_123', email: 'user@example.com' } as any;
  };
  const authService = createAuthService({
    logger,
    config: baseConfig,
    redactToken: () => '',
    sendJson,
    tokenVerifier: tokenVerifierStub,
  });

  const req = {
    headers: {
      authorization: 'Bearer test-token',
    },
    url: '/api/agents/foo/run',
    method: 'POST',
  } as IncomingMessage;
  const res = {} as ServerResponse;

  const result = await authService.authenticateRequest(req, res);

  assert.deepStrictEqual(result, { userId: 'user_123', email: 'user@example.com' });
  assert.strictEqual(calls.length, 0);
  assert.strictEqual(verifierCalls.length, 1);
  assert.strictEqual(verifierCalls[0].token, 'test-token');
  assert.strictEqual(verifierCalls[0].secretKey, 'test-secret');
});
