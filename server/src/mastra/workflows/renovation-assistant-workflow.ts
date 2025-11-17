import { createStep, createWorkflow } from '@mastra/core';
import { generateText } from 'ai';
import { geminiFasttModel } from '../llms/index.js';
import { BudgetAgentReplySchema, BudgetSpreadsheetSchema, type BudgetAgentReply } from '../tools/create-budget-spreadsheet-tool.js';
import { z } from 'zod';
import { renovationOrchestrationPrompt } from './prompts.js';
import { designAgent } from '../agents/design-agent.js';
import { budgetAgent } from '../agents/budget-agent.js';


export const OrchestrationStepInputSchema = z.object({
  latestCustomerMessage: z.string().describe('The latest message from the customer'),
  conversationHistory: z.string().optional().describe('Optional prior conversation context'),
});


export const OrchestrationStepOutputSchema = z.object({
  conversationStage: z.enum(['START', 'CONTINUE', 'END']).describe('The determined conversation stage'),
  suitableAgent: z.enum(['budget-agent', 'design-agent']).describe('The suitable agent to handle the reply'),
  latestCustomerMessage: z.string().describe('The latest message from the customer'),
  conversationHistory: z.string().optional().describe('Optional prior conversation context'),
});


export type OrchestrationStepInput = z.infer<typeof OrchestrationStepInputSchema>;
export type OrchestrationStepOutput = z.infer<typeof OrchestrationStepOutputSchema>;


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
    const { latestCustomerMessage, conversationHistory } = inputData;
    const prompt = renovationOrchestrationPrompt;



    const filledPrompt = replacePlaceholders(prompt, {
      latest_customer_message: latestCustomerMessage,
      conversation_history: conversationHistory || '',
    }); 


    try {
      const { text } = await generateText({
        model: geminiFasttModel,
        prompt: filledPrompt,
      });


      const conversationStageMatch = text.match(/<conversation_stage>([\s\S]*?)<\/conversation_stage>/);
      const conversationStage = conversationStageMatch ? conversationStageMatch[1].trim() : '';


      const agentMatch = text.match(/<agent>([\s\S]*?)<\/agent>/);
      const suitableAgent = agentMatch ? agentMatch[1].trim() as 'budget-agent' | 'design-agent' : 'design-agent';


    return {
        conversationStage: conversationStage as 'START' | 'CONTINUE' | 'END',
        suitableAgent,
        latestCustomerMessage,
        conversationHistory,
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
    const rawText = response.text || '';
    const structured = tryParseBudgetAgentReply(rawText);
    const normalizedText = structured ? JSON.stringify(structured, null, 2) : rawText;


    return {
        text: normalizedText,
        structured,
    };
  },
});


const designAgentStep = createStep({
  id: 'invoke-design-agent',
  description: 'Invokes the design agent for renovation workflow.',
  inputSchema: OrchestrationStepOutputSchema,
  outputSchema: z.object({ text: z.string() }),
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


    return {
        text: response.text || "",
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
    [async ({ inputData }) => inputData.suitableAgent === 'budget-agent', budgetAgentStep],
    [async ({ inputData }) => inputData.suitableAgent === 'design-agent', designAgentStep]
  ])
  .map(async (stepOutput: any) => {
    const normalized = typeof stepOutput === 'object' && stepOutput !== null ? stepOutput : {};
    const structured = normalized.structured ?? (typeof normalized.text === 'string' ? tryParseBudgetAgentReply(normalized.text) : undefined);
    if (structured) {
      return {
        finalResponse: JSON.stringify(structured, null, 2),
        budgetSpreadsheet: structured.spreadsheet ?? undefined,
      };
    }
    return {
      finalResponse: typeof normalized.text === 'string' ? normalized.text : '',
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