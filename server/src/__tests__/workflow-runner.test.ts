import test from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createWorkflowRunner } from '../services/workflow-runner.js';
import type { WorkflowInstance } from '../services/workflow-registry.js';
import type { JsonRecord, LoggerLike } from '../types.js';

const createLoggerStub = (): LoggerLike => {
  const log = (_message: string, _metadata?: Record<string, unknown>) => undefined;
  return {
    debug: log,
    info: log,
    warn: log,
    error: log,
  };
};

const createJsonRequest = (body: unknown): IncomingMessage => ({
  method: 'POST',
  url: '/api/workflows/foo/run',
  headers: {},
  async *[Symbol.asyncIterator]() {
    yield JSON.stringify(body);
  },
}) as unknown as IncomingMessage;

const createMockResponse = () => {
  const record: { statusCode?: number; body?: JsonRecord } = {};
  const res = {
    setHeader: () => undefined,
    writeHead: (statusCode: number) => {
      record.statusCode = statusCode;
      return res;
    },
    end: (chunk?: string | Uint8Array) => {
      if (chunk) {
        const serialized = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
        record.body = JSON.parse(serialized) as JsonRecord;
      }
      return res;
    },
  } as unknown as ServerResponse;

  return { res, record };
};

test('handleWorkflowRunRequest responds 404 when workflow is missing', async () => {
  const logger = createLoggerStub();
  const runner = createWorkflowRunner({
    logger,
    workflowTimeoutMs: 10,
    resolveWorkflowInstance: async () => undefined,
  });

  const { res, record } = createMockResponse();
  await runner.handleWorkflowRunRequest('missing', createJsonRequest({ inputData: {} }), res, { userId: 'user_1' });

  assert.strictEqual(record.statusCode, 404);
  assert.deepStrictEqual(record.body, { error: 'Workflow "missing" not found' });
});

test('handleWorkflowRunRequest executes workflow and returns metadata', async () => {
  const logger = createLoggerStub();
  let receivedInput: JsonRecord | undefined;
  const workflow: WorkflowInstance = {
    start: async ({ inputData }) => {
      receivedInput = inputData;
      return {
        status: 'success',
        result: { ok: true },
        steps: { first: true },
        resumeLabels: { checkpoint: 'one' },
      };
    },
  };
  const runner = createWorkflowRunner({
    logger,
    workflowTimeoutMs: 100,
    resolveWorkflowInstance: async () => workflow,
  });

  const { res, record } = createMockResponse();
  await runner.handleWorkflowRunRequest(
    'workflow-1',
    createJsonRequest({ inputData: { foo: 'bar' } }),
    res,
    { userId: 'user_2', email: 'user@example.com' }
  );

  assert.strictEqual(record.statusCode, 200);
  assert.strictEqual(record.body?.status, 'success');
  assert.deepStrictEqual(record.body?.metadata, {
    steps: ['first'],
    resumeLabels: { checkpoint: 'one' },
  });
  assert.ok(receivedInput);
  assert.strictEqual(receivedInput?.userId, 'user_2');
  assert.strictEqual(receivedInput?.userEmail, 'user@example.com');
});

test('handleWorkflowRunRequest responds 504 when workflow times out', async () => {
  const logger = createLoggerStub();
  const workflow: WorkflowInstance = {
    start: () => new Promise(() => undefined),
  };
  const runner = createWorkflowRunner({
    logger,
    workflowTimeoutMs: 5,
    resolveWorkflowInstance: async () => workflow,
  });

  const { res, record } = createMockResponse();
  await runner.handleWorkflowRunRequest(
    'workflow-timeout',
    createJsonRequest({ inputData: { foo: 'bar' } }),
    res,
    { userId: 'user_3' }
  );

  assert.strictEqual(record.statusCode, 504);
  const errorMessage = typeof record.body?.error === 'string' ? record.body.error : '';
  assert.match(errorMessage, /timed out/);
});
