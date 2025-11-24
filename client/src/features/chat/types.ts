export type ChatRole = 'user' | 'assistant';

export type AgentSource =
  | 'lead-renovation-agent'
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
  specialty: string;
  url?: string;
}

export interface ContractorSpreadsheet {
  projectName: string;
  createdAt: string;
  contractors: ContractorRow[];
}

export interface MaterialRow {
  material: string;
  supplier: string;
  price?: string;
  url?: string;
}

export interface MaterialsSpreadsheet {
  projectName: string;
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

export type PlanAssetType =
  | 'budget'
  | 'contractor'
  | 'materials'
  | 'timeline'
  | 'design-guide'
  | 'image-gallery';

interface BasePlanAsset {
  id: string;
  sessionId: string;
  userId: string;
  assetType: PlanAssetType;
  title: string;
  summary?: string | null;
  sourceAgent: AgentSource;
  createdAt: string;
}

export type BudgetPlanAsset = BasePlanAsset & {
  assetType: 'budget';
  data: BudgetSpreadsheet;
};

export type ContractorPlanAsset = BasePlanAsset & {
  assetType: 'contractor';
  data: ContractorSpreadsheet;
};

export type MaterialsPlanAsset = BasePlanAsset & {
  assetType: 'materials';
  data: MaterialsSpreadsheet;
};

export type TimelinePlanAsset = BasePlanAsset & {
  assetType: 'timeline';
  data: GanttChart;
};

export type DesignGuidePlanAsset = BasePlanAsset & {
  assetType: 'design-guide';
  data: DesignGuide;
};

export type GalleryPlanAsset = BasePlanAsset & {
  assetType: 'image-gallery';
  data: DesignImageGallery;
};

export type PlanAsset =
  | BudgetPlanAsset
  | ContractorPlanAsset
  | MaterialsPlanAsset
  | TimelinePlanAsset
  | DesignGuidePlanAsset
  | GalleryPlanAsset;

export type PlanAssetGroup = {
  assetType: PlanAssetType;
  label: string;
  assets: PlanAsset[];
};

export type PlanAssetType = 'budget' | 'contractor' | 'materials' | 'timeline' | 'design' | 'gallery';

type BasePlanAsset<TType extends PlanAssetType, TData> = {
  id: string;
  sessionId: string;
  assetType: TType;
  title: string;
  summary?: string;
  data: TData;
  sourceAgent?: AgentSource;
  createdAt: string;
};

export type PlanAsset =
  | BasePlanAsset<'budget', BudgetSpreadsheet>
  | BasePlanAsset<'contractor', ContractorSpreadsheet>
  | BasePlanAsset<'materials', MaterialsSpreadsheet>
  | BasePlanAsset<'timeline', GanttChart>
  | BasePlanAsset<'design', DesignGuide>
  | BasePlanAsset<'gallery', DesignImageGallery>;

export type PlanAssetGroup = {
  type: PlanAssetType;
  title: string;
  assets: PlanAsset[];
};

