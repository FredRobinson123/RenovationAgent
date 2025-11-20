import { useMemo, useState } from "react";
import { Download, MapPin } from "lucide-react";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import type { ContractorSpreadsheet } from "@features/chat/types";
import { designSystem } from "@/theme/designSystem";

interface ContractorSpreadsheetViewerProps {
  spreadsheet: ContractorSpreadsheet;
}

export function ContractorSpreadsheetViewer({ spreadsheet }: ContractorSpreadsheetViewerProps) {
  const [downloading, setDownloading] = useState(false);

  const sortedContractors = useMemo(() => {
    return [...spreadsheet.contractors].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
  }, [spreadsheet.contractors]);

  const handleDownloadCsv = () => {
    try {
      setDownloading(true);

      const rows: (string | number)[][] = [];

      rows.push(["Project", spreadsheet.projectName]);
      rows.push(["Location", spreadsheet.location]);
      rows.push(["Generated At", new Date(spreadsheet.createdAt).toLocaleString()]);
      rows.push([]);
      rows.push(["Name", "Specialty", "Service Area", "Website", "Contact", "Rating", "Notes"]);

      for (const contractor of sortedContractors) {
        rows.push([
          contractor.name,
          contractor.serviceType,
          contractor.areaServed,
          contractor.website ?? "",
          contractor.contact ?? "",
          contractor.rating ?? "",
          contractor.notes ?? "",
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
        `${spreadsheet.projectName || "contractor-shortlist"}.csv`
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
      className="w-full max-w-5xl mx-auto bg-bubble-agent text-bubble-agent-foreground border-bubble-agent-border"
      data-testid="card-contractor-spreadsheet"
    >
      <CardHeader className="bg-bubble-agent border-b border-bubble-agent-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="font-playful text-2xl flex items-center gap-2">
              Contractor shortlist
            </CardTitle>
            <CardDescription className="mt-1 text-bubble-agent-foreground/70 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
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
            <thead className="bg-bubble-user text-charcoal-taupe">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Specialty</th>
                <th className="px-4 py-3 text-left font-semibold">Service area</th>
                <th className="px-4 py-3 text-left font-semibold">Website</th>
                <th className="px-4 py-3 text-left font-semibold">Contact</th>
                <th className="px-4 py-3 text-left font-semibold">Rating</th>
                <th className="px-4 py-3 text-left font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {sortedContractors.map((contractor, index) => (
                <tr
                  key={`${contractor.name}-${contractor.areaServed}-${index}`}
                  className="border-b border-border/60 bg-bubble-agent text-bubble-agent-foreground"
                >
                  <td className="px-4 py-3 font-medium">{contractor.name}</td>
                  <td className="px-4 py-3">{contractor.serviceType}</td>
                  <td className="px-4 py-3">{contractor.areaServed}</td>
                  <td className="px-4 py-3">
                    {contractor.website ? (
                      <a
                        href={contractor.website}
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
                  <td className="px-4 py-3 whitespace-pre-wrap">
                    {contractor.contact ?? "—"}
                  </td>
                  <td className="px-4 py-3">{contractor.rating ?? "—"}</td>
                  <td className="px-4 py-3 text-bubble-agent-foreground/80">
                    {contractor.notes ?? "—"}
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

