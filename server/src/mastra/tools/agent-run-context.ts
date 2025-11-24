import { AsyncLocalStorage } from 'node:async_hooks';
import type { BudgetAgentReply } from './create-budget-spreadsheet-tool.js';
import type {
  ContractorAgentReply,
  DesignInspirationGuideAgentReply,
  MaterialsAgentReply,
  TimelineAgentReply,
} from '../agents/shared-schemas.js';

export type SubAgentArtifacts = {
  budget?: BudgetAgentReply;
  contractor?: ContractorAgentReply;
  timeline?: TimelineAgentReply;
  materials?: MaterialsAgentReply;
  design?: DesignInspirationGuideAgentReply;
};

export type AgentInlineUpload = {
  id: string;
  signedUrl: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt?: string;
  sessionId?: string;
  storagePath?: string;
};

export type AgentRunContext = {
  sessionId: string;
  userId?: string;
  uploadedImageIds?: string[];
  inlineUploads?: AgentInlineUpload[];
  artifacts: SubAgentArtifacts;
};

const storage = new AsyncLocalStorage<AgentRunContext>();

export function withAgentRunContext<T>(context: AgentRunContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(context, fn);
}

export function getAgentRunContext(): AgentRunContext | undefined {
  return storage.getStore();
}

export function recordSubAgentArtifact<T extends keyof SubAgentArtifacts>(
  key: T,
  artifact: SubAgentArtifacts[T]
): void {
  const ctx = storage.getStore();
  if (!ctx) {
    return;
  }
  ctx.artifacts[key] = artifact ?? undefined;
}

