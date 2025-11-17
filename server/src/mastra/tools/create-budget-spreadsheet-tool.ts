import { createTool } from '@mastra/core/tools';
import { z } from 'zod';


export const LineItemSchema = z.object({
    category: z.string().describe('Category of the line item'),
    description: z.string().describe('Description of the line item'),
    cost: z.number().describe('Cost of the line item'),
    note: z.string().optional().describe('Optional note for the line item')
});


export type LineItem = z.infer<typeof LineItemSchema>;


export const BudgetSpreadsheetSchema = z.object({
    projectName: z.string().describe('Name of the project'),
    createdAt: z.string().describe('Date when the spreadsheet was created'),
    totalBudget: z.number().describe('Total budget for the project'),
    contingencyAmount: z.number().describe('Contingency amount for the project'),
    lineItems: z.array(LineItemSchema).describe('List of line items in the budget'),
    total: z.number().describe('Total cost of all line items')
});


export type BudgetSpreadsheet = z.infer<typeof BudgetSpreadsheetSchema>;


export const BudgetAgentReplySchema = z.object({
    messageForCustomer: z.string().min(1, 'messageForCustomer must include the narrative response'),
    spreadsheet: BudgetSpreadsheetSchema.optional().nullable(),
});


export type BudgetAgentReply = z.infer<typeof BudgetAgentReplySchema>;


export const generateBudgetSpreadsheet = createTool({
    id: 'generate_budget_spreadsheet',
    description: 'Generates a formatted budget spreadsheet from a structured budget object.',
    inputSchema: z.object({
        project_name: z.string().describe('Name of the project'),
        total_budget: z.number().describe('Total budget for the project'),
        contingency_amount: z.number().describe('Contingency amount for the project'),
        line_items: z.array(LineItemSchema).describe('List of line items in the budget')
    }),
    outputSchema: BudgetSpreadsheetSchema,
    execute: async ({ context }) => {
        const { project_name, total_budget, contingency_amount, line_items } = context;
        const total = line_items.reduce((sum: number, item: LineItem) => sum + item.cost, 0);


        const budgetSpreadsheet: BudgetSpreadsheet = {
            projectName: project_name,
            createdAt: new Date().toISOString(),
            totalBudget: total_budget,
            contingencyAmount: contingency_amount,
            lineItems: line_items,
            total: total
        };


        return budgetSpreadsheet;
    }
})