import { API_BASE_URL } from "@features/chat/services/agentClient";
import type { CustomerImageUpload } from "@features/chat/types";
import { extractErrorMessage } from "@features/chat/utils/parsers";

const UPLOADS_BASE = `${API_BASE_URL}/api/uploads`;
const IMAGE_UPLOAD_ENDPOINT = `${UPLOADS_BASE}/images`;

export type UploadImagesOptions = {
  sessionId: string;
  token: string;
};

export async function uploadImages(files: File[], options: UploadImagesOptions): Promise<CustomerImageUpload[]> {
  if (!files.length) {
    return [];
  }

  const formData = new FormData();
  formData.append("sessionId", options.sessionId);
  files.forEach((file) => formData.append("files", file));

  const response = await fetch(IMAGE_UPLOAD_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.token}`,
    },
    body: formData,
  });

  const bodyText = await response.text().catch(() => "");
  if (!response.ok) {
    const detail = extractErrorMessage(bodyText) ?? response.statusText ?? "Upload failed.";
    throw new Error(detail);
  }

  if (!bodyText) {
    throw new Error("Upload endpoint returned an empty response.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    throw new Error("Upload endpoint returned invalid JSON.");
  }

  const uploads = (parsed as Record<string, unknown>)?.uploads;
  if (!Array.isArray(uploads)) {
    throw new Error("Upload endpoint did not return the expected payload.");
  }

  return uploads as CustomerImageUpload[];
}

export async function deleteUpload(uploadId: string, options: { token: string }): Promise<void> {
  const response = await fetch(`${UPLOADS_BASE}/${uploadId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${options.token}`,
    },
  });

  if (response.ok) {
    return;
  }

  const bodyText = await response.text().catch(() => "");
  const detail = extractErrorMessage(bodyText) ?? response.statusText ?? "Failed to delete upload.";
  throw new Error(detail);
}

