import './test-env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createRequestHandler } from '../routing/router.js';
import type { LoggerLike } from '../types.js';
import type { PlanAssetRecord } from '../services/plan-asset-service.js';

const loggerStub: LoggerLike = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const createRequest = (method: string, path: string): IncomingMessage => {
  const stream = Readable.from([]);
  return Object.assign(stream, {
    method,
    url: path,
    headers: { host: 'localhost:5001' },
  }) as IncomingMessage;
};

const createResponseRecorder = () => {
  let statusCode: number | undefined;
  let responseBody = '';
  const headers: Record<string, string> = {};

  const res = {
    headersSent: false,
    setHeader: (key: string, value: string) => {
      headers[key] = value;
    },
    writeHead: (code: number, extraHeaders?: Record<string, string>) => {
      statusCode = code;
      if (extraHeaders) {
        Object.assign(headers, extraHeaders);
      }
    },
    end: (body?: string) => {
      if (body) {
        responseBody = body;
      }
      (res as any).headersSent = true;
    },
  } as unknown as ServerResponse;

  return {
    res,
    getResult: () => ({
      statusCode,
      body: responseBody,
      headers,
    }),
  };
};

test('GET /api/plan/:sessionId/assets returns persisted assets for authenticated users', async () => {
  const assets: PlanAssetRecord[] = [
    {
      id: 'asset_1',
      sessionId: 'session_alpha',
      userId: 'user_456',
      assetType: 'budget',
      title: 'Kitchen refresh',
      summary: 'High-level budget',
      data: { projectName: 'Kitchen refresh' },
      sourceAgent: 'budget-agent',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  ];

  let loadCallArgs: { sessionId: string; userId: string } | undefined;
  const handler = createRequestHandler({
    logger: loggerStub,
    defaultPort: 5001,
    authenticateRequest: async () => ({ userId: 'user_456' }),
    handleAgentRunRequest: async () => undefined,
    loadPlanAssetsBySession: async (sessionId, userId) => {
      loadCallArgs = { sessionId, userId };
      return assets;
    },
  });

  const req = createRequest('GET', '/api/plan/session_alpha/assets');
  const { res, getResult } = createResponseRecorder();

  await handler(req, res);

  const result = getResult();
  assert.equal(result.statusCode, 200);
  assert.deepEqual(loadCallArgs, { sessionId: 'session_alpha', userId: 'user_456' });
  const payload = JSON.parse(result.body);
  assert.equal(payload.sessionId, 'session_alpha');
  assert.equal(payload.assets.length, 1);
  assert.equal(payload.assets[0].id, 'asset_1');
});

