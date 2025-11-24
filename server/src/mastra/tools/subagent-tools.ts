import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { designInspirationGuideAgent } from '../agents/design-inspiration-guide-agent.js';
import { budgetAgent } from '../agents/budget-agent.js';
import { contractorAgent } from '../agents/contractor-agent.js';
import { timelineAgent } from '../agents/timeline-agent.js';
import { materialsAgent } from '../agents/materials-agent.js';
import {
  buildConversationAwareMessage,
  buildDesignGuideUserMessage,
  loadUploadsForTurn,
} from '../agents/context-helpers.js';
import {
  parseBudgetAgentReply,
  parseContractorAgentReply,
  parseDesignInspirationGuideReply,
  parseMaterialsAgentReply,
  parseTimelineAgentReply,
} from '../agents/structured-parsers.js';
import {
  DesignInspirationGuideAgentReplySchema,
  MaterialsAgentReplySchema,
  TimelineAgentReplySchema,
  ContractorAgentReplySchema,
} from '../agents/shared-schemas.js';
import { BudgetAgentReplySchema } from './create-budget-spreadsheet-tool.js';
import { getAgentRunContext, recordSubAgentArtifact } from './agent-run-context.js';

const LeadAgentToolInputSchema = z.object({
  taskSummary: z
    .string()
    .min(1, 'Provide a concise description of what you need the sub-agent to accomplish.'),
  latestCustomerMessage: z.string().min(1, 'Include the raw customer message for additional context.'),
  conversationHistory: z
    .string()
    .optional()
    .describe('Optional rolling transcript or context summary relevant to this request.'),
  additionalContext: z
    .string()
    .optional()
    .describe('Any constraints, preferences, or decisions already made.'),
  userId: z
    .string()
    .optional()
    .describe(
      'Required if you expect the sub-agent to load customer uploads. Copy the userId provided in your system context.'
    ),
  uploadedImageIds: z
    .array(z.string())
    .optional()
    .describe('IDs of customer uploads that should be forwarded to the sub-agent.'),
  sessionId: z
    .string()
    .optional()
    .describe('Chat session identifier so sub-agents can reason about continuity.'),
});

type LeadAgentToolInput = z.infer<typeof LeadAgentToolInputSchema>;

function normalizeHistory({
  taskSummary,
  additionalContext,
  conversationHistory,
}: Pick<LeadAgentToolInput, 'taskSummary' | 'additionalContext' | 'conversationHistory'>): string | undefined {
  const sections = [
    taskSummary ? `Lead agent summary:\n${taskSummary}` : undefined,
    additionalContext ? `Additional context:\n${additionalContext}` : undefined,
    conversationHistory,
  ].filter(Boolean);

  if (!sections.length) {
    return undefined;
  }

  return sections.join('\n\n');
}

const BudgetToolOutputSchema = z.object({
  summary: z.string(),
  rawText: z.string(),
  structured: BudgetAgentReplySchema.optional(),
});

const ContractorToolOutputSchema = z.object({
  summary: z.string(),
  rawText: z.string(),
  structured: ContractorAgentReplySchema.optional(),
});

const TimelineToolOutputSchema = z.object({
  summary: z.string(),
  rawText: z.string(),
  structured: TimelineAgentReplySchema.optional(),
});

const MaterialsToolOutputSchema = z.object({
  summary: z.string(),
  rawText: z.string(),
  structured: MaterialsAgentReplySchema.optional(),
});

const DesignToolOutputSchema = z.object({
  summary: z.string(),
  rawText: z.string(),
  structured: DesignInspirationGuideAgentReplySchema.optional(),
});

function conversationMessageForAgent(input: LeadAgentToolInput) {
  const history = normalizeHistory(input);
  return buildConversationAwareMessage({
    latestCustomerMessage: input.latestCustomerMessage,
    conversationHistory: history,
  });
}

export const callBudgetSubAgentTool = createTool({
  id: 'call_budget_subagent',
  description:
    'Routes customer context to the Budget Agent so it can return structured renovation budget guidance.',
  inputSchema: LeadAgentToolInputSchema,
  outputSchema: BudgetToolOutputSchema,
  execute: async ({ context }) => {
    const message = conversationMessageForAgent(context);
    const response = await budgetAgent.generate(message);
    const rawText = response.text ?? '';
    const structured = parseBudgetAgentReply(rawText);
    recordSubAgentArtifact('budget', structured);

    const baseResult = {
      summary: structured?.messageForCustomer ?? rawText,
      rawText,
    };

    return structured ? { ...baseResult, structured } : baseResult;
  },
});

export const callContractorSubAgentTool = createTool({
  id: 'call_contractor_subagent',
  description:
    'Routes customer context to the Contractor Agent for sourcing and vetting recommendations.',
  inputSchema: LeadAgentToolInputSchema,
  outputSchema: ContractorToolOutputSchema,
  execute: async ({ context }) => {
    const message = conversationMessageForAgent(context);
    const response = await contractorAgent.generate(message);
    const rawText = response.text ?? '';
    const structured = parseContractorAgentReply(rawText);
    recordSubAgentArtifact('contractor', structured);

    const baseResult = {
      summary: structured?.messageForCustomer ?? rawText,
      rawText,
    };

    return structured ? { ...baseResult, structured } : baseResult;
  },
});

export const callTimelineSubAgentTool = createTool({
  id: 'call_timeline_subagent',
  description: 'Routes context to the Timeline Agent to produce sequenced renovation plans.',
  inputSchema: LeadAgentToolInputSchema,
  outputSchema: TimelineToolOutputSchema,
  execute: async ({ context }) => {
    const message = conversationMessageForAgent(context);
    const response = await timelineAgent.generate(message);
    const rawText = response.text ?? '';
    const structured = parseTimelineAgentReply(rawText);
    recordSubAgentArtifact('timeline', structured);

    const baseResult = {
      summary: structured?.messageForCustomer ?? rawText,
      rawText,
    };

    return structured ? { ...baseResult, structured } : baseResult;
  },
});

export const callMaterialsSubAgentTool = createTool({
  id: 'call_materials_subagent',
  description: 'Routes context to the Materials Agent for sourcing finishes, fixtures, and products.',
  inputSchema: LeadAgentToolInputSchema,
  outputSchema: MaterialsToolOutputSchema,
  execute: async ({ context }) => {
    const message = conversationMessageForAgent(context);
    const response = await materialsAgent.generate(message);
    const rawText = response.text ?? '';
    const structured = parseMaterialsAgentReply(rawText);
    recordSubAgentArtifact('materials', structured);

    const baseResult = {
      summary: structured?.messageForCustomer ?? rawText,
      rawText,
    };

    return structured ? { ...baseResult, structured } : baseResult;
  },
});

export const callDesignInspirationSubAgentTool = createTool({
  id: 'call_design_inspiration_subagent',
  description:
    'Routes context (including uploaded inspiration images) to the Design Inspiration Guide agent.',
  inputSchema: LeadAgentToolInputSchema.extend({
    userId: z
      .string()
      .min(1, 'userId is required when sharing uploads with the design agent.')
      .optional(),
  }),
  outputSchema: DesignToolOutputSchema,
  execute: async ({ context }) => {
    const history = normalizeHistory(context);
    const runContext = getAgentRunContext();
    const uploads = await loadUploadsForTurn(
      context.uploadedImageIds ?? runContext?.uploadedImageIds,
      context.userId ?? runContext?.userId,
      'design inspiration sub-agent tool'
    );
    const message = buildDesignGuideUserMessage({
      latestCustomerMessage: context.latestCustomerMessage,
      conversationHistory: history,
      uploads,
    });

    const response = await designInspirationGuideAgent.generate(message);
    const rawText = response.text ?? '';
    const structured = parseDesignInspirationGuideReply(rawText);
    const normalizedStructured = structured
      ? {
          ...structured,
          designGuide: {
            ...structured.designGuide,
            clarifyingQuestions: structured.designGuide.clarifyingQuestions ?? [],
          },
        }
      : undefined;
    recordSubAgentArtifact('design', normalizedStructured);

    let summary = rawText;
    if (normalizedStructured?.designGuide) {
      const sections: string[] = [];
      sections.push(normalizedStructured.designGuide.longFormGuidance);
      sections.push(
        `Pinterest keywords: ${normalizedStructured.designGuide.condensedKeywords.join(', ')} (search: ${normalizedStructured.designGuide.pinterestSearchQuery})`
      );
      if (normalizedStructured.imageGallery?.summary) {
        sections.push(`Gallery summary: ${normalizedStructured.imageGallery.summary}`);
      }
      summary = sections.filter(Boolean).join('\n\n');
    }

    const baseResult = {
      summary: summary.trim() || rawText,
      rawText,
    };

    return normalizedStructured ? { ...baseResult, structured: normalizedStructured } : baseResult;
  },
});

