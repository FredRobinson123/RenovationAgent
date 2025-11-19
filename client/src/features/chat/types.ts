export type ChatRole = 'user' | 'assistant';

export type AgentSource = 'orchestrator' | 'design-agent' | 'budget-agent' | 'moodboard-agent' | 'assistant';

export interface CustomerImageUpload {
  id: string;
  sessionId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  signedUrl: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  source?: AgentSource;
  budgetSpreadsheet?: BudgetSpreadsheet;
  imageGallery?: DesignImageGallery;
  attachments?: CustomerImageUpload[];
}

export interface BudgetLineItem {
  category: string;
  description: string;
  cost: number;
  note?: string | null;
}

export interface BudgetSpreadsheet {
  projectName: string;
  createdAt: string;
  totalBudget: number;
  contingencyAmount: number;
  lineItems: BudgetLineItem[];
  total: number;
}

export interface DesignImage {
  id: string;
  title: string;
  imageUrl: string;
  sourceUrl: string;
  description?: string | null;
}

export interface DesignImageGallery {
  query: string;
  summary?: string | null;
  images: DesignImage[];
  variant?: "search" | "customer";
}

