import { AgentStep, AgentOutput, DOMState } from '../types';
import { logger } from '../utils/logger';
import { ElementSemanticAnalyzer } from '../dom/element-semantic-analyzer';

export interface MessageContext {
  task: string;
  stepNumber: number;
  agentHistory: string;
  currentState: string;
  lastResult?: string;
}

export class MessageManager {
  private task: string;
  private maxHistorySteps: number;
  private contextWindow: number;
  private semanticAnalyzer: ElementSemanticAnalyzer;

  constructor(task: string, maxHistorySteps: number = 10, contextWindow: number = 8000) {
    this.task = task;
    this.maxHistorySteps = maxHistorySteps;
    this.contextWindow = contextWindow;
    this.semanticAnalyzer = new ElementSemanticAnalyzer();
  }

  // Format agent history for LLM context
  formatAgentHistory(history: AgentStep[]): string {
    if (history.length === 0) {
      return '<s>Agent initialized</s>\n';
    }

    let historyText = '<s>Agent initialized</s>\n';
    
    // Only include recent steps to manage context window
    const recentSteps = history.slice(-this.maxHistorySteps);
    
    for (const step of recentSteps) {
      historyText += `\n<step_${step.stepNumber}>:\n`;
      
      if (step.agentOutput) {
        historyText += `Evaluation of Previous Step: ${step.agentOutput.evaluation_previous_goal}\n`;
        historyText += `Memory: ${step.agentOutput.memory}\n`;
        historyText += `Next Goal: ${step.agentOutput.next_goal}\n`;
      }
      
      const actionResults = this.formatActionResults(step);
      historyText += `Action Results:\n${actionResults}`;
      
      historyText += '\n</step_' + step.stepNumber + '>\n';
    }

    return historyText;
  }

  private formatActionResults(step: AgentStep): string {
    const action = step.action;
    const result = step.result;

    let actionDescription = '';

    // Format action description
    switch (action.type) {
      case 'navigate':
        actionDescription = `navigate(url="${(action as any).url}")`;
        break;
      case 'click':
        actionDescription = `click(index=${(action as any).index})`;
        break;
      case 'type':
        actionDescription = `type(index=${(action as any).index}, text="${(action as any).text}")`;
        break;
      case 'scroll':
        actionDescription = `scroll(direction="${(action as any).direction}")`;
        break;
      case 'wait':
        actionDescription = `wait(seconds=${(action as any).seconds})`;
        break;
      case 'done':
        actionDescription = `done(message="${(action as any).message}", success=${(action as any).success})`;
        break;
      default:
        actionDescription = `${action.type}()`;
    }

    // Add result status and message
    const status = result.success ? 'SUCCESS' : 'FAILED';
    let resultText = `${actionDescription} - ${status}`;

    if (result.message) {
      resultText += ` - ${result.message}`;
    }

    if (!result.success && result.error) {
      resultText += ` - Error: ${result.error}`;
    }

    return resultText;
  }

  // Format browser state for LLM context
  formatBrowserState(domState: DOMState): string {
    let stateText = `<browser_state>\n`;
    stateText += `Current URL: ${domState.url}\n`;
    stateText += `Page title: ${domState.title}\n\n`;
    stateText += `Interactive Elements:\n`;

    // Limit elements to prevent context overflow
    const maxElements = 50;
    const elements = domState.elements.slice(0, maxElements);

    // Use enhanced formatting with semantic analysis
    const context = { url: domState.url || 'unknown', pageType: 'web' };
    const formattedElements = this.formatElementsForLLM(elements, context);
    stateText += formattedElements + '\n';

    if (domState.elements.length > maxElements) {
      stateText += `... and ${domState.elements.length - maxElements} more elements\n`;
    }

    stateText += `</browser_state>`;

    return stateText;
  }

  /**
   * Format DOM elements for LLM consumption with enhanced semantic analysis
   * Uses intelligent element classification to provide better context to AI
   */
  private formatElementsForLLM(elements: any[], context?: { url: string; pageType?: string }): string {
    const formattedElements = elements.map((el: any, i: number) => {
      // Use element's actual index if available
      const elementIndex = el.index !== undefined ? el.index : i;

      // 🎯 语义分析
      const analysisContext = context || { url: 'unknown' };
      const semanticAnalysis = this.semanticAnalyzer.analyzeElement(el, analysisContext);

      // 获取核心信息
      const text = (el.text || '').trim();
      const semanticInfo = this.formatSemanticInfo(semanticAnalysis);

      // 🎨 构建详细但清晰的元素描述
      let elementDesc = `[${elementIndex}]`;

      // 添加语义标识（如果有）
      if (semanticInfo) {
        elementDesc += ` ${semanticInfo}`;
      }

      // 添加标签和重要属性
      elementDesc += ` <${el.tag}`;

      // 添加重要属性 - 恢复详细信息但保持整洁
      const importantAttrs = this.getImportantAttributes(el);
      if (importantAttrs.length > 0) {
        elementDesc += ` ${importantAttrs.join(' ')}`;
      }

      // 添加文本内容
      if (text) {
        // 🎯 为视频内容大幅增加文本长度，确保AI能看到完整标题
        let maxLength = 30; // 默认长度
        if (semanticAnalysis.semanticType === 'video_content') {
          maxLength = 120; // 视频内容显示更多文本，足够显示完整中文标题
        } else if (semanticAnalysis.semanticType === 'navigation_link') {
          maxLength = 60; // 导航链接也需要更多文本
        }

        const displayText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
        elementDesc += `>${displayText}`;
      }

      elementDesc += ' />';

      // 添加语义描述和操作提示
      if (semanticAnalysis.description && semanticAnalysis.description !== `${el.tag}元素: ${text}`) {
        elementDesc += ` 📝 ${semanticAnalysis.description}`;
      }

      return elementDesc;
    });

    return formattedElements.join('\n');
  }

  /**
   * 格式化语义分析信息 - 简洁版本
   */
  private formatSemanticInfo(analysis: any): string {
    const parts: string[] = [];

    // 核心语义标识 - 简洁emoji + 类型
    const typeEmoji = this.getSemanticTypeEmoji(analysis.semanticType);
    const typeLabel = this.getSimpleTypeLabel(analysis.semanticType);
    parts.push(`${typeEmoji}${typeLabel}`);

    // 优先级指示 - 仅显示关键级别
    if (analysis.priority >= 4) {
      parts.push(`⭐`);
    } else if (analysis.priority <= 2) {
      parts.push(`⚠️`);
    }

    // 特殊标记 - 仅关键信息
    if (analysis.semanticType === 'advertisement') {
      parts.push(`SKIP`);
    }

    return parts.join('');
  }

  /**
   * 获取简化的类型标签
   */
  private getSimpleTypeLabel(semanticType: string): string {
    const labelMap: { [key: string]: string } = {
      'video_content': 'VIDEO',
      'play_button': 'PLAY',
      'search_input': 'SEARCH',
      'advertisement': 'AD',
      'navigation_link': 'NAV',
      'submit_button': 'SUBMIT',
      'download_button': 'DOWNLOAD',
      'unknown': ''
    };

    return labelMap[semanticType] || '';
  }

  /**
   * 获取重要属性 - 提供足够的上下文信息
   */
  private getImportantAttributes(el: any): string[] {
    const attrs: string[] = [];

    // 核心属性列表
    const coreAttributes = ['type', 'name', 'role', 'aria-label', 'placeholder', 'title', 'value'];

    // 添加核心属性
    for (const attr of coreAttributes) {
      if (el.attributes && el.attributes[attr]) {
        attrs.push(`${attr}="${el.attributes[attr]}"`);
      }
    }

    // 添加class信息（简化）
    if (el.attributes?.class) {
      const classValue = el.attributes.class;
      // 只显示关键的class信息
      const keyClasses = classValue.split(' ').filter((cls: string) =>
        cls.includes('video') || cls.includes('play') || cls.includes('search') ||
        cls.includes('btn') || cls.includes('link') || cls.includes('nav') ||
        cls.includes('ad') || cls.includes('banner')
      );
      if (keyClasses.length > 0) {
        attrs.push(`class="${keyClasses.join(' ')}"`);
      }
    }

    // 添加href信息（截断）
    if (el.attributes?.href && el.tag === 'a') {
      const href = el.attributes.href;
      const shortHref = href.length > 40 ? href.substring(0, 40) + '...' : href;
      attrs.push(`href="${shortHref}"`);
    }

    return attrs;
  }

  /**
   * 获取语义类型对应的emoji
   */
  private getSemanticTypeEmoji(semanticType: string): string {
    const emojiMap: { [key: string]: string } = {
      'video_content': '🎬',
      'play_button': '▶️',
      'search_input': '🔍',
      'advertisement': '📢',
      'navigation_link': '🧭',
      'submit_button': '✅',
      'download_button': '⬇️',
      'unknown': '❓'
    };

    return emojiMap[semanticType] || '🔹';
  }



  // Create complete message context
  createMessageContext(
    stepNumber: number,
    domState: DOMState,
    history: AgentStep[],
    lastResult?: string
  ): MessageContext {
    const agentHistory = this.formatAgentHistory(history);
    const currentState = this.formatBrowserState(domState);
    
    return {
      task: this.task,
      stepNumber,
      agentHistory,
      currentState,
      lastResult,
    };
  }

  // Estimate token count (rough approximation)
  estimateTokenCount(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  // Trim context if it exceeds window
  trimContext(context: MessageContext): MessageContext {
    const totalText = context.agentHistory + context.currentState + context.task;
    const estimatedTokens = this.estimateTokenCount(totalText);
    
    if (estimatedTokens <= this.contextWindow) {
      return context;
    }

    logger.warn(`Context too large (${estimatedTokens} tokens), trimming...`, 'MessageManager');
    
    // Trim history first
    const historyLines = context.agentHistory.split('\n');
    const trimmedHistory = historyLines.slice(-Math.floor(historyLines.length * 0.7)).join('\n');
    
    return {
      ...context,
      agentHistory: trimmedHistory,
    };
  }

  // Analyze conversation for patterns
  analyzeConversationPatterns(history: AgentStep[]): {
    repeatedActions: number;
    failureRate: number;
    avgStepDuration: number;
    commonErrors: string[];
  } {
    if (history.length === 0) {
      return {
        repeatedActions: 0,
        failureRate: 0,
        avgStepDuration: 0,
        commonErrors: [],
      };
    }

    // Count repeated actions
    const actionCounts = new Map<string, number>();
    const errors = new Map<string, number>();
    let totalDuration = 0;
    let failures = 0;

    for (let i = 0; i < history.length; i++) {
      const step = history[i];
      const actionKey = `${step.action.type}_${(step.action as any).index || ''}`;
      
      actionCounts.set(actionKey, (actionCounts.get(actionKey) || 0) + 1);
      
      if (!step.result.success) {
        failures++;
        if (step.result.error) {
          errors.set(step.result.error, (errors.get(step.result.error) || 0) + 1);
        }
      }

      if (i > 0) {
        const duration = step.timestamp.getTime() - history[i - 1].timestamp.getTime();
        totalDuration += duration;
      }
    }

    const maxRepeated = Math.max(...Array.from(actionCounts.values()));
    const failureRate = failures / history.length;
    const avgStepDuration = history.length > 1 ? totalDuration / (history.length - 1) : 0;
    
    // Get most common errors
    const commonErrors = Array.from(errors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([error]) => error);

    return {
      repeatedActions: maxRepeated,
      failureRate,
      avgStepDuration,
      commonErrors,
    };
  }

  // Generate context-aware suggestions
  generateSuggestions(history: AgentStep[], domState: DOMState): string[] {
    const patterns = this.analyzeConversationPatterns(history);
    const suggestions: string[] = [];

    if (patterns.repeatedActions > 3) {
      suggestions.push('Consider trying a different approach - repeated actions detected');
    }

    if (patterns.failureRate > 0.5) {
      suggestions.push('High failure rate detected - consider simplifying the approach');
    }

    if (patterns.commonErrors.length > 0) {
      suggestions.push(`Common errors: ${patterns.commonErrors.join(', ')}`);
    }

    // Check for specific page conditions
    if (domState.elements.length === 0) {
      suggestions.push('No interactive elements found - page may still be loading');
    }

    const hasSearchBox = domState.elements.some(el => 
      el.tag === 'input' && (el.text.toLowerCase().includes('search') || el.text.toLowerCase().includes('搜索'))
    );
    
    if (hasSearchBox && !history.some(step => step.action.type === 'type')) {
      suggestions.push('Search box available - consider using it to find content');
    }

    return suggestions;
  }
}
