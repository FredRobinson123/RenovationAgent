import { useMemo, useState } from "react";
import { Download, Package } from "lucide-react";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import type { MaterialsSpreadsheet } from "@features/chat/types";
import { designSystem } from "@/theme/designSystem";

interface MaterialsSpreadsheetViewerProps {
  spreadsheet: MaterialsSpreadsheet;
}

export function MaterialsSpreadsheetViewer({ spreadsheet }: MaterialsSpreadsheetViewerProps) {
  const [downloading, setDownloading] = useState(false);

  const sortedMaterials = useMemo(() => {
    return [...spreadsheet.materials].sort((a, b) =>
      a.material.localeCompare(b.material, undefined, { sensitivity: "base" })
    );
  }, [spreadsheet.materials]);

  const handleDownloadCsv = () => {
    try {
      setDownloading(true);

      const rows: (string | number)[][] = [];

      rows.push(["Project", spreadsheet.projectName]);
      rows.push(["Created At", new Date(spreadsheet.createdAt).toLocaleString()]);
      rows.push([]);
      rows.push(["Material", "Supplier", "Website", "Price", "Notes"]);

      for (const material of sortedMaterials) {
        rows.push([
          material.material,
          material.vendor,
          material.website ?? "",
          material.notes ?? "",
        ]);
      }

      const csvContent = rows
        .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${spreadsheet.projectName || "materials-shortlist"}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
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
            <CardDescription className="mt-1 text-charcoal-taupe/70">
              {spreadsheet.location}
            </CardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCsv}
            disabled={downloading}
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
          paddingTop: designSystem.spacing.widgetPadding / 2,
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bubble-agent text-bubble-agent-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Material</th>
                <th className="px-4 py-3 text-left font-semibold">Vendor</th>
                <th className="px-4 py-3 text-left font-semibold">Location</th>
                <th className="px-4 py-3 text-left font-semibold">Website</th>
                <th className="px-4 py-3 text-left font-semibold">Price / Range</th>
                <th className="px-4 py-3 text-left font-semibold">Lead Time</th>
                <th className="px-4 py-3 text-left font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {sortedMaterials.map((material, index) => (
                <tr
                  key={`${material.vendor}-${material.material}-${index}`}
                  className="border-b border-border/60 bg-bubble-user text-charcoal-taupe"
                >
                  <td className="px-4 py-3 font-medium">{material.material}</td>
                  <td className="px-4 py-3">{material.vendor}</td>
                  <td className="px-4 py-3">{material.location}</td>
                  <td className="px-4 py-3">
                    {material.website ? (
                      <a
                        href={material.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        Website
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">{material.indicativePrice ?? "—"}</td>
                  <td className="px-4 py-3">{material.leadTime ?? "—"}</td>
                  <td className="px-4 py-3 text-charcoal-taupe/80">{material.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

