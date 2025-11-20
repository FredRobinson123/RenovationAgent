import { useMemo } from "react";
import { Download, MapPin } from "lucide-react";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import type { ContractorSpreadsheet } from "@features/chat/types";
import { designSystem } from "@/theme/designSystem";
import { useCsvDownload } from "@shared/hooks/useCsvDownload";

interface ContractorSpreadsheetViewerProps {
  spreadsheet: ContractorSpreadsheet;
}

export function ContractorSpreadsheetViewer({ spreadsheet }: ContractorSpreadsheetViewerProps) {
  const { isDownloading, download } = useCsvDownload({ defaultFilename: "contractor-shortlist" });

  const sortedContractors = useMemo(() => {
    return [...spreadsheet.contractors].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
  }, [spreadsheet.contractors]);

  const handleDownloadCsv = () => {
    const rows: (string | number)[][] = [
      ["Project", spreadsheet.projectName],
      ["Generated At", new Date(spreadsheet.createdAt).toLocaleString()],
      [],
      ["Name", "Specialty", "URL"],
      ...sortedContractors.map<(string | number)[]>((contractor) => [
        contractor.name,
        contractor.specialty,
        contractor.url ?? "",
      ]),
    ];

    download(rows, { filename: spreadsheet.projectName || "contractor-shortlist" });
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
              Shortlist of potential contractors
            </CardDescription>
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
            <thead className="bg-bubble-user text-charcoal-taupe">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Specialty</th>
                <th className="px-4 py-3 text-left font-semibold">URL</th>
              </tr>
            </thead>
            <tbody>
              {sortedContractors.map((contractor, index) => (
                <tr
                  key={`${contractor.name}-${index}`}
                  className="border-b border-border/60 bg-bubble-agent text-bubble-agent-foreground"
                >
                  <td className="px-4 py-3 font-medium">{contractor.name}</td>
                  <td className="px-4 py-3">{contractor.specialty}</td>
                  <td className="px-4 py-3">
                    {contractor.url ? (
                      <a
                        href={contractor.url}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

