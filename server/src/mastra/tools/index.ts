import { designWebSearch } from './design-web-search-tool.js';
import { contractorWebSearch } from './contractor-web-search-tool.js';
import { materialsWebSearch } from './materials-web-search-tool.js';
import { timelineWebSearch } from './timeline-web-search-tool.js';
import { generateBudgetSpreadsheet } from './create-budget-spreadsheet-tool.js';
import { generateContractorSpreadsheet } from './contractor-spreadsheet-tool.js';
import { generateMaterialsSpreadsheet } from './materials-spreadsheet-tool.js';
import { generateGanttChart } from './gantt-chart-tool.js';
import {
    callBudgetSubAgentTool,
    callContractorSubAgentTool,
    callDesignInspirationSubAgentTool,
    callMaterialsSubAgentTool,
    callTimelineSubAgentTool,
} from './subagent-tools.js';

export const tools = {
    designWebSearch,
    contractorWebSearch,
    materialsWebSearch,
    timelineWebSearch,
    generateBudgetSpreadsheet,
    generateContractorSpreadsheet,
    generateMaterialsSpreadsheet,
    generateGanttChart,
    callBudgetSubAgentTool,
    callContractorSubAgentTool,
    callDesignInspirationSubAgentTool,
    callMaterialsSubAgentTool,
    callTimelineSubAgentTool,
};

export {
    designWebSearch,
    contractorWebSearch,
    materialsWebSearch,
    timelineWebSearch,
    generateBudgetSpreadsheet,
    generateContractorSpreadsheet,
    generateMaterialsSpreadsheet,
    generateGanttChart,
    callBudgetSubAgentTool,
    callContractorSubAgentTool,
    callDesignInspirationSubAgentTool,
    callMaterialsSubAgentTool,
    callTimelineSubAgentTool,
};