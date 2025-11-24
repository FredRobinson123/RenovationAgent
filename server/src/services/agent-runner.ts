import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { readJsonBody, sendJson } from '../http/http-utils.js';
import type { LoggerLike } from '../types.js';
import type { AuthenticatedUser } from './auth-service.js';
import { agents } from '../mastra/agents/index.js';
import { buildConversationAwareMessage } from '../mastra/agents/context-helpers.js';
import { withAgentRunContext, type SubAgentArtifacts } from '../mastra/tools/agent-run-context.js';
import {
  parseBudgetAgentReply,
  parseContractorAgentReply,
  parseDesignInspirationGuideReply,
  parseMaterialsAgentReply,
  parseTimelineAgentReply,
} from '../mastra/agents/structured-parsers.js';
import type { DesignInspirationGuideAgentReply } from '../mastra/agents/shared-schemas.js';

const AgentRunInputSchema = z.object({
  latestCustomerMessage: z.string().min(1, 'latestCustomerMessage is required'),
  conversationHistory: z.string().optional(),
  sessionId: z.string().min(1, 'sessionId is required'),
  uploadedImageIds: z.array(z.string()).optional(),
});

type AgentRunInput = z.infer<typeof AgentRunInputSchema>;

type AgentRunnerDeps = {
  logger: LoggerLike;
  registry?: AgentRegistry;
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

export function createAgentRunner({ logger, registry = agents }: AgentRunnerDeps) {
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

      const payload = {
        finalResponse,
        selectedAgent: slug,
        budgetSpreadsheet: mergedArtifacts.budget?.spreadsheet ?? undefined,
        contractorSpreadsheet: mergedArtifacts.contractor?.spreadsheet ?? undefined,
        materialsSpreadsheet: mergedArtifacts.materials?.spreadsheet ?? undefined,
        ganttChart: mergedArtifacts.timeline?.ganttChart ?? undefined,
        imageGallery: mergedArtifacts.design?.imageGallery ?? undefined,
        designGuide: mergedArtifacts.design?.designGuide ?? undefined,
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

