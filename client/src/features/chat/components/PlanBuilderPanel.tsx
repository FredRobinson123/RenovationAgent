import { useMemo } from "react";
import { CalendarClock, Images, Palette, ShoppingBag, Users, Wallet, X } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import type {
  BudgetPlanAsset,
  ContractorPlanAsset,
  DesignGuidePlanAsset,
  GalleryPlanAsset,
  MaterialsPlanAsset,
  PlanAsset,
  PlanAssetGroup,
  PlanAssetType,
  TimelinePlanAsset,
} from "@features/chat/types";
import { useCsvDownload } from "@shared/hooks/useCsvDownload";

type PlanBuilderPanelProps = {
  planAssets: PlanAsset[];
  onClose?: () => void;
};

type GroupMeta = {
  label: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const PLAN_SECTION_METADATA: Record<PlanAssetType, GroupMeta> = {
  budget: {
    label: "Budget",
    description: "Track spending and contingency decisions.",
    icon: Wallet,
  },
  contractor: {
    label: "Contractor Sourcing",
    description: "Keep tabs on shortlisted partners.",
    icon: Users,
  },
  materials: {
    label: "Materials & Finishes",
    description: "Save sourcing lists and pricing.",
    icon: ShoppingBag,
  },
  timeline: {
    label: "Project Timeline",
    description: "Sequenced phases and dependencies.",
    icon: CalendarClock,
  },
  "design-guide": {
    label: "Design Direction",
    description: "Style guardrails, keywords, and notes.",
    icon: Palette,
  },
  "image-gallery": {
    label: "Inspiration Gallery",
    description: "Reference imagery curated for you.",
    icon: Images,
  },
};

const GROUP_RENDER_ORDER: PlanAssetType[] = [
  "budget",
  "contractor",
  "materials",
  "timeline",
  "design-guide",
  "image-gallery",
];

export function PlanBuilderPanel({ planAssets, onClose }: PlanBuilderPanelProps) {
  if (!planAssets.length) {
    return null;
  }

  const groupedAssets = useMemo(() => buildPlanGroups(planAssets), [planAssets]);

  return (
    <section className="h-full overflow-y-auto bg-muted/20 px-4 py-4">
      <div className="flex items-start justify-between gap-4 pb-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Your renovation plan</p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-1">Saved assets</h2>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Close renovation plan"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {groupedAssets.map((group) => (
          <PlanAssetGroupSection key={group.assetType} group={group} />
        ))}
      </div>
    </section>
  );
}

type PlanAssetGroupSectionProps = {
  group: PlanAssetGroup;
};

function PlanAssetGroupSection({ group }: PlanAssetGroupSectionProps) {
  const meta = PLAN_SECTION_METADATA[group.assetType];
  const Icon = meta.icon;

  return (
    <div className="rounded-2xl border border-border bg-background shadow-sm">
      <div className="flex items-start gap-3 border-b border-border/70 px-4 py-3">
        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="flex-1">
          <p className="font-semibold">{meta.label}</p>
          <p className="text-sm text-muted-foreground">{meta.description}</p>
        </div>
        <Badge variant="outline">{group.assets.length}</Badge>
      </div>

      <div className="divide-y divide-border/60">
        {group.assets.map((asset) => (
          <PlanAssetCard key={asset.id} asset={asset} />
        ))}
      </div>
    </div>
  );
}

type PlanAssetCardProps = {
  asset: PlanAsset;
};

function PlanAssetCard({ asset }: PlanAssetCardProps) {
  return (
    <div className="px-4 py-4 space-y-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-foreground">{asset.title}</p>
            <p className="text-xs text-muted-foreground">
              Generated {formatDate(asset.createdAt)} • {formatAgentLabel(asset.sourceAgent)}
            </p>
          </div>
          <span className="text-xs font-mono uppercase text-muted-foreground">{asset.assetType}</span>
        </div>
        {asset.summary && (
          <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-3">{asset.summary}</p>
        )}
      </div>

      {renderAssetPreview(asset)}
    </div>
  );
}

function renderAssetPreview(asset: PlanAsset) {
  switch (asset.assetType) {
    case "budget":
      return <BudgetAssetPreview asset={asset} />;
    case "contractor":
      return <ContractorAssetPreview asset={asset} />;
    case "materials":
      return <MaterialsAssetPreview asset={asset} />;
    case "timeline":
      return <TimelineAssetPreview asset={asset} />;
    case "design-guide":
      return <DesignGuideAssetPreview asset={asset} />;
    case "image-gallery":
      return <GalleryAssetPreview asset={asset} />;
    default:
      return null;
  }
}

function BudgetAssetPreview({ asset }: { asset: BudgetPlanAsset }) {
  const { download, isDownloading } = useCsvDownload({ defaultFilename: "renovation-budget" });
  const formatter = useCurrencyFormatter();
  const topLines = asset.data.lineItems.slice(0, 3);

  const handleDownload = () => {
    const rows: (string | number)[][] = [
      ["Project", asset.data.projectName],
      ["Generated", new Date(asset.data.createdAt).toLocaleString()],
      [],
      ["Category", "Description", "Cost", "Notes"],
      ...asset.data.lineItems.map((item) => [item.category, item.description, item.cost, item.note ?? ""]),
      [],
      ["Total budget", asset.data.totalBudget],
      ["Contingency amount", asset.data.contingencyAmount],
      ["Total (before contingency)", asset.data.total],
    ];
    download(rows, { filename: asset.data.projectName || "renovation-budget" });
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-muted/70 px-3 py-2">
          <p className="text-muted-foreground">Total Budget</p>
          <p className="text-base font-semibold">{formatter(asset.data.totalBudget)}</p>
        </div>
        <div className="rounded-lg bg-muted/70 px-3 py-2">
          <p className="text-muted-foreground">Contingency</p>
          <p className="text-base font-semibold">{formatter(asset.data.contingencyAmount)}</p>
        </div>
      </div>
      <ul className="text-sm text-muted-foreground space-y-1">
        {topLines.map((item, index) => (
          <li key={`${item.category}-${index}`} className="flex items-center justify-between gap-3">
            <span className="font-medium text-foreground">{item.category}</span>
            <span className="text-right">{formatter(item.cost)}</span>
          </li>
        ))}
        {asset.data.lineItems.length > topLines.length && (
          <li className="text-xs text-muted-foreground">+ {asset.data.lineItems.length - topLines.length} more items</li>
        )}
      </ul>
      <Button variant="outline" size="sm" onClick={handleDownload} disabled={isDownloading} className="w-full">
        Download CSV
      </Button>
    </div>
  );
}

function ContractorAssetPreview({ asset }: { asset: ContractorPlanAsset }) {
  const contractors = asset.data.contractors.slice(0, 3);
  const hasMore = asset.data.contractors.length > contractors.length;

  return (
    <div className="space-y-1">
      {contractors.map((contractor) => (
        <div
          key={contractor.name}
          className="rounded-xl border border-border/60 px-3 py-2 flex items-center justify-between text-sm"
        >
          <div>
            <p className="font-medium text-foreground">{contractor.name}</p>
            <p className="text-xs text-muted-foreground">{contractor.specialty}</p>
          </div>
          {contractor.url && (
            <a
              href={contractor.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary underline underline-offset-4"
            >
              Website
            </a>
          )}
        </div>
      ))}
      {hasMore && (
        <p className="text-xs text-muted-foreground">
          + {asset.data.contractors.length - contractors.length} more contractors saved
        </p>
      )}
    </div>
  );
}

function MaterialsAssetPreview({ asset }: { asset: MaterialsPlanAsset }) {
  const materials = asset.data.materials.slice(0, 4);
  const hasMore = asset.data.materials.length > materials.length;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {materials.map((material) => (
          <div key={`${material.material}-${material.supplier}`} className="rounded-xl bg-muted/60 px-3 py-2">
            <p className="font-medium text-foreground">{material.material}</p>
            <p className="text-xs text-muted-foreground">{material.supplier}</p>
            {material.price && <p className="text-xs text-muted-foreground">{material.price}</p>}
          </div>
        ))}
      </div>
      {hasMore && (
        <p className="text-xs text-muted-foreground">
          + {asset.data.materials.length - materials.length} additional materials tracked
        </p>
      )}
    </div>
  );
}

function TimelineAssetPreview({ asset }: { asset: TimelinePlanAsset }) {
  const tasks = asset.data.tasks.slice(0, 4);
  const hasMore = asset.data.tasks.length > tasks.length;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 text-sm">
        {tasks.map((task) => (
          <div key={task.id} className="rounded-xl border border-border/60 px-3 py-2">
            <div className="flex items-center justify-between">
              <p className="font-medium text-foreground">{task.name}</p>
              <span className="text-xs text-muted-foreground">
                Week {task.startWeek} → {task.endWeek}
              </span>
            </div>
            {task.phase && <p className="text-xs text-muted-foreground">Phase: {task.phase}</p>}
            {task.notes && <p className="text-xs text-muted-foreground mt-1">{task.notes}</p>}
          </div>
        ))}
      </div>
      {hasMore && (
        <p className="text-xs text-muted-foreground">+ {asset.data.tasks.length - tasks.length} upcoming tasks</p>
      )}
    </div>
  );
}

function DesignGuideAssetPreview({ asset }: { asset: DesignGuidePlanAsset }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {asset.data.condensedKeywords.slice(0, 6).map((keyword) => (
          <Badge key={keyword} variant="secondary" className="rounded-full px-3 py-1 text-xs">
            {keyword}
          </Badge>
        ))}
      </div>
      <p className="text-sm text-muted-foreground line-clamp-4">{asset.data.longFormGuidance}</p>
      {asset.data.clarifyingQuestions?.length ? (
        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
          {asset.data.clarifyingQuestions.slice(0, 2).map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function GalleryAssetPreview({ asset }: { asset: GalleryPlanAsset }) {
  const thumbnails = asset.data.images.slice(0, 4);
  const hasMore = asset.data.images.length > thumbnails.length;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2">
        {thumbnails.map((image) => (
          <img
            key={image.id}
            src={image.imageUrl}
            alt={image.title || asset.data.query}
            className="h-16 w-full rounded-lg object-cover"
            loading="lazy"
          />
        ))}
      </div>
      {hasMore && (
        <p className="text-xs text-muted-foreground">
          + {asset.data.images.length - thumbnails.length} more inspiration images saved
        </p>
      )}
      {asset.data.summary && <p className="text-sm text-muted-foreground">{asset.data.summary}</p>}
    </div>
  );
}

function buildPlanGroups(planAssets: PlanAsset[]): PlanAssetGroup[] {
  const grouped = new Map<PlanAssetType, PlanAsset[]>();
  planAssets.forEach((asset) => {
    if (!grouped.has(asset.assetType)) {
      grouped.set(asset.assetType, []);
    }
    grouped.get(asset.assetType)!.push(asset);
  });

  return GROUP_RENDER_ORDER.filter((type) => grouped.has(type)).map((type) => ({
    assetType: type,
    label: PLAN_SECTION_METADATA[type].label,
    assets: grouped.get(type)!,
  }));
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
}

function formatAgentLabel(source: string): string {
  const labels: Record<string, string> = {
    "lead-renovation-agent": "Lead agent",
    "design-inspiration-guide-agent": "Design agent",
    "budget-agent": "Budget agent",
    "contractor-agent": "Contractor agent",
    "timeline-agent": "Timeline agent",
    "materials-agent": "Materials agent",
    assistant: "Assistant",
  };
  return labels[source] ?? source;
}

function useCurrencyFormatter() {
  return useMemo(() => {
    const formatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    });
    return (value: number) => formatter.format(value);
  }, []);
}

