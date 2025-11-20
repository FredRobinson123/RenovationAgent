import Busboy from 'busboy';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { serverConfig } from '../config/server-config.js';
import type { LoggerLike } from '../types.js';
import type { AuthenticatedUser } from '../services/auth-service.js';
import {
  insertUploadMetadata,
  createSignedUrlForPath,
  uploadFileToBucket,
  deleteUploadsByIds,
  removeObjectsFromBucket,
  type ChatImageUploadRecord,
} from '../services/chat-upload-service.js';
import { sendJson } from '../http/http-utils.js';

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/avif',
]);

type UploadedFile = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
};

export type UploadHandlerDeps = {
  logger: LoggerLike;
};

type UploadPayload = {
  sessionId?: string;
  files: UploadedFile[];
};

type UploadResponse = {
  id: string;
  sessionId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  signedUrl: string;
};

export async function handleImageUploadRequest(
  req: IncomingMessage,
  res: ServerResponse,
  authUser: AuthenticatedUser,
  { logger }: UploadHandlerDeps
) {
  try {
    assertMultipartRequest(req);
    const { sessionId, files } = await parseMultipartPayload(req);

    if (!sessionId) {
      throw new UploadRequestError('sessionId is required', 400);
    }

    if (!files.length) {
      throw new UploadRequestError('Please attach at least one image', 400);
    }

    const uploads = await persistUploads(sessionId, authUser.userId, files, logger);
    sendJson(res, 201, { uploads });
  } catch (error) {
    handleUploadError(error, res, logger);
  }
}

export async function handleUploadDeleteRequest(
  uploadId: string | undefined,
  res: ServerResponse,
  authUser: AuthenticatedUser,
  { logger }: UploadHandlerDeps
) {
  if (!uploadId) {
    sendJson(res, 400, { error: 'Upload id is required' });
    return;
  }

  try {
    const deleted = await deleteUploadsByIds([uploadId], authUser.userId);
    if (!deleted.length) {
      sendJson(res, 404, { error: 'Upload not found' });
      return;
    }

    await removeObjectsFromBucket(deleted.map((upload) => upload.storagePath));
    sendJson(res, 200, { success: true, id: uploadId });
  } catch (error) {
    handleUploadError(error, res, logger);
  }
}

async function persistUploads(
  sessionId: string,
  userId: string,
  files: UploadedFile[],
  logger: LoggerLike
): Promise<UploadResponse[]> {
  const storedUploads: ChatImageUploadRecord[] = [];
  const uploadedPaths: string[] = [];

  try {
    for (const file of files) {
      const storagePath = buildStoragePath(sessionId, file.fileName);
      await uploadFileToBucket(storagePath, file.buffer, file.mimeType);
      uploadedPaths.push(storagePath);

      const metadata = await insertUploadMetadata({
        sessionId,
        userId,
        fileName: file.fileName,
        storagePath,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
      });
      storedUploads.push(metadata);
    }
  } catch (error) {
    logger.error('Failed to persist uploads, reverting partial success', {
      err: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    await deleteUploadsByIds(
      storedUploads.map((upload) => upload.id),
      userId
    );
    await removeObjectsFromBucket(uploadedPaths);
    throw error;
  }

  const uploadsWithUrls: UploadResponse[] = await Promise.all(
    storedUploads.map(async (upload) => ({
      id: upload.id,
      sessionId: upload.sessionId,
      fileName: upload.fileName,
      mimeType: upload.mimeType,
      sizeBytes: upload.sizeBytes,
      createdAt: upload.createdAt,
      signedUrl: await createSignedUrlForPath(upload.storagePath),
    }))
  );

  return uploadsWithUrls;
}

function assertMultipartRequest(req: IncomingMessage) {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.startsWith('multipart/form-data')) {
    throw new UploadRequestError('Expected multipart/form-data request', 415);
  }
}

async function parseMultipartPayload(req: IncomingMessage): Promise<UploadPayload> {
  return new Promise<UploadPayload>((resolve, reject) => {
    const bb = Busboy({
      headers: req.headers,
      limits: {
        files: serverConfig.uploadMaxFileCount,
        fileSize: serverConfig.uploadMaxFileSizeBytes,
      },
    });

    const files: UploadedFile[] = [];
    let sessionId: string | undefined;
    let aborted = false;

    const rejectOnce = (error: Error) => {
      if (aborted) {
        return;
      }
      aborted = true;
      cleanupStream();
      reject(error);
    };

    const cleanupStream = () => {
      req.unpipe?.(bb);
      req.resume();
    };

    bb.on('field', (name, value) => {
      if (name === 'sessionId') {
        sessionId = value.trim().slice(0, 128);
      }
    });

    bb.on('file', (_name, stream, info) => {
      const mimeType = info.mimeType.toLowerCase();
      if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
        stream.resume();
        rejectOnce(new UploadRequestError('Unsupported file type', 415));
        return;
      }

      const chunks: Buffer[] = [];
      let totalBytes = 0;

      stream.on('data', (chunk) => {
        if (aborted) {
          return;
        }
        totalBytes += chunk.length;
        chunks.push(chunk);
      });

      stream.once('limit', () => {
        stream.resume();
        rejectOnce(
          new UploadRequestError(
            `Each image must be ${Math.floor(serverConfig.uploadMaxFileSizeBytes / (1024 * 1024))}MB or smaller`,
            413
          )
        );
      });

      stream.on('end', () => {
        if (aborted) {
          return;
        }
        files.push({
          fileName: sanitizeFileName(info.filename),
          mimeType,
          sizeBytes: totalBytes,
          buffer: Buffer.concat(chunks),
        });
      });
    });

    bb.once('filesLimit', () => {
      rejectOnce(
        new UploadRequestError(`You can upload up to ${serverConfig.uploadMaxFileCount} images at a time`, 413)
      );
    });

    bb.on('error', (error) => {
      rejectOnce(error instanceof Error ? error : new Error('Upload stream failed'));
    });

    bb.on('finish', () => {
      if (!aborted) {
        resolve({ sessionId, files });
      }
    });

    req.pipe(bb);
  });
}

function handleUploadError(error: unknown, res: ServerResponse, logger: LoggerLike) {
  if (error instanceof UploadRequestError) {
    sendJson(res, error.statusCode, { error: error.message });
    return;
  }

  logger.error('Image upload route failed', {
    err: error instanceof Error ? { message: error.message, stack: error.stack } : error,
  });
  sendJson(res, 500, { error: buildUploadFailureMessage(error) });
}

function buildUploadFailureMessage(error: unknown): string {
  if (!(error instanceof Error) || !error.message) {
    return 'Failed to process image upload.';
  }

  const normalizedMessage = error.message.toLowerCase();

  if (normalizedMessage.includes('supabase is not configured')) {
    return 'Uploads backend is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.';
  }

  if (normalizedMessage.includes('storage bucket') && normalizedMessage.includes('not found')) {
    return `Uploads bucket "${serverConfig.supabaseBucket}" does not exist yet. Create it in Supabase storage.`;
  }

  if (normalizedMessage.includes('failed to upload file to supabase storage')) {
    return 'Could not write the image to Supabase storage. Check bucket permissions and service role credentials.';
  }

  if (normalizedMessage.includes('failed to persist upload metadata')) {
    return 'Upload metadata could not be saved. Confirm the chat_image_uploads table exists (see server/supabase/schema.sql).';
  }

  if (normalizedMessage.includes('failed to create signed url')) {
    return 'Uploads succeeded but signed URLs could not be created. Verify the Supabase storage configuration.';
  }

  return 'Failed to process image upload.';
}

function sanitizeFileName(fileName: string | undefined): string {
  const fallback = `upload-${Date.now()}.jpg`;
  if (!fileName) {
    return fallback;
  }
  const normalized = fileName.replace(/[/\\]/g, '').replace(/\s+/g, '-');
  const safe = normalized.replace(/[^a-zA-Z0-9._-]/g, '');
  return safe || fallback;
}

function buildStoragePath(sessionId: string, fileName: string): string {
  const uniquePrefix = randomUUID();
  return `${sessionId}/${uniquePrefix}-${fileName}`;
}

class UploadRequestError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'UploadRequestError';
    this.statusCode = statusCode;
  }
}

