import { AgentStep, PerformanceMetrics, Action } from '../types';
import { logger } from '../utils/logger';
import { Helpers } from '../utils/helpers';

export interface PerformanceAlert {
  type: 'slow_action' | 'high_memory' | 'high_error_rate' | 'timeout_risk';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: Date;
  metadata?: any;
}

export interface SystemMetrics {
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage?: number;
  networkLatency?: number;
  browserMemory?: number;
}

export class PerformanceMonitoringService {
  private startTime: Date = new Date();
  private actionTimes: Map<string, number[]> = new Map();
  private memorySnapshots: { timestamp: Date; usage: number }[] = [];
  private networkRequests: number = 0;
  private screenshotCount: number = 0;
  private errorCount: number = 0;
  private retryCount: number = 0;
  private alerts: PerformanceAlert[] = [];
  
  // Thresholds
  private readonly SLOW_ACTION_THRESHOLD = 10000; // 10 seconds
  private readonly HIGH_MEMORY_THRESHOLD = 0.8; // 80%
  private readonly HIGH_ERROR_RATE_THRESHOLD = 0.3; // 30%
  private readonly MAX_ALERTS = 100;

  startMonitoring(): void {
    this.startTime = new Date();
    this.recordMemorySnapshot();
    
    // Start periodic monitoring
    setInterval(() => {
      this.recordMemorySnapshot();
      this.checkPerformanceAlerts();
    }, 5000); // Every 5 seconds
    
    logger.info('Performance monitoring started', 'PerformanceMonitoringService');
  }

  recordActionStart(action: Action): string {
    const actionId = `${action.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return actionId;
  }

  recordActionEnd(actionId: string, action: Action, success: boolean, duration: number): void {
    // Record timing
    const actionType = action.type;
    if (!this.actionTimes.has(actionType)) {
      this.actionTimes.set(actionType, []);
    }
    this.actionTimes.get(actionType)!.push(duration);

    // Update counters
    if (!success) {
      this.errorCount++;
    }

    // Check for slow actions
    if (duration > this.SLOW_ACTION_THRESHOLD) {
      this.addAlert({
        type: 'slow_action',
        severity: 'medium',
        message: `Slow ${actionType} action: ${duration}ms`,
        timestamp: new Date(),
        metadata: { action, duration },
      });
    }

    logger.debug(`Action ${actionType} completed in ${duration}ms`, 'PerformanceMonitoringService');
  }

  recordRetry(): void {
    this.retryCount++;
  }

  recordNetworkRequest(): void {
    this.networkRequests++;
  }

  recordScreenshot(): void {
    this.screenshotCount++;
  }

  recordError(error: Error, action?: Action): void {
    this.errorCount++;
    
    logger.debug(`Error recorded: ${error.message}`, 'PerformanceMonitoringService');
  }

  getMetrics(steps: AgentStep[]): PerformanceMetrics {
    const totalTime = Date.now() - this.startTime.getTime();
    const actionDurations = steps
      .map(s => s.result.metadata?.duration || 0)
      .filter(d => d > 0);

    const averageActionTime = actionDurations.length > 0 
      ? actionDurations.reduce((sum, d) => sum + d, 0) / actionDurations.length 
      : 0;

    const slowestAction = steps.reduce((slowest, step) => {
      const duration = step.result.metadata?.duration || 0;
      return duration > (slowest?.duration || 0) 
        ? { action: step.action, duration }
        : slowest;
    }, null as { action: Action; duration: number } | null);

    const fastestAction = steps.reduce((fastest, step) => {
      const duration = step.result.metadata?.duration || 0;
      return duration > 0 && duration < (fastest?.duration || Infinity)
        ? { action: step.action, duration }
        : fastest;
    }, null as { action: Action; duration: number } | null);

    const memoryUsage = this.getMemoryUsage();

    return {
      totalExecutionTime: totalTime,
      averageActionTime,
      slowestAction: slowestAction || { action: { type: 'done', message: '', success: true }, duration: 0 },
      fastestAction: fastestAction || { action: { type: 'done', message: '', success: true }, duration: 0 },
      memoryUsage: {
        initial: this.memorySnapshots[0]?.usage || 0,
        peak: Math.max(...this.memorySnapshots.map(s => s.usage), 0),
        final: this.memorySnapshots[this.memorySnapshots.length - 1]?.usage || 0,
      },
      networkRequests: this.networkRequests,
      screenshotsTaken: this.screenshotCount,
      errorsEncountered: this.errorCount,
      retriesPerformed: this.retryCount,
    };
  }

  getSystemMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const usedMemory = memUsage.heapUsed + memUsage.external;

    return {
      memoryUsage: {
        used: usedMemory,
        total: totalMemory,
        percentage: usedMemory / totalMemory,
      },
    };
  }

  getActionStatistics(): Map<string, {
    count: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    successRate: number;
  }> {
    const stats = new Map();

    for (const [actionType, times] of this.actionTimes.entries()) {
      if (times.length > 0) {
        stats.set(actionType, {
          count: times.length,
          averageTime: times.reduce((sum, t) => sum + t, 0) / times.length,
          minTime: Math.min(...times),
          maxTime: Math.max(...times),
          successRate: 1.0, // Would need to track failures separately
        });
      }
    }

    return stats;
  }

  getAlerts(severity?: PerformanceAlert['severity']): PerformanceAlert[] {
    if (severity) {
      return this.alerts.filter(a => a.severity === severity);
    }
    return [...this.alerts];
  }

  clearAlerts(): void {
    this.alerts = [];
    logger.debug('Performance alerts cleared', 'PerformanceMonitoringService');
  }

  generateReport(steps: AgentStep[]): string {
    const metrics = this.getMetrics(steps);
    const systemMetrics = this.getSystemMetrics();
    const actionStats = this.getActionStatistics();
    const alerts = this.getAlerts();

    const report = [
      '=== PERFORMANCE REPORT ===',
      '',
      `Total Execution Time: ${Helpers.formatDuration(metrics.totalExecutionTime / 1000)}`,
      `Average Action Time: ${metrics.averageActionTime.toFixed(2)}ms`,
      `Network Requests: ${metrics.networkRequests}`,
      `Screenshots Taken: ${metrics.screenshotsTaken}`,
      `Errors Encountered: ${metrics.errorsEncountered}`,
      `Retries Performed: ${metrics.retriesPerformed}`,
      '',
      '--- Memory Usage ---',
      `Initial: ${(metrics.memoryUsage.initial / 1024 / 1024).toFixed(2)} MB`,
      `Peak: ${(metrics.memoryUsage.peak / 1024 / 1024).toFixed(2)} MB`,
      `Final: ${(metrics.memoryUsage.final / 1024 / 1024).toFixed(2)} MB`,
      `Current System: ${(systemMetrics.memoryUsage.percentage * 100).toFixed(1)}%`,
      '',
      '--- Action Statistics ---',
    ];

    for (const [actionType, stats] of actionStats.entries()) {
      report.push(`${actionType}: ${stats.count} times, avg ${stats.averageTime.toFixed(2)}ms`);
    }

    if (alerts.length > 0) {
      report.push('', '--- Performance Alerts ---');
      alerts.slice(-10).forEach(alert => {
        report.push(`[${alert.severity.toUpperCase()}] ${alert.message}`);
      });
    }

    return report.join('\n');
  }

  private recordMemorySnapshot(): void {
    const usage = process.memoryUsage().heapUsed;
    this.memorySnapshots.push({
      timestamp: new Date(),
      usage,
    });

    // Keep only last 100 snapshots
    if (this.memorySnapshots.length > 100) {
      this.memorySnapshots = this.memorySnapshots.slice(-100);
    }
  }

  private checkPerformanceAlerts(): void {
    // Check memory usage
    const systemMetrics = this.getSystemMetrics();
    if (systemMetrics.memoryUsage.percentage > this.HIGH_MEMORY_THRESHOLD) {
      this.addAlert({
        type: 'high_memory',
        severity: 'high',
        message: `High memory usage: ${(systemMetrics.memoryUsage.percentage * 100).toFixed(1)}%`,
        timestamp: new Date(),
        metadata: { memoryUsage: systemMetrics.memoryUsage },
      });
    }

    // Check error rate (if we have enough data)
    const totalActions = Array.from(this.actionTimes.values())
      .reduce((sum, times) => sum + times.length, 0);
    
    if (totalActions > 10) {
      const errorRate = this.errorCount / totalActions;
      if (errorRate > this.HIGH_ERROR_RATE_THRESHOLD) {
        this.addAlert({
          type: 'high_error_rate',
          severity: 'high',
          message: `High error rate: ${(errorRate * 100).toFixed(1)}%`,
          timestamp: new Date(),
          metadata: { errorRate, totalActions, errorCount: this.errorCount },
        });
      }
    }
  }

  private addAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);
    
    // Keep only recent alerts
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(-this.MAX_ALERTS);
    }

    logger.warn(`Performance alert: ${alert.message}`, 'PerformanceMonitoringService');
  }

  private getMemoryUsage(): number {
    return process.memoryUsage().heapUsed;
  }
}
