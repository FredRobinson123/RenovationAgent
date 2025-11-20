export type ChatRole = 'user' | 'assistant';

export type AgentSource =
  | 'orchestrator'
  | 'design-inspiration-guide-agent'
  | 'budget-agent'
  | 'contractor-agent'
  | 'timeline-agent'
  | 'materials-agent'
  | 'assistant';

export interface CustomerImageUpload {
  id: string;
  sessionId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  signedUrl: string;
}

export interface PendingAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  previewUrl: string;
  file: File;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  source?: AgentSource;
  budgetSpreadsheet?: BudgetSpreadsheet;
  imageGallery?: DesignImageGallery;
  contractorSpreadsheet?: ContractorSpreadsheet;
  materialsSpreadsheet?: MaterialsSpreadsheet;
  ganttChart?: GanttChart;
  designGuide?: DesignGuide;
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

export interface ContractorRow {
  name: string;
  serviceType: string;
  areaServed: string;
  website?: string;
  contact?: string;
  rating?: string;
  notes?: string;
}

export interface ContractorSpreadsheet {
  projectName: string;
  location: string;
  createdAt: string;
  contractors: ContractorRow[];
}

export interface MaterialRow {
  material: string;
  vendor: string;
  location: string;
  website?: string;
  indicativePrice?: string;
  leadTime?: string;
  notes?: string;
}

export interface MaterialsSpreadsheet {
  projectName: string;
  location: string;
  createdAt: string;
  materials: MaterialRow[];
}

export type GanttTaskStatus = 'planned' | 'in-progress' | 'blocked' | 'complete';

export interface GanttTask {
  id: string;
  name: string;
  phase?: string;
  startWeek: number;
  endWeek: number;
  durationWeeks: number;
  status?: GanttTaskStatus;
  dependencies?: string[];
  notes?: string;
}

export interface GanttChart {
  projectName: string;
  startingWeek: number;
  createdAt: string;
  tasks: GanttTask[];
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

export interface DesignGuide {
  condensedKeywords: string[];
  pinterestSearchQuery: string;
  styleLabel: string;
  longFormGuidance: string;
  clarifyingQuestions?: string[];
}

export interface DesignInspirationGuidePayload {
  designGuide: DesignGuide;
  imageGallery?: DesignImageGallery | null;
}

