import { z } from 'zod';
import { ContractorSpreadsheetSchema } from '../tools/contractor-spreadsheet-tool.js';
import { MaterialsSpreadsheetSchema } from '../tools/materials-spreadsheet-tool.js';
import { GanttChartSchema } from '../tools/gantt-chart-tool.js';

export const DesignGuideSchema = z.object({
  condensedKeywords: z.array(z.string()).max(6),
  pinterestSearchQuery: z.string(),
  styleLabel: z.string(),
  longFormGuidance: z.string(),
  clarifyingQuestions: z.array(z.string()).default([]),
});

export type DesignGuide = z.infer<typeof DesignGuideSchema>;

export const DesignGalleryImageSchema = z.object({
  id: z.string(),
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  imageUrl: z.string(),
  sourceUrl: z.string(),
});

export const DesignImageGallerySchema = z.object({
  query: z.string(),
  summary: z.string().optional().nullable(),
  images: z.array(DesignGalleryImageSchema),
  variant: z.literal('customer').or(z.literal('search')).optional(),
});

export type DesignImageGallery = z.infer<typeof DesignImageGallerySchema>;

export const DesignInspirationGuideAgentReplySchema = z.object({
  designGuide: DesignGuideSchema,
  imageGallery: DesignImageGallerySchema.nullable(),
});

export type DesignInspirationGuideAgentReply = z.infer<typeof DesignInspirationGuideAgentReplySchema>;

export const ContractorAgentReplySchema = z.object({
  messageForCustomer: z.string().min(1, 'messageForCustomer must include the narrative response'),
  spreadsheet: ContractorSpreadsheetSchema.optional().nullable(),
});

export type ContractorAgentReply = z.infer<typeof ContractorAgentReplySchema>;

export const TimelineAgentReplySchema = z.object({
  messageForCustomer: z.string().min(1, 'messageForCustomer must include the narrative response'),
  ganttChart: GanttChartSchema.optional().nullable(),
});

export type TimelineAgentReply = z.infer<typeof TimelineAgentReplySchema>;

export const MaterialsAgentReplySchema = z.object({
  messageForCustomer: z.string().min(1, 'messageForCustomer must include the narrative response'),
  spreadsheet: MaterialsSpreadsheetSchema.optional().nullable(),
});

export type MaterialsAgentReply = z.infer<typeof MaterialsAgentReplySchema>;

