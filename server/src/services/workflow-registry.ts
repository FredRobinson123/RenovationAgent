import { mastra } from '../mastra/index.js';
import { workflows } from '../mastra/workflows/index.js';
import type { JsonRecord } from '../types.js';
import { logger } from '../utils/pino-logger.js';

export type WorkflowInstance = {
  id?: string;
  start: (args: { inputData: JsonRecord }) => Promise<{
    status: string;
    result: unknown;
    steps?: Record<string, unknown>;
    resumeLabels?: Record<string, unknown>;
  }>;
};

const workflowRegistryByName = workflows as unknown as Record<string, WorkflowInstance>;

const workflowRegistryById: Record<string, WorkflowInstance> = Object.values(workflowRegistryByName).reduce(
  (acc, workflow) => {
    if (workflow && typeof workflow.id === 'string') {
      acc[workflow.id] = workflow;
    }
    return acc;
  },
  {} as Record<string, WorkflowInstance>
);

export const workflowRegistry = {
  byId: workflowRegistryById,
  byName: workflowRegistryByName,
};

export function listWorkflowIds(): string[] {
  return Object.keys(workflowRegistryById);
}

export function listWorkflowKeys(): string[] {
  return Object.keys(workflowRegistryByName);
}

export async function resolveWorkflowInstance(workflowId: string): Promise<WorkflowInstance | undefined> {
  if (!workflowId) {
    logger.warn('resolveWorkflowInstance called without workflowId');
    return undefined;
  }

  const startedAt = Date.now();
  logger.debug('Resolving workflow instance', {
    workflowId,
  });

  let candidateSource: 'byId' | 'byName' | 'mastra' | 'unknown' = 'unknown';

  let candidate: WorkflowInstance | Promise<WorkflowInstance> | undefined =
    workflowRegistryById[workflowId] ?? workflowRegistryByName[workflowId];

  if (candidate) {
    candidateSource = candidate === workflowRegistryById[workflowId] ? 'byId' : 'byName';
  } else if (typeof mastra.getWorkflowById === 'function') {
    try {
      const mastraWorkflow = mastra.getWorkflowById(workflowId) as unknown;
      candidate = mastraWorkflow as WorkflowInstance | Promise<WorkflowInstance>;
      candidateSource = 'mastra';
    } catch (error) {
      logger.error('mastra.getWorkflowById threw an error', {
        workflowId,
        err: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });
      throw error;
    }
  }

  if (!candidate) {
    logger.warn('Workflow instance not found in registry', {
      workflowId,
    });
    return undefined;
  }

  const isPromiseLike =
    typeof candidate === 'object' &&
    candidate !== null &&
    'then' in candidate &&
    typeof (candidate as { then?: unknown }).then === 'function';

  let resolvedCandidate: WorkflowInstance;
  if (isPromiseLike) {
    logger.debug('Awaiting async workflow instance', {
      workflowId,
      source: candidateSource,
    });
    try {
      resolvedCandidate = await candidate;
    } catch (error) {
      logger.error('Failed to resolve async workflow instance', {
        workflowId,
        source: candidateSource,
        err: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });
      throw error;
    }
  } else {
    resolvedCandidate = candidate as WorkflowInstance;
  }

  logger.debug('Workflow instance resolution finished', {
    workflowId,
    source: candidateSource,
    durationMs: Date.now() - startedAt,
    hasStartFn: typeof resolvedCandidate?.start === 'function',
    exportedWorkflowId: resolvedCandidate?.id,
  });

  return resolvedCandidate;
}
