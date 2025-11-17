import { mastra } from '../mastra/index.js';
import { workflows } from '../mastra/workflows/index.js';
import type { JsonRecord } from '../types.js';

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
    return undefined;
  }

  const candidate =
    workflowRegistryById[workflowId] ??
    workflowRegistryByName[workflowId] ??
    (typeof mastra.getWorkflowById === 'function' ? mastra.getWorkflowById(workflowId) : undefined);

  if (!candidate) {
    return undefined;
  }

  if (
    typeof candidate === 'object' &&
    candidate !== null &&
    'then' in candidate &&
    typeof (candidate as { then?: unknown }).then === 'function'
  ) {
    return (await candidate) as WorkflowInstance;
  }

  return candidate as WorkflowInstance;
}
