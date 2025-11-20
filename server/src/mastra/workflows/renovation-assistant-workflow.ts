import { createStep, createWorkflow } from '@mastra/core';
import { generateText } from 'ai';
import { geminiFasttModel } from '../llms/index.js';
import { BudgetAgentReplySchema, BudgetSpreadsheetSchema, type BudgetAgentReply } from '../tools/create-budget-spreadsheet-tool.js';
import { ContractorSpreadsheetSchema } from '../tools/contractor-spreadsheet-tool.js';
import { MaterialsSpreadsheetSchema } from '../tools/materials-spreadsheet-tool.js';
import { GanttChartSchema } from '../tools/gantt-chart-tool.js';
import { z } from 'zod';
import { blockedRequestReply, renovationOrchestrationPrompt } from './prompts.js';
import { designInspirationGuideAgent } from '../agents/design-inspiration-guide-agent.js';
import { budgetAgent } from '../agents/budget-agent.js';
import { contractorAgent } from '../agents/contractor-agent.js';
import { timelineAgent } from '../agents/timeline-agent.js';
import { materialsAgent } from '../agents/materials-agent.js';
import { getUploadsWithSignedUrls, type ChatImageUploadWithUrl } from '../../services/chat-upload-service.js';
import type { MessageListInput } from '@mastra/core/agent/message-list';


export const OrchestrationStepInputSchema = z.object({
  latestCustomerMessage: z.string().describe('The latest message from the customer'),
  conversationHistory: z.string().optional().describe('Optional prior conversation context'),
  sessionId: z.string().min(1).describe('Stable identifier for the chat session'),
  uploadedImageIds: z.array(z.string()).optional().describe('IDs of customer image uploads for this turn'),
  userId: z.string().optional().describe('Clerk user ID for the customer'),
  userEmail: z.string().optional().describe('Email address from Clerk, when available'),
});


const agentIdList = [
  'budget-agent',
  'design-inspiration-guide-agent',
  'contractor-agent',
  'timeline-agent',
  'materials-agent',
] as const;

export const OrchestrationStepOutputSchema = z.object({
  conversationStage: z.enum(['START', 'CONTINUE', 'END']).describe('The determined conversation stage'),
  suitableAgent: z.enum(agentIdList).describe('The suitable agent to handle the reply'),
  latestCustomerMessage: z.string().describe('The latest message from the customer'),
  conversationHistory: z.string().optional().describe('Optional prior conversation context'),
  sessionId: z.string().describe('Stable identifier for the chat session'),
  uploadedImageIds: z.array(z.string()).optional().describe('IDs of customer image uploads for this turn'),
  userId: z.string().optional().describe('Clerk user ID for the customer'),
  userEmail: z.string().optional().describe('Email address from Clerk, when available'),
});


export type OrchestrationStepInput = z.infer<typeof OrchestrationStepInputSchema>;
export type OrchestrationStepOutput = z.infer<typeof OrchestrationStepOutputSchema>;

const SUPPORTED_AGENT_IDS: OrchestrationStepOutput['suitableAgent'][] = [...agentIdList];

function isSupportedAgentId(value: string): value is OrchestrationStepOutput['suitableAgent'] {
  return (SUPPORTED_AGENT_IDS as string[]).includes(value);
}


/**
 * Replaces placeholders in a prompt template with actual values
 * @param template - The prompt template with placeholders
 * @param replacements - Object with keys matching placeholder names and values to replace them
 * @returns The filled template with all placeholders replaced
 */
export function replacePlaceholders(
  template: string,
  replacements: Record<string, string>
): string {
  let result = template;


  Object.entries(replacements).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value || '');
  });


  return result;
}


const orchestrationStep = createStep({
  id: 'orchestrate-renovation-conversation',
  description: 'Determines the conversation stage and suitable agent for renovation workflow.',
  inputSchema: OrchestrationStepInputSchema,
  outputSchema: OrchestrationStepOutputSchema,
  execute: async ({ inputData }) => {
    const { latestCustomerMessage, conversationHistory, uploadedImageIds, sessionId, userId, userEmail } = inputData;
    const prompt = renovationOrchestrationPrompt;



    const filledPrompt = replacePlaceholders(prompt, {
      latest_customer_message: latestCustomerMessage,
      conversation_history: conversationHistory || '',
      uploaded_image_count: String(uploadedImageIds?.length ?? 0),
    }); 


    try {
      const { text } = await generateText({
        model: geminiFasttModel,
        prompt: filledPrompt,
      });


      const conversationStageMatch = text.match(/<conversation_stage>([\s\S]*?)<\/conversation_stage>/);
      const conversationStage = conversationStageMatch ? conversationStageMatch[1].trim() : '';


      const agentMatch = text.match(/<agent>([\s\S]*?)<\/agent>/);
      const rawAgent = agentMatch ? agentMatch[1].trim() : '';
      const suitableAgent = isSupportedAgentId(rawAgent) ? rawAgent : 'design-inspiration-guide-agent';


    return {
        conversationStage: conversationStage as 'START' | 'CONTINUE' | 'END',
        suitableAgent,
        latestCustomerMessage,
        conversationHistory,
        sessionId,
        uploadedImageIds,
        userId,
        userEmail,
    };
    } catch (error) {
      console.error('Error generating answer:', error);
      throw new Error('Failed to generate answer');
    }
  },
});


const BudgetAgentStepOutputSchema = z.object({
  text: z.string(),
  structured: BudgetAgentReplySchema.optional(),
  selectedAgent: z.literal('budget-agent'),
});

const ContractorAgentReplySchema = z.object({
  messageForCustomer: z.string().min(1, 'messageForCustomer must include the narrative response'),
  spreadsheet: ContractorSpreadsheetSchema.optional().nullable(),
});
type ContractorAgentReply = z.infer<typeof ContractorAgentReplySchema>;

const TimelineAgentReplySchema = z.object({
  messageForCustomer: z.string().min(1, 'messageForCustomer must include the narrative response'),
  ganttChart: GanttChartSchema.optional().nullable(),
});
type TimelineAgentReply = z.infer<typeof TimelineAgentReplySchema>;

const MaterialsAgentReplySchema = z.object({
  messageForCustomer: z.string().min(1, 'messageForCustomer must include the narrative response'),
  spreadsheet: MaterialsSpreadsheetSchema.optional().nullable(),
});
type MaterialsAgentReply = z.infer<typeof MaterialsAgentReplySchema>;

const DesignGuideSchema = z.object({
  condensedKeywords: z.array(z.string()).max(6),
  pinterestSearchQuery: z.string(),
  styleLabel: z.string(),
  longFormGuidance: z.string(),
  clarifyingQuestions: z.array(z.string()).default([]),
});
type DesignGuide = z.infer<typeof DesignGuideSchema>;

const DesignGalleryImageSchema = z.object({
  id: z.string(),
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  imageUrl: z.string(),
  sourceUrl: z.string(),
});

const DesignImageGallerySchema = z.object({
  query: z.string(),
  summary: z.string().optional().nullable(),
  images: z.array(DesignGalleryImageSchema),
  variant: z.literal('customer').or(z.literal('search')).optional(),
});
type DesignImageGallery = z.infer<typeof DesignImageGallerySchema>;

const DesignInspirationGuideAgentReplySchema = z.object({
  designGuide: DesignGuideSchema,
  imageGallery: DesignImageGallerySchema.nullable(),
});
type DesignInspirationGuideAgentReply = z.infer<typeof DesignInspirationGuideAgentReplySchema>;


const budgetAgentStep = createStep({
  id: 'invoke-budget-agent',
  description: 'Invokes the budget agent for renovation workflow.',
  inputSchema: OrchestrationStepOutputSchema,
  outputSchema: BudgetAgentStepOutputSchema,
  execute: async ({ inputData }) => {
    const { latestCustomerMessage, conversationHistory } = inputData;
    // Build the message for the agent
    let message = latestCustomerMessage;


    // Add conversation history if available
    if (conversationHistory) {
      message = `Previous conversation context: ${conversationHistory}\n\nUser message: ${latestCustomerMessage}`;
    }


    // Generate response using the budgetAgent
    const response = await budgetAgent.generate(message);

    if ((response as any).tripwire) {
      // Guardrail processors blocked this request – return a safe, templated reply.
      // We log to stderr to avoid leaking user content but keep an audit trail.
      console.warn('Budget agent request blocked by input processors', {
        tripwireReason: (response as any).tripwireReason,
      });

      return {
        text: blockedRequestReply,
        structured: undefined,
        selectedAgent: 'budget-agent' as const,
      };
    }

    const rawText = response.text || '';
    const structured = tryParseBudgetAgentReply(rawText);
    const normalizedText = structured ? JSON.stringify(structured, null, 2) : rawText;

    return {
      text: normalizedText,
      structured,
      selectedAgent: 'budget-agent' as const,
    };
  },
});

const contractorAgentStepOutputSchema = z.object({
  text: z.string(),
  structured: ContractorAgentReplySchema.optional(),
  contractorSpreadsheet: ContractorSpreadsheetSchema.optional(),
  selectedAgent: z.literal('contractor-agent'),
});

const contractorAgentStep = createStep({
  id: 'invoke-contractor-agent',
  description: 'Invokes the contractor sourcing agent for renovation workflow.',
  inputSchema: OrchestrationStepOutputSchema,
  outputSchema: contractorAgentStepOutputSchema,
  execute: async ({ inputData }) => {
    const { latestCustomerMessage, conversationHistory } = inputData;
    let message = latestCustomerMessage;

    if (conversationHistory) {
      message = `Previous conversation context: ${conversationHistory}\n\nUser message: ${latestCustomerMessage}`;
    }

    const response = await contractorAgent.generate(message);

    if ((response as any).tripwire) {
      console.warn('Contractor agent request blocked by input processors', {
        tripwireReason: (response as any).tripwireReason,
      });

      return {
        text: blockedRequestReply,
        structured: undefined,
        contractorSpreadsheet: undefined,
        selectedAgent: 'contractor-agent' as const,
      };
    }

    const rawText = response.text || '';
    const structured = tryParseContractorAgentReply(rawText);
    const normalizedText = structured ? JSON.stringify(structured, null, 2) : rawText;

    return {
      text: normalizedText,
      structured,
      contractorSpreadsheet: structured?.spreadsheet ?? undefined,
      selectedAgent: 'contractor-agent' as const,
    };
  },
});

const timelineAgentStepOutputSchema = z.object({
  text: z.string(),
  structured: TimelineAgentReplySchema.optional(),
  ganttChart: GanttChartSchema.optional(),
  selectedAgent: z.literal('timeline-agent'),
});

const timelineAgentStep = createStep({
  id: 'invoke-timeline-agent',
  description: 'Invokes the timeline and project planner agent.',
  inputSchema: OrchestrationStepOutputSchema,
  outputSchema: timelineAgentStepOutputSchema,
  execute: async ({ inputData }) => {
    const { latestCustomerMessage, conversationHistory } = inputData;
    let message = latestCustomerMessage;

    if (conversationHistory) {
      message = `Previous conversation context: ${conversationHistory}\n\nUser message: ${latestCustomerMessage}`;
    }

    const response = await timelineAgent.generate(message);

    if ((response as any).tripwire) {
      console.warn('Timeline agent request blocked by input processors', {
        tripwireReason: (response as any).tripwireReason,
      });

      return {
        text: blockedRequestReply,
        structured: undefined,
        ganttChart: undefined,
        selectedAgent: 'timeline-agent' as const,
      };
    }

    const rawText = response.text || '';
    const structured = tryParseTimelineAgentReply(rawText);
    const normalizedText = structured ? JSON.stringify(structured, null, 2) : rawText;

    return {
      text: normalizedText,
      structured,
      ganttChart: structured?.ganttChart ?? undefined,
      selectedAgent: 'timeline-agent' as const,
    };
  },
});

const materialsAgentStepOutputSchema = z.object({
  text: z.string(),
  structured: MaterialsAgentReplySchema.optional(),
  materialsSpreadsheet: MaterialsSpreadsheetSchema.optional(),
  selectedAgent: z.literal('materials-agent'),
});

const materialsAgentStep = createStep({
  id: 'invoke-materials-agent',
  description: 'Invokes the materials sourcing agent for renovation workflow.',
  inputSchema: OrchestrationStepOutputSchema,
  outputSchema: materialsAgentStepOutputSchema,
  execute: async ({ inputData }) => {
    const { latestCustomerMessage, conversationHistory } = inputData;
    let message = latestCustomerMessage;

    if (conversationHistory) {
      message = `Previous conversation context: ${conversationHistory}\n\nUser message: ${latestCustomerMessage}`;
    }

    const response = await materialsAgent.generate(message);

    if ((response as any).tripwire) {
      console.warn('Materials agent request blocked by input processors', {
        tripwireReason: (response as any).tripwireReason,
      });

      return {
        text: blockedRequestReply,
        structured: undefined,
        materialsSpreadsheet: undefined,
        selectedAgent: 'materials-agent' as const,
      };
    }

    const rawText = response.text || '';
    const structured = tryParseMaterialsAgentReply(rawText);
    const normalizedText = structured ? JSON.stringify(structured, null, 2) : rawText;

    return {
      text: normalizedText,
      structured,
      materialsSpreadsheet: structured?.spreadsheet ?? undefined,
      selectedAgent: 'materials-agent' as const,
    };
  },
});


const designInspirationGuideAgentStepOutputSchema = z.object({
  text: z.string(),
  designGuide: DesignGuideSchema.optional(),
  imageGallery: DesignImageGallerySchema.optional().nullable(),
  selectedAgent: z.literal('design-inspiration-guide-agent'),
});

const designInspirationGuideAgentStep = createStep({
  id: 'invoke-design-inspiration-guide-agent',
  description: 'Invokes the design inspiration guide agent for renovation workflow.',
  inputSchema: OrchestrationStepOutputSchema,
  outputSchema: designInspirationGuideAgentStepOutputSchema,
  execute: async ({ inputData }) => {
    const {
      latestCustomerMessage,
      conversationHistory,
      uploadedImageIds,
      userId,
    } = inputData;

    let uploads: ChatImageUploadWithUrl[] = [];
    if (uploadedImageIds?.length && userId) {
      try {
        uploads = await getUploadsWithSignedUrls(uploadedImageIds, userId);
      } catch (error) {
        console.warn('Failed to load uploads for design inspiration guide agent', error);
      }
    }

    const agentMessage = buildDesignGuideUserMessage({
      latestCustomerMessage,
      conversationHistory,
      uploads,
    });

    const response = await designInspirationGuideAgent.generate(agentMessage);

    if ((response as any).tripwire) {
      console.warn('Design inspiration guide agent request blocked by input processors', {
        tripwireReason: (response as any).tripwireReason,
      });

      return {
        text: blockedRequestReply,
        designGuide: undefined,
        imageGallery: undefined,
        selectedAgent: 'design-inspiration-guide-agent' as const,
      };
    }

    const rawText = response.text || '';
    const structured = tryParseDesignInspirationGuideReply(rawText);
    const normalizedText = structured ? JSON.stringify(structured, null, 2) : rawText;

    return {
      text: normalizedText,
      designGuide: structured?.designGuide,
      imageGallery: structured?.imageGallery ?? undefined,
      selectedAgent: 'design-inspiration-guide-agent' as const,
    };
  },
});

export const renovationWorkflow = createWorkflow({
  id: 'renovation-workflow',
  description:
    'A workflow to manage renovation conversations using design inspiration, budget, contractor, timeline, and materials agents.',
  inputSchema: OrchestrationStepInputSchema,
  outputSchema: z.object({
    finalResponse: z.string().describe('The final response from the selected agent'),
    budgetSpreadsheet: BudgetSpreadsheetSchema.optional().describe('Structured budget data, when provided by the budget agent'),
    contractorSpreadsheet: ContractorSpreadsheetSchema.optional().describe('Structured contractor shortlist data, when provided by the contractor agent'),
    materialsSpreadsheet: MaterialsSpreadsheetSchema.optional().describe('Structured materials sourcing data, when provided by the materials agent'),
    ganttChart: GanttChartSchema.optional().describe('Weeks-based project plan, when provided by the timeline agent'),
    imageGallery: z.unknown().optional().describe('Design or customer image gallery payloads'),
    designGuide: DesignGuideSchema.optional().describe('Keywords, style, and guidance distilled for Pinterest searches'),
    selectedAgent: z.enum(agentIdList).optional().describe('Which agent produced the response'),
  })
})
  .then(orchestrationStep)
  .branch([
    [async ({ inputData }) => inputData.suitableAgent === 'budget-agent', budgetAgentStep],
    [async ({ inputData }) => inputData.suitableAgent === 'contractor-agent', contractorAgentStep],
    [async ({ inputData }) => inputData.suitableAgent === 'timeline-agent', timelineAgentStep],
    [async ({ inputData }) => inputData.suitableAgent === 'materials-agent', materialsAgentStep],
    [
      async ({ inputData }) => inputData.suitableAgent === 'design-inspiration-guide-agent',
      designInspirationGuideAgentStep,
    ],
  ])
  .map(async (stepOutput: any) => {
    const normalized = typeof stepOutput === 'object' && stepOutput !== null ? stepOutput : {};
    const selectedAgent = typeof normalized.selectedAgent === 'string' ? normalized.selectedAgent : undefined;
    const imageGallery = normalized.imageGallery;
    const designGuide = normalized.designGuide;
    const fallbackText = typeof normalized.text === 'string' ? normalized.text : '';

    let structured =
      normalized.structured ||
      (selectedAgent === 'budget-agent'
        ? tryParseBudgetAgentReply(fallbackText)
        : selectedAgent === 'contractor-agent'
        ? tryParseContractorAgentReply(fallbackText)
        : selectedAgent === 'timeline-agent'
        ? tryParseTimelineAgentReply(fallbackText)
        : selectedAgent === 'materials-agent'
        ? tryParseMaterialsAgentReply(fallbackText)
        : selectedAgent === 'design-inspiration-guide-agent'
        ? tryParseDesignInspirationGuideReply(fallbackText)
        : undefined);

    const result: {
      finalResponse: string;
      imageGallery?: DesignImageGallery;
      selectedAgent?: string;
      designGuide?: DesignGuide;
      budgetSpreadsheet?: any;
      contractorSpreadsheet?: any;
      materialsSpreadsheet?: any;
      ganttChart?: any;
    } = {
      finalResponse: fallbackText,
      imageGallery,
      selectedAgent,
      designGuide,
      budgetSpreadsheet: normalized.budgetSpreadsheet,
      contractorSpreadsheet: normalized.contractorSpreadsheet,
      materialsSpreadsheet: normalized.materialsSpreadsheet,
      ganttChart: normalized.ganttChart,
    };

    if (structured) {
      result.finalResponse = JSON.stringify(structured, null, 2);

      switch (selectedAgent) {
        case 'budget-agent':
          result.budgetSpreadsheet = structured.spreadsheet ?? result.budgetSpreadsheet;
          break;
        case 'contractor-agent':
          result.contractorSpreadsheet = structured.spreadsheet ?? result.contractorSpreadsheet;
          break;
        case 'materials-agent':
          result.materialsSpreadsheet = structured.spreadsheet ?? result.materialsSpreadsheet;
          break;
        case 'timeline-agent':
          result.ganttChart = structured.ganttChart ?? result.ganttChart;
          break;
        case 'design-inspiration-guide-agent':
          result.designGuide = structured.designGuide ?? result.designGuide;
          result.imageGallery = structured.imageGallery ?? result.imageGallery;
          break;
        default:
          break;
      }
    }

    return result;
  })
  .commit();


function tryParseBudgetAgentReply(text: string): BudgetAgentReply | undefined {
  if (!text) {
    return undefined;
  }

  const candidate = extractJsonPayload(text);
  if (!candidate) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(candidate);
    return BudgetAgentReplySchema.parse(parsed);
  } catch (error) {
    console.warn('Failed to parse budget agent payload', error);
    return undefined;
  }
}

function tryParseContractorAgentReply(text: string): ContractorAgentReply | undefined {
  if (!text) {
    return undefined;
  }

  const candidate = extractJsonPayload(text);
  if (!candidate) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(candidate);
    return ContractorAgentReplySchema.parse(parsed);
  } catch (error) {
    console.warn('Failed to parse contractor agent payload', error);
    return undefined;
  }
}

function tryParseTimelineAgentReply(text: string): TimelineAgentReply | undefined {
  if (!text) {
    return undefined;
  }

  const candidate = extractJsonPayload(text);
  if (!candidate) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(candidate);
    return TimelineAgentReplySchema.parse(parsed);
  } catch (error) {
    console.warn('Failed to parse timeline agent payload', error);
    return undefined;
  }
}

function tryParseMaterialsAgentReply(text: string): MaterialsAgentReply | undefined {
  if (!text) {
    return undefined;
  }

  const candidate = extractJsonPayload(text);
  if (!candidate) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(candidate);
    return MaterialsAgentReplySchema.parse(parsed);
  } catch (error) {
    console.warn('Failed to parse materials agent payload', error);
    return undefined;
  }
}

function tryParseDesignInspirationGuideReply(
  text: string
): DesignInspirationGuideAgentReply | undefined {
  if (!text) {
    return undefined;
  }

  const candidate = extractJsonPayload(text);
  if (!candidate) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(candidate);
    return DesignInspirationGuideAgentReplySchema.parse(parsed);
  } catch (error) {
    console.warn('Failed to parse design inspiration guide payload', error);
    return undefined;
  }
}

type MultiModalTextPart = { type: 'text'; text: string };
type MultiModalImagePart = { type: 'image'; image: string; mediaType?: string };

function buildDesignGuideUserMessage({
  latestCustomerMessage,
  conversationHistory,
  uploads,
}: {
  latestCustomerMessage: string;
  conversationHistory?: string;
  uploads: ChatImageUploadWithUrl[];
}): MessageListInput {
  const summarySections: string[] = [];
  if (conversationHistory?.trim()) {
    summarySections.push(`Previous conversation context:\n${conversationHistory.trim()}`);
  }
  summarySections.push(`Latest customer message:\n${latestCustomerMessage}`);

  if (uploads.length) {
    summarySections.push(
      `Customer included ${uploads.length} inspiration image${
        uploads.length === 1 ? '' : 's'
      }. Analyze them alongside the message to tailor your guidance.`
    );
  }

  const textBlock = summarySections.join('\n\n').trim();
  const contentParts: (MultiModalTextPart | MultiModalImagePart)[] = [
    {
      type: 'text',
      text: textBlock,
    },
  ];

  for (const upload of uploads) {
    contentParts.push({
      type: 'image',
      image: upload.signedUrl,
      mediaType: upload.mimeType,
    });
  }

  return [
    {
      role: 'user',
      content: contentParts,
    },
  ];
}


function extractJsonPayload(text: string): string | undefined {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1).trim();
  }

  return undefined;
}