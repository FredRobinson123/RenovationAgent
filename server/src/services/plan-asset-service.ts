import { supabaseAdminClient } from './supabase-client.js';
import type { JsonRecord } from '../types.js';

const TABLE_NAME = 'plan_assets';

export type PlanAssetType =
  | 'budget'
  | 'contractor'
  | 'materials'
  | 'timeline'
  | 'design-guide'
  | 'image-gallery';

type PlanAssetRow = {
  id: string;
  session_id: string;
  user_id: string;
  asset_type: PlanAssetType;
  title: string;
  summary: string | null;
  data: JsonRecord;
  source_agent: string;
  created_at: string;
};

export type PlanAssetRecord = {
  id: string;
  sessionId: string;
  userId: string;
  assetType: PlanAssetType;
  title: string;
  summary?: string | null;
  data: JsonRecord;
  sourceAgent: string;
  createdAt: string;
};

export type InsertPlanAssetInput = {
  sessionId: string;
  userId: string;
  assetType: PlanAssetType;
  title: string;
  summary?: string | null;
  data: JsonRecord;
  sourceAgent: string;
};

export async function savePlanAssets(inputs: InsertPlanAssetInput[]): Promise<PlanAssetRecord[]> {
  if (!inputs.length) {
    return [];
  }

  const payload = inputs.map((input) => ({
        session_id: input.sessionId,
        user_id: input.userId,
        asset_type: input.assetType,
        title: input.title,
        summary: input.summary ?? null,
        data: input.data,
    source_agent: input.sourceAgent,
  }));

  const { data, error } = await supabaseAdminClient.from(TABLE_NAME).insert(payload).select('*');

  if (error) {
    throw new Error(`Failed to save plan assets: ${error.message}`);
  }

  return (data as PlanAssetRow[]).map(mapRowToRecord);
}

export async function listPlanAssetsBySession(
  sessionId: string,
  userId: string
): Promise<PlanAssetRecord[]> {
  const { data, error } = await supabaseAdminClient
    .from(TABLE_NAME)
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load plan assets: ${error.message}`);
  }

  return (data as PlanAssetRow[]).map(mapRowToRecord);
}

function mapRowToRecord(row: PlanAssetRow): PlanAssetRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    assetType: row.asset_type,
    title: row.title,
    summary: row.summary,
    data: row.data,
    sourceAgent: row.source_agent,
    createdAt: row.created_at,
  };
}
