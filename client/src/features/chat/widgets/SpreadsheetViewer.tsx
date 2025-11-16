import { Download, PoundSterling } from "lucide-react";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import type { BudgetSpreadsheet } from "@/features/chat/types";
import { useMemo, useState } from "react";
import { designSystem } from "@/theme/designSystem";

interface SpreadsheetViewerProps {
  spreadsheet: BudgetSpreadsheet;
  onDownload?: (format: "csv" | "excel") => void;
  currencyCode?: string;
}

export function SpreadsheetViewer({ spreadsheet, onDownload, currencyCode = "USD" }: SpreadsheetViewerProps) {
  const [downloading, setDownloading] = useState(false);
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 0,
      }),
    [currencyCode]
  );

  const handleDownload = async (format: "csv" | "excel") => {
    setDownloading(true);
    await onDownload?.(format);
    setDownloading(false);
  };

  const summaryStats = [
    {
      label: "Total Estimated Cost",
      value: currencyFormatter.format(spreadsheet.total),
    },
    {
      label: "Total Budget",
      value: currencyFormatter.format(spreadsheet.totalBudget),
    },
    {
      label: "Contingency",
      value: currencyFormatter.format(spreadsheet.contingencyAmount),
    },
  ];

  return (
    <Card className="w-full max-w-5xl mx-auto bg-widget/5 border-widget-border" data-testid="card-spreadsheet">
      <CardHeader className="bg-widget/15 border-b border-widget-border text-widget-foreground">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="font-playful text-2xl flex items-center gap-2 text-widget-foreground">
              <PoundSterling className="h-5 w-5" />
              {spreadsheet.projectName}
            </CardTitle>
            <CardDescription className="mt-1 text-widget-foreground/80">
              Generated {new Date(spreadsheet.createdAt).toLocaleString()}
            </CardDescription>
          </div>
          
          {/* Download buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload("csv")}
              disabled={downloading}
              data-testid="button-download-csv"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload("excel")}
              disabled={downloading}
              data-testid="button-download-excel"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6" style={{ padding: designSystem.spacing.widgetPadding, paddingTop: 0 }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summaryStats.map((stat) => (
            <div key={stat.label} className="p-4 rounded-xl border border-widget-border/60 bg-soft-linen shadow-inner">
              <p className="text-sm text-charcoal-taupe/80">{stat.label}</p>
              <p className="text-2xl font-semibold mt-2 text-charcoal-taupe">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-bubble-agent sticky top-0 text-bubble-agent-foreground">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-bubble-agent-foreground">Category</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-bubble-agent-foreground">Description</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-bubble-agent-foreground">Cost</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-bubble-agent-foreground">Notes</th>
              </tr>
            </thead>
            <tbody>
              {spreadsheet.lineItems.map((row, index) => (
                <tr
                  key={index}
                  className="border-b border-border hover-elevate"
                  data-testid={`row-spreadsheet-${index}`}
                >
                  <td className="px-4 py-3 text-sm font-medium">{row.category}</td>
                  <td className="px-4 py-3 text-sm">{row.description}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono font-semibold">
                    {currencyFormatter.format(row.cost)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{row.note || "—"}</td>
                </tr>
              ))}
            </tbody>
              <tfoot className="bg-bubble-agent/70 font-semibold sticky bottom-0 text-bubble-agent-foreground">
              <tr>
                <td colSpan={2} className="px-4 py-4 text-right text-base">
                  Total (before contingency):
                </td>
                  <td className="px-4 py-4 text-right text-lg font-mono text-widget-foreground" data-testid="text-total-estimate">
                  {currencyFormatter.format(spreadsheet.total)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

