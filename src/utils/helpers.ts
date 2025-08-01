import { AgentHistory, AgentStep } from '../types';

export class Helpers {
  /**
   * Format duration in seconds to human readable string
   */
  static formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Truncate text to specified length with ellipsis
   */
  static truncateText(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Extract domain from URL
   */
  static extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  /**
   * Generate a summary of agent execution
   */
  static generateExecutionSummary(history: AgentHistory): string {
    const { task, steps, completed, success, totalDuration } = history;
    
    const summary = [
      `Task: ${task}`,
      `Status: ${completed ? (success ? 'Completed Successfully' : 'Completed with Errors') : 'In Progress'}`,
      `Steps: ${steps.length}`,
      `Duration: ${this.formatDuration(totalDuration)}`,
    ];

    if (steps.length > 0) {
      const actionCounts = this.countActionTypes(steps);
      summary.push(`Actions: ${Object.entries(actionCounts).map(([type, count]) => `${type}(${count})`).join(', ')}`);
    }

    return summary.join('\n');
  }

  /**
   * Count action types in steps
   */
  static countActionTypes(steps: AgentStep[]): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const step of steps) {
      const actionType = step.action.type;
      counts[actionType] = (counts[actionType] || 0) + 1;
    }
    
    return counts;
  }

  /**
   * Get failed steps from history
   */
  static getFailedSteps(steps: AgentStep[]): AgentStep[] {
    return steps.filter(step => !step.result.success);
  }

  /**
   * Get successful steps from history
   */
  static getSuccessfulSteps(steps: AgentStep[]): AgentStep[] {
    return steps.filter(step => step.result.success);
  }

  /**
   * Calculate success rate
   */
  static calculateSuccessRate(steps: AgentStep[]): number {
    if (steps.length === 0) return 0;
    const successfulSteps = this.getSuccessfulSteps(steps);
    return (successfulSteps.length / steps.length) * 100;
  }

  /**
   * Sleep for specified milliseconds
   */
  static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          throw lastError;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  /**
   * Sanitize filename for safe file operations
   */
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
  }

  /**
   * Generate timestamp string for filenames
   */
  static getTimestamp(): string {
    const now = new Date();
    return now.toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .split('.')[0];
  }

  /**
   * Check if string is valid JSON
   */
  static isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract JSON from string that might contain other text
   */
  static extractJSON(str: string): any {
    // Try to find JSON object in the string
    const jsonMatch = str.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // If parsing fails, try to find array
        const arrayMatch = str.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          return JSON.parse(arrayMatch[0]);
        }
      }
    }
    throw new Error('No valid JSON found in string');
  }

  /**
   * Deep clone an object
   */
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Check if object is empty
   */
  static isEmpty(obj: any): boolean {
    if (obj == null) return true;
    if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
  }

  /**
   * Merge objects deeply
   */
  static mergeDeep(target: any, ...sources: any[]): any {
    if (!sources.length) return target;
    const source = sources.shift();

    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this.mergeDeep(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return this.mergeDeep(target, ...sources);
  }

  /**
   * Check if value is an object
   */
  private static isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}
