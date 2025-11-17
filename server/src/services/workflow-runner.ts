import type { IncomingMessage, ServerResponse } from 'node:http';
import { readJsonBody, sendJson } from '../http/http-utils.js';
import type { AuthenticatedUser } from './auth-service.js';
import type { WorkflowInstance } from './workflow-registry.js';
import type { JsonRecord, LoggerLike } from '../types.js';

export class WorkflowTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowTimeoutError';
  }
}

export type WorkflowRunnerDeps = {
  logger: LoggerLike;
  workflowTimeoutMs: number;
  resolveWorkflowInstance: (workflowId: string) => Promise<WorkflowInstance | undefined>;
};

export function createWorkflowRunner({ logger, workflowTimeoutMs, resolveWorkflowInstance }: WorkflowRunnerDeps) {
  async function executeWorkflowWithTimeout(
    workflow: WorkflowInstance,
    workflowId: string,
    inputData: JsonRecord
  ) {
    const workflowPromise = workflow.start({
      inputData,
    });

    let timeoutId: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new WorkflowTimeoutError(`Workflow "${workflowId}" timed out after ${workflowTimeoutMs}ms`));
      }, workflowTimeoutMs);
    });

    try {
      return await Promise.race([workflowPromise, timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  async function handleWorkflowRunRequest(
    workflowId: string,
    req: IncomingMessage,
    res: ServerResponse,
    authUser: AuthenticatedUser
  ) {
    const workflow = await resolveWorkflowInstance(workflowId);

    if (!workflow || typeof workflow.start !== 'function') {
      sendJson(res, 404, { error: `Workflow "${workflowId}" not found` });
      return;
    }

    const body = await readJsonBody(req, logger);
    const inputData = (body?.inputData ?? body) as JsonRecord | undefined;

    if (!inputData || typeof inputData !== 'object' || Array.isArray(inputData)) {
      logger.warn('Workflow request missing input data', {
        workflowId,
        hasBody: Boolean(body),
        bodyType: body && typeof body,
      });
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
      timeoutMs: workflowTimeoutMs,
      userEmailIncluded: Boolean(authUser.email),
    });

    const startedAt = Date.now();

    try {
      const runResult = await executeWorkflowWithTimeout(workflow, workflowId, workflowInput);

      logger.info('Workflow execution finished', {
        workflowId,
        durationMs: Date.now() - startedAt,
        status: runResult.status,
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
    } catch (error) {
      logger.error('Workflow execution failed', {
        workflowId,
        durationMs: Date.now() - startedAt,
        err: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });

      if (error instanceof WorkflowTimeoutError) {
        sendJson(res, 504, { error: error.message });
        return;
      }

      const message = error instanceof Error ? error.message : 'Workflow execution failed';
      sendJson(res, 500, { error: message });
    }
  }

  return {
    executeWorkflowWithTimeout,
    handleWorkflowRunRequest,
  };
}
