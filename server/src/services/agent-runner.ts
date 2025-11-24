import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { readJsonBody, sendJson } from '../http/http-utils.js';
import type { JsonRecord, LoggerLike } from '../types.js';
import type { AuthenticatedUser } from './auth-service.js';
import { agents } from '../mastra/agents/index.js';
import { buildConversationAwareMessage } from '../mastra/agents/context-helpers.js';
import {
  withAgentRunContext,
  type AgentInlineUpload,
  type SubAgentArtifacts,
} from '../mastra/tools/agent-run-context.js';
import {
  parseBudgetAgentReply,
  parseContractorAgentReply,
  parseDesignInspirationGuideReply,
  parseMaterialsAgentReply,
  parseTimelineAgentReply,
} from '../mastra/agents/structured-parsers.js';
import type { DesignInspirationGuideAgentReply } from '../mastra/agents/shared-schemas.js';
import {
  savePlanAssets,
  type InsertPlanAssetInput,
  type PlanAssetRecord,
} from './plan-asset-service.js';

const UploadedImageSchema = z.object({
  id: z.string().min(1, 'uploaded image id is required'),
  signedUrl: z.string().min(1, 'uploaded image signedUrl is required'),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().nonnegative().optional(),
  createdAt: z.string().optional(),
  sessionId: z.string().optional(),
  storagePath: z.string().optional(),
});

const AgentRunInputSchema = z.object({
  latestCustomerMessage: z.string().min(1, 'latestCustomerMessage is required'),
  conversationHistory: z.string().optional(),
  sessionId: z.string().min(1, 'sessionId is required'),
  uploadedImageIds: z.array(z.string()).optional(),
  uploadedImages: z.array(UploadedImageSchema).optional(),
});

type AgentRunInput = z.infer<typeof AgentRunInputSchema>;

type AgentRunnerDeps = {
  logger: LoggerLike;
  registry?: AgentRegistry;
  persistPlanAssets?: typeof savePlanAssets;
};

type AgentRegistry = typeof agents;
type AgentLike = AgentRegistry[keyof AgentRegistry];

function slugify(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

function buildAgentRegistry(source: AgentRegistry): Record<string, AgentLike> {
  return Object.entries(source).reduce(
    (acc, [key, agent]) => {
      acc[slugify(key)] = agent;
      return acc;
    },
    {} as Record<string, AgentLike>
  );
}

function buildSystemContext({
  sessionId,
  userId,
  userEmail,
  uploadedImageIds,
}: {
  sessionId: string;
  userId: string;
  userEmail?: string;
  uploadedImageIds?: string[];
}): string {
  const lines = [
    `Session ID: ${sessionId}`,
    `User ID: ${userId}`,
    userEmail ? `User email: ${userEmail}` : undefined,
    `Uploaded image IDs (share when calling tools that need them): ${JSON.stringify(uploadedImageIds ?? [])}`,
  ].filter(Boolean);

  lines.push(
    'IMPORTANT: Always include sessionId, userId, and any uploadedImageIds in your sub-agent tool calls so they have the right context.'
  );

  return lines.join('\n');
}

function normalizeInlineUploads(
  uploads: z.infer<typeof UploadedImageSchema>[] | undefined
): AgentInlineUpload[] {
  if (!uploads?.length) {
    return [];
  }

  const normalized: AgentInlineUpload[] = [];

  for (const upload of uploads) {
    const id = upload.id.trim();
    const signedUrl = upload.signedUrl.trim();
    if (!id || !signedUrl) {
      continue;
    }

    normalized.push({
      id,
      signedUrl,
      fileName: upload.fileName ?? undefined,
      mimeType: upload.mimeType ?? undefined,
      sizeBytes: typeof upload.sizeBytes === 'number' ? upload.sizeBytes : undefined,
      createdAt: upload.createdAt ?? undefined,
      sessionId: upload.sessionId ?? undefined,
      storagePath: upload.storagePath ?? undefined,
    });
  }

  return normalized;
}

function normalizeConversationHistory(input: AgentRunInput, userContextBlock: string): string | undefined {
  const segments = [userContextBlock, input.conversationHistory].filter(Boolean);
  return segments.length ? segments.join('\n\n') : undefined;
}

function normalizeDesignArtifact(
  design: ReturnType<typeof parseDesignInspirationGuideReply>
): DesignInspirationGuideAgentReply | undefined {
  if (!design) {
    return undefined;
  }
  return {
    ...design,
    designGuide: {
      ...design.designGuide,
      clarifyingQuestions: design.designGuide.clarifyingQuestions ?? [],
    },
  };
}

function parseStructuredArtifactsFromFinalResponse(finalResponse: string): SubAgentArtifacts {
  const artifacts: SubAgentArtifacts = {};

  const budget = parseBudgetAgentReply(finalResponse);
  if (budget) {
    artifacts.budget = budget;
  }

  const contractor = parseContractorAgentReply(finalResponse);
  if (contractor) {
    artifacts.contractor = contractor;
  }

  const timeline = parseTimelineAgentReply(finalResponse);
  if (timeline) {
    artifacts.timeline = timeline;
  }

  const materials = parseMaterialsAgentReply(finalResponse);
  if (materials) {
    artifacts.materials = materials;
  }

  const design = normalizeDesignArtifact(parseDesignInspirationGuideReply(finalResponse));
  if (design) {
    artifacts.design = design;
  }

  return artifacts;
}

type BuildPlanAssetsInput = {
  sessionId: string;
  userId: string;
  artifacts: SubAgentArtifacts;
};

function buildPlanAssetInputs({ sessionId, userId, artifacts }: BuildPlanAssetsInput): InsertPlanAssetInput[] {
  const assets: InsertPlanAssetInput[] = [];

  const pushAsset = (asset: Omit<InsertPlanAssetInput, 'sessionId' | 'userId'>) => {
    assets.push({
      sessionId,
      userId,
      ...asset,
    });
  };

  const budgetSheet = artifacts.budget?.spreadsheet;
  if (budgetSheet) {
    pushAsset({
      assetType: 'budget',
      title: budgetSheet.projectName || 'Renovation budget',
      summary: safeSummary(artifacts.budget?.messageForCustomer),
      data: budgetSheet as JsonRecord,
      sourceAgent: 'budget-agent',
    });
  }

  const contractorSheet = artifacts.contractor?.spreadsheet;
  if (contractorSheet) {
    pushAsset({
      assetType: 'contractor',
      title: contractorSheet.projectName || 'Contractor sourcing list',
      summary: safeSummary(artifacts.contractor?.messageForCustomer),
      data: contractorSheet as JsonRecord,
      sourceAgent: 'contractor-agent',
    });
  }

  const materialsSheet = artifacts.materials?.spreadsheet;
  if (materialsSheet) {
    pushAsset({
      assetType: 'materials',
      title: materialsSheet.projectName || 'Materials plan',
      summary: safeSummary(artifacts.materials?.messageForCustomer),
      data: materialsSheet as JsonRecord,
      sourceAgent: 'materials-agent',
    });
  }

  const ganttChart = artifacts.timeline?.ganttChart;
  if (ganttChart && ganttChart.tasks.length > 0) {
    pushAsset({
      assetType: 'timeline',
      title: ganttChart.projectName || 'Project timeline',
      summary: safeSummary(artifacts.timeline?.messageForCustomer),
      data: ganttChart as JsonRecord,
      sourceAgent: 'timeline-agent',
    });
  }

  const imageGallery = artifacts.design?.imageGallery;
  if (imageGallery) {
    pushAsset({
      assetType: 'image-gallery',
      title: imageGallery.query || 'Inspiration gallery',
      summary: safeSummary(imageGallery.summary),
      data: imageGallery as JsonRecord,
      sourceAgent: 'design-inspiration-guide-agent',
    });
  }

  return assets;
}

function safeSummary(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export function createAgentRunner({
  logger,
  registry = agents,
  persistPlanAssets = savePlanAssets,
}: AgentRunnerDeps) {
  const agentRegistryBySlug = buildAgentRegistry(registry);

  async function handleAgentRunRequest(
    slug: string,
    req: IncomingMessage,
    res: ServerResponse,
    authUser: AuthenticatedUser
  ) {
    const agent = agentRegistryBySlug[slug];
    if (!agent) {
      sendJson(res, 404, { error: `Agent "${slug}" not found` });
      return;
    }

    let input: AgentRunInput;
    try {
      const body = await readJsonBody(req, logger);
      const candidate = (body?.inputData ?? body) as Record<string, unknown>;
      input = AgentRunInputSchema.parse(candidate);
    } catch (error) {
      logger.warn('Invalid agent run payload', {
        agentSlug: slug,
        err: error instanceof Error ? { message: error.message } : error,
      });
      sendJson(res, 400, { error: 'Request must include latestCustomerMessage and sessionId.' });
      return;
    }

    const uploadIds =
      input.uploadedImageIds?.filter((id) => typeof id === 'string' && id.trim().length > 0) ?? [];
    const inlineUploads = normalizeInlineUploads(input.uploadedImages);

    const metadataBlock = buildSystemContext({
      sessionId: input.sessionId,
      userId: authUser.userId,
      userEmail: authUser.email,
      uploadedImageIds: uploadIds,
    });

    const conversationHistory = normalizeConversationHistory(input, metadataBlock);
    const agentMessage = buildConversationAwareMessage({
      latestCustomerMessage: input.latestCustomerMessage,
      conversationHistory,
    });

    const runContext = {
      sessionId: input.sessionId,
      userId: authUser.userId,
      uploadedImageIds: uploadIds,
      inlineUploads,
      artifacts: {} as SubAgentArtifacts,
    };

    const startedAt = Date.now();

    try {
      const response = await withAgentRunContext(runContext, () => agent.generate(agentMessage));
      const finalResponse = (response.text ?? '').trim();

      if (!finalResponse) {
        sendJson(res, 500, { error: 'Agent did not return a response.' });
        return;
      }

      // Fall back to parsing the final response if the sub-agent tools did not capture artifacts.
      const mergedArtifacts =
        Object.keys(runContext.artifacts).length > 0
          ? runContext.artifacts
          : parseStructuredArtifactsFromFinalResponse(finalResponse);

      const planAssetInputs = buildPlanAssetInputs({
        sessionId: input.sessionId,
        userId: authUser.userId,
        artifacts: mergedArtifacts,
      });

      let persistedPlanAssets: PlanAssetRecord[] = [];
      if (planAssetInputs.length) {
        try {
          persistedPlanAssets = await persistPlanAssets(planAssetInputs);
        } catch (persistError) {
          logger.warn('Failed to persist plan assets', {
            agentSlug: slug,
            err: persistError instanceof Error ? { message: persistError.message } : persistError,
          });
        }
      }

      const payload = {
        finalResponse,
        selectedAgent: slug,
        budgetSpreadsheet: mergedArtifacts.budget?.spreadsheet ?? undefined,
        contractorSpreadsheet: mergedArtifacts.contractor?.spreadsheet ?? undefined,
        materialsSpreadsheet: mergedArtifacts.materials?.spreadsheet ?? undefined,
        ganttChart: mergedArtifacts.timeline?.ganttChart ?? undefined,
        imageGallery: mergedArtifacts.design?.imageGallery ?? undefined,
        designGuide: mergedArtifacts.design?.designGuide ?? undefined,
        planAssets: persistedPlanAssets,
      };

      logger.info('Agent run finished', {
        agentSlug: slug,
        durationMs: Date.now() - startedAt,
        uploadedImageCount: uploadIds.length,
      });

      sendJson(res, 200, {
        agentId: slug,
        status: 'completed',
        ...payload,
      });
    } catch (error) {
      logger.error('Agent run failed', {
        agentSlug: slug,
        durationMs: Date.now() - startedAt,
        err: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });
      sendJson(res, 500, { error: 'Agent run failed. Please try again.' });
    }
  }

  return {
    handleAgentRunRequest,
  };
}

