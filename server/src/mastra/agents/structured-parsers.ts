import { z } from 'zod';
import { BudgetAgentReplySchema } from '../tools/create-budget-spreadsheet-tool.js';
import {
  ContractorAgentReplySchema,
  DesignInspirationGuideAgentReplySchema,
  MaterialsAgentReplySchema,
  TimelineAgentReplySchema,
} from './shared-schemas.js';

export function extractJsonPayload(text: string): string | undefined {
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

function createStructuredReplyParser<T>(schema: z.ZodType<T>): (text: string) => T | undefined {
  return (text: string) => {
    if (!text) {
      return undefined;
    }

    const candidate = extractJsonPayload(text);
    if (!candidate) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(candidate);
      return schema.parse(parsed);
    } catch {
      return undefined;
    }
  };
}

export const parseBudgetAgentReply = createStructuredReplyParser(
  BudgetAgentReplySchema
);

export const parseContractorAgentReply = createStructuredReplyParser(
  ContractorAgentReplySchema
);

export const parseTimelineAgentReply = createStructuredReplyParser(
  TimelineAgentReplySchema
);

export const parseMaterialsAgentReply = createStructuredReplyParser(
  MaterialsAgentReplySchema
);

export const parseDesignInspirationGuideReply = createStructuredReplyParser(
  DesignInspirationGuideAgentReplySchema
);

