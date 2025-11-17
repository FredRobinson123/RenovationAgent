import { Download, PoundSterling } from "lucide-react";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import type { BudgetSpreadsheet } from "@/features/chat/types";
import { useMemo, useState } from "react";
import { designSystem } from "@/theme/designSystem";

interface SpreadsheetViewerProps {
  spreadsheet: BudgetSpreadsheet;
  currencyCode?: string;
}

export function SpreadsheetViewer({ spreadsheet, currencyCode = "GBP" }: SpreadsheetViewerProps) {
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

  const handleDownloadCsv = () => {
    try {
      setDownloading(true);

      const rows: (string | number)[][] = [];

      // Header info
      rows.push(["Project", spreadsheet.projectName]);
      rows.push(["Generated At", new Date(spreadsheet.createdAt).toLocaleString()]);
      rows.push([]);

      // Table header
      rows.push(["Category", "Description", "Cost", "Notes"]);

      // Line items
      for (const item of spreadsheet.lineItems) {
        rows.push([
          item.category,
          item.description,
          item.cost,
          item.note ?? "",
        ]);
      }

      rows.push([]);
      rows.push(["Total budget", spreadsheet.totalBudget]);
      rows.push(["Contingency amount", spreadsheet.contingencyAmount]);
      rows.push(["Total (before contingency)", spreadsheet.total]);

      const csvContent = rows
        .map((row) =>
          row
            .map((field) =>
              `"${String(field).replace(/"/g, '""')}"`
            )
            .join(",")
        )
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${spreadsheet.projectName || "renovation-budget"}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
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
    <Card
      className="w-full max-w-5xl mx-auto bg-bubble-user border-bubble-user-border text-charcoal-taupe"
      data-testid="card-spreadsheet"
    >
      <CardHeader className="bg-bubble-user border-b border-bubble-user-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="font-playful text-2xl flex items-center gap-2">
              <PoundSterling className="h-5 w-5" />
              {spreadsheet.projectName}
            </CardTitle>
            <CardDescription className="mt-1 text-charcoal-taupe/80">
              Generated {new Date(spreadsheet.createdAt).toLocaleString()}
            </CardDescription>
          </div>
          
          {/* Download button */}
          <div className="flex">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadCsv}
              disabled={downloading}
              data-testid="button-download-csv"
              className="gap-2 ml-auto"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6" style={{ padding: designSystem.spacing.widgetPadding, paddingTop: 0 }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summaryStats.map((stat) => (
            <div
              key={stat.label}
              className="p-4 rounded-xl border border-bubble-user-border bg-bubble-user"
            >
              <p className="text-sm text-charcoal-taupe/80">{stat.label}</p>
              <p className="text-2xl font-semibold mt-2 text-charcoal-taupe">
                {stat.value}
              </p>
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
                  <td className="px-4 py-3 text-sm text-charcoal-taupe">
                    {row.note || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-bubble-agent/70 font-semibold sticky bottom-0 text-bubble-agent-foreground">
              <tr>
                <td colSpan={2} className="px-4 py-4 text-right text-base">
                  Total (before contingency):
                </td>
                <td
                  className="px-4 py-4 text-right text-lg font-mono text-charcoal-taupe"
                  data-testid="text-total-estimate"
                >
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

