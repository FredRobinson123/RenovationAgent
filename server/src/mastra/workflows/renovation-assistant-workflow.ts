import { createStep, createWorkflow } from '@mastra/core';
import { generateText } from 'ai';
import { geminiFasttModel } from '../llms/index.js';
import { BudgetAgentReplySchema, BudgetSpreadsheetSchema, type BudgetAgentReply } from '../tools/create-budget-spreadsheet-tool.js';
import { z } from 'zod';
import { blockedRequestReply, renovationOrchestrationPrompt } from './prompts.js';
import { designAgent } from '../agents/design-agent.js';
import { budgetAgent } from '../agents/budget-agent.js';
import { moodboardAgent } from '../agents/moodboard-agent.js';
import { getUploadsWithSignedUrls, type ChatImageUploadWithUrl } from '../../services/chat-upload-service.js';


export const OrchestrationStepInputSchema = z.object({
  latestCustomerMessage: z.string().describe('The latest message from the customer'),
  conversationHistory: z.string().optional().describe('Optional prior conversation context'),
  sessionId: z.string().min(1).describe('Stable identifier for the chat session'),
  uploadedImageIds: z.array(z.string()).optional().describe('IDs of customer image uploads for this turn'),
  userId: z.string().optional().describe('Clerk user ID for the customer'),
  userEmail: z.string().optional().describe('Email address from Clerk, when available'),
});


export const OrchestrationStepOutputSchema = z.object({
  conversationStage: z.enum(['START', 'CONTINUE', 'END']).describe('The determined conversation stage'),
  suitableAgent: z.enum(['budget-agent', 'design-agent', 'moodboard-agent']).describe('The suitable agent to handle the reply'),
  latestCustomerMessage: z.string().describe('The latest message from the customer'),
  conversationHistory: z.string().optional().describe('Optional prior conversation context'),
  sessionId: z.string().describe('Stable identifier for the chat session'),
  uploadedImageIds: z.array(z.string()).optional().describe('IDs of customer image uploads for this turn'),
  userId: z.string().optional().describe('Clerk user ID for the customer'),
  userEmail: z.string().optional().describe('Email address from Clerk, when available'),
});


export type OrchestrationStepInput = z.infer<typeof OrchestrationStepInputSchema>;
export type OrchestrationStepOutput = z.infer<typeof OrchestrationStepOutputSchema>;

const SUPPORTED_AGENT_IDS: OrchestrationStepOutput['suitableAgent'][] = [
  'budget-agent',
  'design-agent',
  'moodboard-agent',
];

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
      const suitableAgent = isSupportedAgentId(rawAgent) ? rawAgent : 'design-agent';


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


const designAgentStep = createStep({
  id: 'invoke-design-agent',
  description: 'Invokes the design agent for renovation workflow.',
  inputSchema: OrchestrationStepOutputSchema,
  outputSchema: z.object({
    text: z.string(),
    selectedAgent: z.literal('design-agent'),
  }),
  execute: async ({ inputData }) => {
    const { latestCustomerMessage, conversationHistory } = inputData;


    // Build the message for the agent
    let message = latestCustomerMessage;


    // Add conversation history if available
    if (conversationHistory) {
      message = `Previous conversation context: ${conversationHistory}\n\nUser message: ${latestCustomerMessage}`;
    }


    // Generate response using the designAgent (using string format instead of message object)
    const response = await designAgent.generate(message);

    if ((response as any).tripwire) {
      console.warn('Design agent request blocked by input processors', {
        tripwireReason: (response as any).tripwireReason,
      });

      return {
        text: blockedRequestReply,
        selectedAgent: 'design-agent' as const,
      };
    }

    return {
      text: response.text || '',
      selectedAgent: 'design-agent' as const,
    };
  },
});


const moodboardAgentStepOutputSchema = z.object({
  text: z.string(),
  imageGallery: z.unknown().optional(),
  selectedAgent: z.literal('moodboard-agent'),
});

const moodboardAgentStep = createStep({
  id: 'invoke-moodboard-agent',
  description: 'Acknowledges customer uploads and outlines the next moodboard steps.',
  inputSchema: OrchestrationStepOutputSchema,
  outputSchema: moodboardAgentStepOutputSchema,
  execute: async ({ inputData }) => {
    const uploadedImageIds = inputData.uploadedImageIds ?? [];
    const userId = inputData.userId;

    if (!uploadedImageIds.length || !userId) {
      return {
        text: "I can start arranging your moodboard as soon as you add a few inspiration images.",
        selectedAgent: 'moodboard-agent' as const,
      };
    }

    const uploads = await getUploadsWithSignedUrls(uploadedImageIds, userId);
    if (!uploads.length) {
      return {
        text: "I couldn't access those uploads—please try sending the images again.",
        selectedAgent: 'moodboard-agent' as const,
      };
    }

    const uploadSummary = uploads
      .map((upload, index) => `${index + 1}. ${friendlyFileName(upload.fileName)}`)
      .join('\n');

    const agentPrompt = [
      'Customer request:',
      inputData.latestCustomerMessage,
      '',
      `Uploads received (${uploads.length}):`,
      uploadSummary,
      '',
      'Acknowledge the uploads, describe how they set the mood using the customer notes (not the unseen photos), and share the immediate next step.',
    ].join('\n');

    const response = await moodboardAgent.generate(agentPrompt);

    if ((response as any).tripwire) {
      console.warn('Moodboard agent request blocked by input processors', {
        tripwireReason: (response as any).tripwireReason,
      });

      return {
        text: blockedRequestReply,
        selectedAgent: 'moodboard-agent' as const,
      };
    }

    return {
      text: response.text || "I'll start layering these uploads into your first-pass moodboard now.",
      imageGallery: buildGalleryFromUploads(uploads, inputData.latestCustomerMessage),
      selectedAgent: 'moodboard-agent' as const,
    };
  },
});

export const renovationWorkflow = createWorkflow({
  id: 'renovation-workflow',
  description: 'A workflow to manage renovation conversations using design and budget agents.',
  inputSchema: OrchestrationStepInputSchema,
  outputSchema: z.object({
    finalResponse: z.string().describe('The final response from the selected agent'),
    budgetSpreadsheet: BudgetSpreadsheetSchema.optional().describe('Structured budget data, when provided by the budget agent'),
  })
})
  .then(orchestrationStep)
  .branch([
    [
      async ({ inputData }) =>
        Boolean(inputData.uploadedImageIds?.length) || inputData.suitableAgent === 'moodboard-agent',
      moodboardAgentStep,
    ],
    [async ({ inputData }) => inputData.suitableAgent === 'budget-agent', budgetAgentStep],
    [async ({ inputData }) => inputData.suitableAgent === 'design-agent', designAgentStep]
  ])
  .map(async (stepOutput: any) => {
    const normalized = typeof stepOutput === 'object' && stepOutput !== null ? stepOutput : {};
    const structured = normalized.structured ?? (typeof normalized.text === 'string' ? tryParseBudgetAgentReply(normalized.text) : undefined);
    const selectedAgent = typeof normalized.selectedAgent === 'string' ? normalized.selectedAgent : undefined;
    const imageGallery = normalized.imageGallery;
    if (structured) {
      return {
        finalResponse: JSON.stringify(structured, null, 2),
        budgetSpreadsheet: structured.spreadsheet ?? undefined,
        imageGallery,
        selectedAgent,
      };
    }
    return {
      finalResponse: typeof normalized.text === 'string' ? normalized.text : '',
      imageGallery,
      selectedAgent,
    };
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


function buildGalleryFromUploads(uploads: ChatImageUploadWithUrl[], latestCustomerMessage: string) {
  const summary =
    uploads.length === 1
      ? 'Building this moodboard around the image you just shared.'
      : `Building this moodboard around the ${uploads.length} inspiration images you just shared.`;

  const querySource = (latestCustomerMessage || '').trim().slice(0, 120);
  const query = querySource || 'customer inspiration uploads';

  return {
    variant: 'customer',
    query,
    summary,
    images: uploads.map((upload, index) => ({
      id: upload.id,
      title: friendlyFileName(upload.fileName),
      description: `Customer inspiration #${index + 1}`,
      imageUrl: upload.signedUrl,
      sourceUrl: upload.signedUrl,
    })),
  };
}

function friendlyFileName(fileName: string): string {
  if (!fileName) {
    return 'Customer upload';
  }
  const withoutExt = fileName.replace(/\.[^/.]+$/, '');
  const spaced = withoutExt.replace(/[-_]+/g, ' ').trim();
  return spaced ? spaced.replace(/\s{2,}/g, ' ') : 'Customer upload';
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