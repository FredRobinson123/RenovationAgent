import type { PlanAsset } from "@features/chat/types";
import { normalizePlanAssets } from "@features/chat/utils/planAssets";
import { extractErrorMessage } from "@features/chat/utils/parsers";
import { API_BASE_URL, ASSISTANT_TROUBLESHOOTING } from "./agentClient";

const PLAN_ENDPOINT = `${API_BASE_URL}/api/plan`;

type FetchPlanAssetsOptions = {
  token: string;
};

export async function fetchPlanAssets(
  sessionId: string,
  { token }: FetchPlanAssetsOptions
): Promise<PlanAsset[]> {
  if (!sessionId) {
    return [];
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
  };

  let response: Response;
  try {
    response = await fetch(`${PLAN_ENDPOINT}/${encodeURIComponent(sessionId)}/assets`, {
      method: "GET",
      headers,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Network error.";
    throw new Error(
      `Unable to load your saved renovation plan assets right now. ${ASSISTANT_TROUBLESHOOTING} (details: ${detail})`
    );
  }

  const responseText = await response.text().catch(() => "");
  if (!response.ok) {
    const message = extractErrorMessage(responseText) ?? response.statusText ?? "Unknown error.";
    throw new Error(`Failed to load plan assets (${response.status}). ${message}`);
  }

  if (!responseText) {
    return [];
  }

  let payload: unknown;
  try {
    payload = JSON.parse(responseText);
  } catch {
    throw new Error("Plan assets response was not valid JSON.");
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  return normalizePlanAssets(record.assets);
}

