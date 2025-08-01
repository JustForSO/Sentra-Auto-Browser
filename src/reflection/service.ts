import { BaseLLM } from '../llm/base';
import { AgentStep, ReflectionResult, DOMState, Action } from '../types';
import { logger } from '../utils/logger';
import { MemoryService } from '../memory/service';

export class ReflectionService {
  private llm: BaseLLM;
  private memoryService?: MemoryService;

  constructor(llm: BaseLLM, memoryService?: MemoryService) {
    this.llm = llm;
    this.memoryService = memoryService;
  }

  async reflect(
    task: string,
    recentSteps: AgentStep[],
    currentDOMState: DOMState,
    stepNumber: number
  ): Promise<ReflectionResult> {
    try {
      logger.info(`Performing reflection at step ${stepNumber}`, 'ReflectionService');

      const reflectionPrompt = this.buildReflectionPrompt(task, recentSteps, currentDOMState);
      
      const response = await this.llm.generateResponse([
        { role: 'system', content: this.getReflectionSystemPrompt() },
        { role: 'user', content: reflectionPrompt }
      ]);

      const reflection = this.parseReflectionResponse(response.content, stepNumber);
      
      // Store reflection in memory
      if (this.memoryService) {
        await this.memoryService.addReflectionMemory(reflection.analysis, stepNumber);
      }

      logger.info(`Reflection completed: confidence ${reflection.confidence}, continue: ${reflection.shouldContinue}`, 'ReflectionService');
      
      return reflection;
    } catch (error) {
      logger.error('Failed to perform reflection', error as Error, 'ReflectionService');
      
      // Return a basic reflection if the process fails
      return {
        stepNumber,
        analysis: 'Reflection failed, continuing with current approach',
        improvements: [],
        confidence: 0.5,
        shouldContinue: true,
      };
    }
  }

  async analyzeProgress(
    task: string,
    allSteps: AgentStep[],
    currentDOMState: DOMState
  ): Promise<{
    progressPercentage: number;
    isOnTrack: boolean;
    recommendations: string[];
    estimatedRemainingSteps: number;
  }> {
    try {
      const progressPrompt = this.buildProgressAnalysisPrompt(task, allSteps, currentDOMState);
      
      const response = await this.llm.generateResponse([
        { role: 'system', content: this.getProgressAnalysisSystemPrompt() },
        { role: 'user', content: progressPrompt }
      ]);

      return this.parseProgressResponse(response.content);
    } catch (error) {
      logger.error('Failed to analyze progress', error as Error, 'ReflectionService');
      
      return {
        progressPercentage: 50,
        isOnTrack: true,
        recommendations: ['Continue with current approach'],
        estimatedRemainingSteps: 5,
      };
    }
  }

  async identifyPatterns(steps: AgentStep[]): Promise<{
    successPatterns: string[];
    failurePatterns: string[];
    recommendations: string[];
  }> {
    const successfulSteps = steps.filter(s => s.result.success);
    const failedSteps = steps.filter(s => !s.result.success);

    const successPatterns: string[] = [];
    const failurePatterns: string[] = [];
    const recommendations: string[] = [];

    // Analyze successful patterns
    if (successfulSteps.length > 0) {
      const actionTypes = successfulSteps.map(s => s.action.type);
      const mostSuccessfulAction = this.getMostFrequent(actionTypes);
      if (mostSuccessfulAction) {
        successPatterns.push(`${mostSuccessfulAction} actions are most successful`);
      }

      // Check for timing patterns
      const avgSuccessTime = successfulSteps.reduce((sum, s) => 
        sum + (s.result.metadata?.duration || 0), 0) / successfulSteps.length;
      if (avgSuccessTime > 0) {
        successPatterns.push(`Successful actions average ${avgSuccessTime.toFixed(2)}s execution time`);
      }
    }

    // Analyze failure patterns
    if (failedSteps.length > 0) {
      const failureReasons = failedSteps.map(s => s.result.error || 'unknown');
      const mostCommonError = this.getMostFrequent(failureReasons);
      if (mostCommonError && mostCommonError !== 'unknown') {
        failurePatterns.push(`Most common error: ${mostCommonError}`);
      }

      const failedActionTypes = failedSteps.map(s => s.action.type);
      const mostFailedAction = this.getMostFrequent(failedActionTypes);
      if (mostFailedAction) {
        failurePatterns.push(`${mostFailedAction} actions fail most often`);
        recommendations.push(`Consider alternative approaches for ${mostFailedAction} actions`);
      }
    }

    // Generate recommendations based on patterns
    if (successfulSteps.length > failedSteps.length) {
      recommendations.push('Overall execution is successful, continue current approach');
    } else if (failedSteps.length > successfulSteps.length) {
      recommendations.push('High failure rate detected, consider changing strategy');
    }

    return {
      successPatterns,
      failurePatterns,
      recommendations,
    };
  }

  private buildReflectionPrompt(
    task: string,
    recentSteps: AgentStep[],
    currentDOMState: DOMState
  ): string {
    const stepsDescription = recentSteps.map((step, i) => {
      const action = step.action;
      const result = step.result;
      const status = result.success ? '✓' : '✗';
      
      return `${i + 1}. ${status} ${action.type} - ${result.message || result.error || 'No message'}`;
    }).join('\n');

    return `Task: ${task}

Recent steps taken:
${stepsDescription}

Current page: ${currentDOMState.title} (${currentDOMState.url})
Available elements: ${currentDOMState.elements.length}

Please analyze the progress and provide reflection in this format:
{
  "analysis": "Detailed analysis of what has been accomplished and current state",
  "improvements": ["Specific suggestions for improvement"],
  "confidence": 0.8,
  "shouldContinue": true,
  "suggestedActions": [
    {"type": "click", "index": 0}
  ]
}`;
  }

  private buildProgressAnalysisPrompt(
    task: string,
    allSteps: AgentStep[],
    currentDOMState: DOMState
  ): string {
    const totalSteps = allSteps.length;
    const successfulSteps = allSteps.filter(s => s.result.success).length;
    const failedSteps = totalSteps - successfulSteps;

    return `Task: ${task}

Execution summary:
- Total steps: ${totalSteps}
- Successful: ${successfulSteps}
- Failed: ${failedSteps}
- Current page: ${currentDOMState.title}

Recent actions:
${allSteps.slice(-5).map(s => 
  `${s.action.type} - ${s.result.success ? 'success' : 'failed'}`
).join('\n')}

Analyze progress and respond with:
{
  "progressPercentage": 75,
  "isOnTrack": true,
  "recommendations": ["Continue current approach"],
  "estimatedRemainingSteps": 3
}`;
  }

  private getReflectionSystemPrompt(): string {
    return `You are an expert web automation analyst. Your job is to reflect on the progress of automation tasks and provide insights for improvement.

Analyze the execution steps and current state to determine:
1. What has been accomplished so far
2. Whether the approach is working
3. What could be improved
4. Whether to continue or change strategy
5. Specific next actions if needed

Consider:
- Success/failure patterns
- Element availability and reliability
- Page state changes
- Task completion progress
- Potential obstacles

Respond with valid JSON only.`;
  }

  private getProgressAnalysisSystemPrompt(): string {
    return `You are an expert at analyzing web automation progress. Evaluate how well a task is progressing and provide actionable insights.

Consider:
- Task completion percentage based on actions taken
- Success rate and failure patterns
- Current page state vs. expected state
- Remaining work needed
- Potential roadblocks

Provide realistic assessments and practical recommendations.

Respond with valid JSON only.`;
  }

  private parseReflectionResponse(response: string, stepNumber: number): ReflectionResult {
    try {
      const parsed = JSON.parse(response);
      
      return {
        stepNumber,
        analysis: parsed.analysis || 'No analysis provided',
        improvements: parsed.improvements || [],
        confidence: parsed.confidence || 0.5,
        shouldContinue: parsed.shouldContinue !== false,
        suggestedActions: parsed.suggestedActions || [],
      };
    } catch (error) {
      logger.error('Failed to parse reflection response', error as Error, 'ReflectionService');
      
      return {
        stepNumber,
        analysis: 'Failed to parse reflection, continuing with current approach',
        improvements: [],
        confidence: 0.5,
        shouldContinue: true,
      };
    }
  }

  private parseProgressResponse(response: string): {
    progressPercentage: number;
    isOnTrack: boolean;
    recommendations: string[];
    estimatedRemainingSteps: number;
  } {
    try {
      const parsed = JSON.parse(response);
      
      return {
        progressPercentage: Math.max(0, Math.min(100, parsed.progressPercentage || 50)),
        isOnTrack: parsed.isOnTrack !== false,
        recommendations: parsed.recommendations || [],
        estimatedRemainingSteps: Math.max(0, parsed.estimatedRemainingSteps || 5),
      };
    } catch (error) {
      logger.error('Failed to parse progress response', error as Error, 'ReflectionService');
      
      return {
        progressPercentage: 50,
        isOnTrack: true,
        recommendations: ['Continue with current approach'],
        estimatedRemainingSteps: 5,
      };
    }
  }

  private getMostFrequent<T>(items: T[]): T | null {
    if (items.length === 0) return null;
    
    const frequency: Map<T, number> = new Map();
    
    for (const item of items) {
      frequency.set(item, (frequency.get(item) || 0) + 1);
    }
    
    let maxCount = 0;
    let mostFrequent: T | null = null;
    
    for (const [item, count] of frequency.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = item;
      }
    }
    
    return mostFrequent;
  }
}
