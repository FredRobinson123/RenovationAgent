import { useMemo } from "react";
import { Download, Package } from "lucide-react";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import type { MaterialsSpreadsheet } from "@features/chat/types";
import { designSystem } from "@/theme/designSystem";
import { useCsvDownload } from "@shared/hooks/useCsvDownload";

interface MaterialsSpreadsheetViewerProps {
  spreadsheet: MaterialsSpreadsheet;
}

export function MaterialsSpreadsheetViewer({ spreadsheet }: MaterialsSpreadsheetViewerProps) {
  const { isDownloading, download } = useCsvDownload({ defaultFilename: "materials-shortlist" });

  const sortedMaterials = useMemo(() => {
    return [...spreadsheet.materials].sort((a, b) =>
      a.material.localeCompare(b.material, undefined, { sensitivity: "base" })
    );
  }, [spreadsheet.materials]);

  const handleDownloadCsv = () => {
    const rows: (string | number)[][] = [
      ["Project", spreadsheet.projectName],
      ["Created At", new Date(spreadsheet.createdAt).toLocaleString()],
      [],
      ["Material", "Supplier", "Price", "URL"],
      ...sortedMaterials.map<(string | number)[]>((material) => [
        material.material,
        material.supplier,
        material.price ?? "",
        material.url ?? "",
      ]),
    ];

    download(rows, { filename: spreadsheet.projectName || "materials-shortlist" });
  };

  return (
    <Card
      className="w-full max-w-5xl mx-auto bg-bubble-user text-charcoal-taupe border-bubble-user-border"
      data-testid="card-materials-spreadsheet"
    >
      <CardHeader className="bg-bubble-user border-b border-bubble-user-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="font-playful text-2xl flex items-center gap-2">
              <Package className="h-5 w-5" />
              Materials sourcing
            </CardTitle>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCsv}
            disabled={isDownloading}
            className="gap-2 ml-auto"
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent
        className="space-y-4"
        style={{
          padding: designSystem.spacing.widgetPadding,
          paddingTop: `calc(${designSystem.spacing.widgetPadding} / 2)`,
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bubble-agent text-bubble-agent-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Material</th>
                <th className="px-4 py-3 text-left font-semibold">Supplier</th>
                <th className="px-4 py-3 text-left font-semibold">Price</th>
                <th className="px-4 py-3 text-left font-semibold">URL</th>
              </tr>
            </thead>
            <tbody>
              {sortedMaterials.map((material, index) => (
                <tr
                  key={`${material.supplier}-${material.material}-${index}`}
                  className="border-b border-border/60 bg-bubble-user text-charcoal-taupe"
                >
                  <td className="px-4 py-3 font-medium">{material.material}</td>
                  <td className="px-4 py-3">{material.supplier}</td>
                  <td className="px-4 py-3">{material.price ?? "—"}</td>
                  <td className="px-4 py-3">
                    {material.url ? (
                      <a
                        href={material.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        Link
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

