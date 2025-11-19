import { serverConfig } from '../config/server-config.js';
import { supabaseAdminClient } from './supabase-client.js';

const TABLE_NAME = 'chat_image_uploads';
const BUCKET = serverConfig.supabaseBucket;

type ChatImageUploadRow = {
  id: string;
  session_id: string;
  user_id: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

export type ChatImageUploadRecord = {
  id: string;
  sessionId: string;
  userId: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export type ChatImageUploadWithUrl = ChatImageUploadRecord & {
  signedUrl: string;
};

export type InsertUploadMetadataInput = {
  sessionId: string;
  userId: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
};

export async function insertUploadMetadata(input: InsertUploadMetadataInput): Promise<ChatImageUploadRecord> {
  const { data, error } = await supabaseAdminClient
    .from(TABLE_NAME)
    .insert({
      session_id: input.sessionId,
      user_id: input.userId,
      file_name: input.fileName,
      storage_path: input.storagePath,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to persist upload metadata: ${error.message}`);
  }

  return mapRowToRecord(data as ChatImageUploadRow);
}

export async function listUploadsBySession(sessionId: string, userId?: string): Promise<ChatImageUploadRecord[]> {
  let query = supabaseAdminClient.from(TABLE_NAME).select('*').eq('session_id', sessionId);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load uploads for session: ${error.message}`);
  }

  return (data as ChatImageUploadRow[]).map(mapRowToRecord);
}

export async function deleteUploadsByIds(ids: string[], userId?: string): Promise<ChatImageUploadRecord[]> {
  if (!ids.length) {
    return [];
  }

  let query = supabaseAdminClient.from(TABLE_NAME).delete();
  if (userId) {
    query = query.eq('user_id', userId);
  }
  query = query.in('id', ids);

  const { data, error } = await query.select('*');

  if (error) {
    throw new Error(`Failed to delete uploads: ${error.message}`);
  }

  return (data as ChatImageUploadRow[]).map(mapRowToRecord);
}

export async function deleteUploadsOlderThan(cutoff: Date): Promise<ChatImageUploadRecord[]> {
  const cutoffIso = cutoff.toISOString();

  const { data, error } = await supabaseAdminClient
    .from(TABLE_NAME)
    .delete()
    .lt('created_at', cutoffIso)
    .select('*');

  if (error) {
    throw new Error(`Failed to delete expired uploads: ${error.message}`);
  }

  return (data as ChatImageUploadRow[]).map(mapRowToRecord);
}

export async function createSignedUrlForPath(storagePath: string, expiresInSeconds?: number): Promise<string> {
  const ttlSeconds = expiresInSeconds ?? serverConfig.uploadSignedUrlTTLSeconds;
  const { data, error } = await supabaseAdminClient.storage.from(BUCKET).createSignedUrl(storagePath, ttlSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? 'unknown error'}`);
  }

  return data.signedUrl;
}

export async function uploadFileToBucket(storagePath: string, fileBuffer: Buffer, mimeType: string): Promise<void> {
  const { error } = await supabaseAdminClient.storage.from(BUCKET).upload(storagePath, fileBuffer, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to upload file to Supabase storage: ${error.message}`);
  }
}

export async function removeObjectsFromBucket(storagePaths: string[]): Promise<void> {
  if (!storagePaths.length) {
    return;
  }

  const { error } = await supabaseAdminClient.storage.from(BUCKET).remove(storagePaths);

  if (error) {
    throw new Error(`Failed to remove storage objects: ${error.message}`);
  }
}

export async function getUploadsWithSignedUrls(ids: string[], userId: string): Promise<ChatImageUploadWithUrl[]> {
  if (!ids.length) {
    return [];
  }

  const { data, error } = await supabaseAdminClient
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .in('id', ids);

  if (error) {
    throw new Error(`Failed to look up uploads: ${error.message}`);
  }

  const records = (data as ChatImageUploadRow[]).map(mapRowToRecord);
  const recordsById = new Map(records.map((record) => [record.id, record]));

  const orderedRecords = ids
    .map((id) => recordsById.get(id))
    .filter((record): record is ChatImageUploadRecord => Boolean(record));

  const uploadsWithUrls: ChatImageUploadWithUrl[] = [];
  for (const record of orderedRecords) {
    const signedUrl = await createSignedUrlForPath(record.storagePath);
    uploadsWithUrls.push({ ...record, signedUrl });
  }

  return uploadsWithUrls;
}

function mapRowToRecord(row: ChatImageUploadRow): ChatImageUploadRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    fileName: row.file_name,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}

