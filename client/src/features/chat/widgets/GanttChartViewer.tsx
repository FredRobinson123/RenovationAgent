import { useMemo } from "react";
import { CalendarClock, Download } from "lucide-react";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import type { GanttChart } from "@features/chat/types";
import { designSystem } from "@/theme/designSystem";
import { useCsvDownload } from "@shared/hooks/useCsvDownload";

interface GanttChartViewerProps {
  chart: GanttChart;
}

export function GanttChartViewer({ chart }: GanttChartViewerProps) {
  const { isDownloading, download } = useCsvDownload({ defaultFilename: "project-timeline" });
  const tasks = useMemo(
    () => [...chart.tasks].sort((a, b) => a.startWeek - b.startWeek),
    [chart.tasks]
  );

  const totalWeeks = useMemo(() => {
    const lastWeek = tasks.reduce((max, task) => Math.max(max, task.endWeek), chart.startingWeek);
    return lastWeek - chart.startingWeek + 1;
  }, [tasks, chart.startingWeek]);

  const handleDownloadCsv = () => {
    const rows: (string | number)[][] = [
      ["Project", chart.projectName],
      ["Generated At", new Date(chart.createdAt).toLocaleString()],
      [],
      [
        "Task",
        "Start Week",
        "End Week",
        "Duration (weeks)",
      ],
      ...tasks.map<(string | number)[]>((task) => [
        task.name,
        task.startWeek,
        task.endWeek,
        task.durationWeeks,
      ]),
    ];

    download(rows, { filename: chart.projectName || "project-timeline" });
  };

  const statusClass = (status?: string) => {
    switch (status) {
      case "complete":
        return "bg-emerald-600/20 text-emerald-700";
      case "in-progress":
        return "bg-primary/20 text-primary";
      case "blocked":
        return "bg-rose-600/20 text-rose-600";
      case "planned":
      default:
        return "bg-slate-200 text-slate-700";
    }
  };

  return (
    <Card
      className="w-full max-w-5xl mx-auto bg-bubble-agent border-bubble-agent-border text-bubble-agent-foreground"
      data-testid="card-gantt-chart"
    >
      <CardHeader className="bg-bubble-agent border-b border-bubble-agent-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="font-playful text-2xl flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              {chart.projectName}
            </CardTitle>
            <CardDescription className="mt-1 text-bubble-agent-foreground/70">
              {`Starts week ${chart.startingWeek} · ${totalWeeks} week plan`}
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3 rounded-lg border border-bubble-agent-border bg-bubble-agent/80">
            <p className="text-xs uppercase tracking-wide text-bubble-agent-foreground/70">
              Total duration
            </p>
            <p className="text-xl font-semibold">{totalWeeks} weeks</p>
          </div>
          <div className="p-3 rounded-lg border border-bubble-agent-border bg-bubble-agent/80">
            <p className="text-xs uppercase tracking-wide text-bubble-agent-foreground/70">
              Phases
            </p>
            <p className="text-xl font-semibold">
              {new Set(tasks.map((task) => task.phase || "Uncategorized")).size}
            </p>
          </div>
          <div className="p-3 rounded-lg border border-bubble-agent-border bg-bubble-agent/80">
            <p className="text-xs uppercase tracking-wide text-bubble-agent-foreground/70">
              Tasks
            </p>
            <p className="text-xl font-semibold">{tasks.length}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bubble-user text-charcoal-taupe">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Task</th>
                <th className="px-4 py-3 text-left font-semibold">Start week</th>
                <th className="px-4 py-3 text-left font-semibold">End week</th>
                <th className="px-4 py-3 text-left font-semibold">Duration (weeks)</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  className="border-b border-border/60 bg-bubble-agent text-bubble-agent-foreground"
                >
                  <td className="px-4 py-3 font-medium">{task.name}</td>
                  <td className="px-4 py-3">Week {task.startWeek}</td>
                  <td className="px-4 py-3">Week {task.endWeek}</td>
                  <td className="px-4 py-3">{task.durationWeeks} wk</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

