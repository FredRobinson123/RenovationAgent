import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const TaskStatusEnum = z.enum(['planned', 'in-progress', 'blocked', 'complete']);

export const GanttTaskInputSchema = z.object({
  id: z.string().describe('Unique identifier for the task'),
  name: z.string().describe('Short label for the task or phase'),
  phase: z.string().optional().describe('Optional higher-level phase grouping'),
  durationWeeks: z
    .number()
    .int()
    .min(1, 'Each task must span at least one week.')
    .describe('Duration of the task in weeks'),
  startWeek: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Desired starting week (defaults to sequential scheduling)'),
  status: TaskStatusEnum.optional().describe('Current status of the task'),
  dependencies: z.array(z.string()).optional().describe('IDs of tasks that must finish first'),
  notes: z.string().optional().describe('Additional detail or reminders'),
});

export const GanttTaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  phase: z.string().optional(),
  startWeek: z.number().int().min(1),
  endWeek: z.number().int().min(1),
  durationWeeks: z.number().int().min(1),
  status: TaskStatusEnum.optional(),
  dependencies: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export type GanttTask = z.infer<typeof GanttTaskSchema>;

export const GanttChartSchema = z.object({
  projectName: z.string().describe('Name of the renovation plan'),
  startingWeek: z.number().int().min(1).describe('Week number that kicks off the plan (usually 1)'),
  createdAt: z.string().describe('Timestamp of when the chart was generated'),
  tasks: z.array(GanttTaskSchema).describe('Sequenced list of tasks covering the project scope'),
});

export type GanttChart = z.infer<typeof GanttChartSchema>;

export const generateGanttChart = createTool({
  id: 'generate_gantt_chart',
  description:
    'Generates a weeks-based GANTT chart that sequences renovation tasks with clear start/end weeks.',
  inputSchema: z.object({
    project_name: z.string().describe('Name of the renovation plan'),
    starting_week: z.number().int().min(1).default(1).describe('Week number to start from'),
    tasks: z
      .array(GanttTaskInputSchema)
      .min(1, 'Provide at least one task to build a GANTT chart.'),
  }),
  outputSchema: GanttChartSchema,
  execute: async ({ context }) => {
    const { project_name, starting_week = 1, tasks } = context;

    let rollingWeek = starting_week;
    const normalizedTasks: GanttTask[] = tasks.map((task) => {
      const duration = Math.max(1, task.durationWeeks);
      const startWeek = task.startWeek ?? rollingWeek;
      const endWeek = startWeek + duration - 1;
      rollingWeek = Math.max(rollingWeek, endWeek + 1);

      return {
        id: task.id,
        name: task.name,
        phase: task.phase,
        startWeek,
        endWeek,
        durationWeeks: duration,
        status: task.status,
        dependencies: task.dependencies,
        notes: task.notes,
      };
    });

    return {
      projectName: project_name,
      startingWeek: starting_week,
      createdAt: new Date().toISOString(),
      tasks: normalizedTasks,
    };
  },
});

