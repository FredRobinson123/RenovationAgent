import './test-env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createAgentRunner } from '../services/agent-runner.js';
import type { LoggerLike } from '../types.js';

type JsonRecord = Record<string, unknown>;

const loggerStub: LoggerLike = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const createRequest = (body?: JsonRecord): IncomingMessage => {
  const payload = body ? JSON.stringify(body) : '';
  const stream = Readable.from([payload]);
  return Object.assign(stream, {
    method: 'POST',
    url: '/api/agents/test-agent/run',
    headers: { 'content-type': 'application/json' },
  }) as IncomingMessage;
};

const createResponseRecorder = () => {
  let statusCode: number | undefined;
  let responseBody = '';
  const headers: Record<string, string> = {};

  const res = {
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

test('handleAgentRunRequest responds 404 for unknown agent slug', async () => {
  const runner = createAgentRunner({ logger: loggerStub, registry: {} as any });
  const { res, getResult } = createResponseRecorder();

  await runner.handleAgentRunRequest('missing-agent', createRequest(), res, { userId: 'user_123' });

  const result = getResult();
  assert.equal(result.statusCode, 404);
  const payload = JSON.parse(result.body || '{}');
  assert.equal(payload.error, 'Agent "missing-agent" not found');
});

test('handleAgentRunRequest validates required fields', async () => {
  const stubAgent = {
    generate: async () => ({ text: 'noop' }),
  };
  const runner = createAgentRunner({
    logger: loggerStub,
    registry: { testAgent: stubAgent } as any,
  });
  const { res, getResult } = createResponseRecorder();
  const req = createRequest({ inputData: { conversationHistory: 'hi', sessionId: 'abc' } });

  await runner.handleAgentRunRequest('test-agent', req, res, { userId: 'user_123' });

  const result = getResult();
  assert.equal(result.statusCode, 400);
  assert.ok(result.body.includes('Request must include latestCustomerMessage'));
});

test('handleAgentRunRequest returns agent text and structured payloads', async () => {
  const structuredPayload = {
    messageForCustomer: 'Here is your budget.',
    spreadsheet: {
      projectName: 'Test Project',
      createdAt: '2024-01-01T00:00:00.000Z',
      totalBudget: 1000,
      contingencyAmount: 100,
      total: 900,
      lineItems: [
        {
          category: 'Demo',
          description: 'Remove fixtures',
          cost: 900,
        },
      ],
    },
  };

  const stubAgent = {
    generate: async () => ({
      text: `\`\`\`json\n${JSON.stringify(structuredPayload)}\n\`\`\``,
    }),
  };

  const runner = createAgentRunner({
    logger: loggerStub,
    registry: { testAgent: stubAgent } as any,
  });

  const { res, getResult } = createResponseRecorder();
  const req = createRequest({
    inputData: {
      latestCustomerMessage: 'Help me plan a budget',
      conversationHistory: 'Customer wants to renovate',
      sessionId: 'session_1',
    },
  });

  await runner.handleAgentRunRequest('test-agent', req, res, { userId: 'user_123', email: 'user@example.com' });

  const result = getResult();
  assert.equal(result.statusCode, 200);
  const payload = JSON.parse(result.body) as Record<string, unknown>;
  assert.ok(payload.budgetSpreadsheet);
  const spreadsheet = payload.budgetSpreadsheet as Record<string, unknown>;
  assert.equal(spreadsheet.projectName, 'Test Project');
  assert.equal(payload.selectedAgent, 'test-agent');
});

test('handleAgentRunRequest persists plan assets and returns them', async () => {
  const structuredPayload = {
    messageForCustomer: 'Budget ready',
    spreadsheet: {
      projectName: 'Villa Refresh',
      createdAt: '2024-01-01T00:00:00.000Z',
      totalBudget: 25000,
      contingencyAmount: 2500,
      total: 22500,
      lineItems: [
        {
          category: 'Demo',
          description: 'Remove walls',
          cost: 5000,
        },
      ],
    },
  };

  const stubAgent = {
    generate: async () => ({
      text: `\`\`\`json\n${JSON.stringify(structuredPayload)}\n\`\`\``,
    }),
  };

  let recordedInputs: unknown[] | undefined;
  const runner = createAgentRunner({
    logger: loggerStub,
    registry: { testAgent: stubAgent } as any,
    persistPlanAssets: async (inputs) => {
      recordedInputs = inputs;
      return inputs.map((input, index) => ({
        id: `asset_${index}`,
        sessionId: input.sessionId,
        userId: input.userId,
        assetType: input.assetType,
        title: input.title,
        summary: input.summary ?? null,
        data: input.data,
        sourceAgent: input.sourceAgent,
        createdAt: '2024-01-01T00:00:00.000Z',
      }));
    },
  });

  const { res, getResult } = createResponseRecorder();
  const req = createRequest({
    inputData: {
      latestCustomerMessage: 'Plan my budget',
      conversationHistory: 'Customer planning a kitchen',
      sessionId: 'session_budget',
    },
  });

  await runner.handleAgentRunRequest('test-agent', req, res, { userId: 'user_123' });

  const result = getResult();
  assert.equal(result.statusCode, 200);
  const payload = JSON.parse(result.body) as Record<string, unknown>;
  const planAssets = payload.planAssets as Array<Record<string, unknown>>;
  assert.ok(Array.isArray(planAssets));
  assert.equal(planAssets.length, 1);
  assert.equal(planAssets[0].id, 'asset_0');
  assert.equal(planAssets[0].assetType, 'budget');
  assert.equal((recordedInputs?.[0] as Record<string, unknown>).assetType, 'budget');
});

