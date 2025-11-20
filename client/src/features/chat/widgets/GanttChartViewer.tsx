import { useMemo, useState } from "react";
import { CalendarClock, Download } from "lucide-react";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import type { GanttChart } from "@features/chat/types";
import { designSystem } from "@/theme/designSystem";

interface GanttChartViewerProps {
  chart: GanttChart;
}

export function GanttChartViewer({ chart }: GanttChartViewerProps) {
  const [downloading, setDownloading] = useState(false);
  const tasks = useMemo(
    () => [...chart.tasks].sort((a, b) => a.startWeek - b.startWeek),
    [chart.tasks]
  );

  const totalWeeks = useMemo(() => {
    const lastWeek = tasks.reduce((max, task) => Math.max(max, task.endWeek), chart.startingWeek);
    return lastWeek - chart.startingWeek + 1;
  }, [tasks, chart.startingWeek]);

  const handleDownloadCsv = () => {
    try {
      setDownloading(true);

      const rows: (string | number)[][] = [];
      rows.push(["Project", chart.projectName]);
      rows.push(["Starting Week", chart.startingWeek]);
      rows.push(["Generated At", new Date(chart.createdAt).toLocaleString()]);
      rows.push([]);
      rows.push([
        "Task",
        "Phase",
        "Start Week",
        "End Week",
        "Duration (weeks)",
        "Status",
        "Dependencies",
        "Notes",
      ]);

      for (const task of tasks) {
        rows.push([
          task.name,
          task.phase ?? "",
          task.startWeek,
          task.endWeek,
          task.durationWeeks,
          task.status ?? "",
          Array.isArray(task.dependencies) ? task.dependencies.join(" → ") : "",
          task.notes ?? "",
        ]);
      }

      const csvContent = rows
        .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${chart.projectName || "project-timeline"}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
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
                <th className="px-4 py-3 text-left font-semibold">Phase</th>
                <th className="px-4 py-3 text-left font-semibold">Start</th>
                <th className="px-4 py-3 text-left font-semibold">End</th>
                <th className="px-4 py-3 text-left font-semibold">Duration</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  className="border-b border-border/60 bg-bubble-agent text-bubble-agent-foreground"
                >
                  <td className="px-4 py-3 font-medium">{task.name}</td>
                  <td className="px-4 py-3">{task.phase ?? "—"}</td>
                  <td className="px-4 py-3">Week {task.startWeek}</td>
                  <td className="px-4 py-3">Week {task.endWeek}</td>
                  <td className="px-4 py-3">{task.durationWeeks} wk</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass(
                        task.status
                      )}`}
                    >
                      {task.status ?? "planned"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-bubble-agent-foreground/80">
                    {task.notes ?? "—"}
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

