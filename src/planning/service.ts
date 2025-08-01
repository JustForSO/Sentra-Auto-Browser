import { BaseLLM } from '../llm/base';
import { DOMState, Action, PlanningResult, PlannedStep, RiskAssessment, Risk } from '../types';
import { logger } from '../utils/logger';
import { MemoryService } from '../memory/service';

export class PlanningService {
  private llm: BaseLLM;
  private memoryService?: MemoryService;

  constructor(llm: BaseLLM, memoryService?: MemoryService) {
    this.llm = llm;
    this.memoryService = memoryService;
  }

  async createPlan(
    task: string,
    currentDOMState: DOMState,
    maxSteps: number = 10
  ): Promise<PlanningResult> {
    try {
      logger.info('Creating execution plan...', 'PlanningService');

      // Get relevant memories if available
      const relevantMemories = await this.getRelevantMemories(task);
      
      // Generate plan using LLM
      const planPrompt = this.buildPlanningPrompt(task, currentDOMState, relevantMemories, maxSteps);
      const response = await this.llm.generateResponse([
        { role: 'system', content: this.getPlanningSystemPrompt() },
        { role: 'user', content: planPrompt }
      ]);

      // Parse the plan response
      const planData = this.parsePlanResponse(response.content);
      
      // Assess risks
      const riskAssessment = await this.assessRisks(planData.steps, currentDOMState);
      
      // Generate alternatives
      const alternatives = await this.generateAlternatives(planData.steps, currentDOMState);

      const result: PlanningResult = {
        plan: planData.steps,
        confidence: planData.confidence,
        estimatedDuration: planData.estimatedDuration,
        riskAssessment,
        alternatives,
      };

      logger.info(`Plan created with ${result.plan.length} steps, confidence: ${result.confidence}`, 'PlanningService');
      
      // Store plan in memory
      if (this.memoryService) {
        await this.memoryService.addPlanMemory(
          `Plan for: ${task}. ${result.plan.length} steps, confidence: ${result.confidence}`,
          0
        );
      }

      return result;
    } catch (error) {
      logger.error('Failed to create plan', error as Error, 'PlanningService');
      throw error;
    }
  }

  async updatePlan(
    originalPlan: PlanningResult,
    currentStep: number,
    currentDOMState: DOMState,
    lastActionResult?: { success: boolean; error?: string }
  ): Promise<PlanningResult> {
    try {
      logger.info(`Updating plan from step ${currentStep}`, 'PlanningService');

      // If last action failed, we need to replan
      if (lastActionResult && !lastActionResult.success) {
        logger.warn('Last action failed, replanning...', 'PlanningService');
        
        // Get remaining task description
        const remainingSteps = originalPlan.plan.slice(currentStep);
        const remainingTask = remainingSteps.map(s => s.description).join('; ');
        
        return this.createPlan(remainingTask, currentDOMState, remainingSteps.length + 2);
      }

      // Otherwise, just update confidence and risks based on current state
      const updatedPlan = { ...originalPlan };
      
      // Update confidence based on progress
      const progressRatio = currentStep / originalPlan.plan.length;
      updatedPlan.confidence = Math.min(1.0, originalPlan.confidence + progressRatio * 0.1);
      
      // Re-assess risks for remaining steps
      const remainingSteps = originalPlan.plan.slice(currentStep);
      updatedPlan.riskAssessment = await this.assessRisks(remainingSteps, currentDOMState);

      return updatedPlan;
    } catch (error) {
      logger.error('Failed to update plan', error as Error, 'PlanningService');
      return originalPlan; // Return original plan if update fails
    }
  }

  private async getRelevantMemories(task: string): Promise<string> {
    if (!this.memoryService) return '';

    try {
      const memories = await this.memoryService.searchMemories({
        query: task,
        limit: 5,
        minConfidence: 0.3,
      });

      if (memories.length === 0) return '';

      return 'Relevant past experiences:\n' + 
        memories.map(m => `- ${m.entry.content}`).join('\n');
    } catch (error) {
      logger.warn('Failed to retrieve memories for planning', 'PlanningService');
      return '';
    }
  }

  private buildPlanningPrompt(
    task: string,
    domState: DOMState,
    memories: string,
    maxSteps: number
  ): string {
    return `Task: ${task}

Current page: ${domState.title} (${domState.url})

Available elements:
${domState.elements.slice(0, 20).map((el, i) => 
  `${i}. ${el.tag} - "${el.text}" (${el.xpath})`
).join('\n')}

${memories}

Please create a detailed execution plan with the following format:
{
  "steps": [
    {
      "stepNumber": 1,
      "action": {"type": "click", "index": 0},
      "description": "Click on the search button",
      "expectedOutcome": "Search form should appear",
      "confidence": 0.9,
      "alternatives": [{"type": "key_press", "key": "Enter"}]
    }
  ],
  "confidence": 0.85,
  "estimatedDuration": 30
}

Requirements:
- Maximum ${maxSteps} steps
- Each step should have a clear action and expected outcome
- Include confidence scores (0-1)
- Provide alternative actions where possible
- Estimate total duration in seconds
- Focus on the most reliable elements and actions`;
  }

  private getPlanningSystemPrompt(): string {
    return `You are an expert web automation planner. Your job is to create detailed, reliable execution plans for web automation tasks.

Key principles:
1. Break down complex tasks into simple, atomic actions
2. Always verify element availability before planning actions
3. Include fallback strategies for critical steps
4. Estimate realistic timeframes
5. Prioritize reliable selectors and common interaction patterns
6. Consider potential failure points and plan accordingly

Available actions:
- click: Click on elements
- type: Enter text into input fields
- navigate: Go to URLs
- scroll: Scroll the page
- wait: Wait for specified time
- hover: Hover over elements
- key_press: Press keyboard keys
- select: Select from dropdown
- wait_for_element: Wait for element to appear
- take_screenshot: Capture page state

Respond with valid JSON only.`;
  }

  private parsePlanResponse(response: string): {
    steps: PlannedStep[];
    confidence: number;
    estimatedDuration: number;
  } {
    try {
      const parsed = JSON.parse(response);
      
      return {
        steps: parsed.steps || [],
        confidence: parsed.confidence || 0.5,
        estimatedDuration: parsed.estimatedDuration || 60,
      };
    } catch (error) {
      logger.error('Failed to parse plan response', error as Error, 'PlanningService');
      
      // Return a basic fallback plan
      return {
        steps: [],
        confidence: 0.1,
        estimatedDuration: 60,
      };
    }
  }

  private async assessRisks(steps: PlannedStep[], domState: DOMState): Promise<RiskAssessment> {
    const risks: Risk[] = [];
    
    // Check for element availability risks
    for (const step of steps) {
      if ('index' in step.action) {
        const elementIndex = step.action.index as number;
        if (elementIndex >= domState.elements.length) {
          risks.push({
            type: 'element_not_found',
            probability: 0.8,
            impact: 'high',
            description: `Element at index ${elementIndex} may not exist`,
            mitigation: 'Use xpath selector or wait for element',
          });
        }
      }
    }

    // Check for network-dependent actions
    const networkActions = steps.filter(s => s.action.type === 'navigate');
    if (networkActions.length > 0) {
      risks.push({
        type: 'network_error',
        probability: 0.2,
        impact: 'medium',
        description: 'Network requests may fail or timeout',
        mitigation: 'Implement retry logic and timeout handling',
      });
    }

    // Check for timing-sensitive actions
    const hasWaitActions = steps.some(s => s.action.type === 'wait' || s.action.type === 'wait_for_element');
    if (!hasWaitActions && steps.length > 3) {
      risks.push({
        type: 'timeout',
        probability: 0.4,
        impact: 'medium',
        description: 'Actions may execute too quickly for page to respond',
        mitigation: 'Add wait actions between critical steps',
      });
    }

    // Determine overall risk level
    const highRiskCount = risks.filter(r => r.impact === 'high').length;
    const mediumRiskCount = risks.filter(r => r.impact === 'medium').length;
    
    let overallRisk: 'low' | 'medium' | 'high' = 'low';
    if (highRiskCount > 0) {
      overallRisk = 'high';
    } else if (mediumRiskCount > 1) {
      overallRisk = 'medium';
    }

    return {
      overallRisk,
      risks,
      mitigations: risks.map(r => r.mitigation).filter(Boolean) as string[],
    };
  }

  private async generateAlternatives(
    steps: PlannedStep[],
    domState: DOMState
  ): Promise<PlannedStep[][]> {
    // Generate one alternative plan by modifying high-risk steps
    const alternative: PlannedStep[] = steps.map(step => {
      // For click actions, try to provide xpath alternative
      if (step.action.type === 'click' && 'index' in step.action) {
        const elementIndex = step.action.index as number;
        const element = domState.elements[elementIndex];
        
        if (element) {
          return {
            ...step,
            action: {
              type: 'click',
              index: elementIndex,
              xpath: element.xpath,
            },
          };
        }
      }
      
      return step;
    });

    return [alternative];
  }
}
