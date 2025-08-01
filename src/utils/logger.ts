import chalk from 'chalk';
import Config from '../config';
import { Symbols } from './symbols';

// 日志级别枚举
export enum LogLevel {
  DEBUG = 0,  // 调试
  INFO = 1,   // 信息
  WARN = 2,   // 警告
  ERROR = 3,  // 错误
}

// 日志记录器类 - 单例模式
export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;

  private constructor() {
    const level = Config.getLogLevel().toLowerCase();
    switch (level) {
      case 'debug':
        this.logLevel = LogLevel.DEBUG;
        break;
      case 'info':
        this.logLevel = LogLevel.INFO;
        break;
      case 'warn':
        this.logLevel = LogLevel.WARN;
        break;
      case 'error':
        this.logLevel = LogLevel.ERROR;
        break;
      default:
        this.logLevel = LogLevel.INFO;
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: string, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}] ` : '';
    return `${timestamp} ${level} ${contextStr}${message}`;
  }

  debug(message: string, context?: string): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      console.log(chalk.gray(this.formatMessage('DEBUG', message, context)));
    }
  }

  info(message: string, context?: string): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.log(chalk.blue(this.formatMessage('INFO', message, context)));
    }
  }

  warn(message: string, context?: string): void {
    if (this.logLevel <= LogLevel.WARN) {
      console.log(chalk.yellow(this.formatMessage('WARN', message, context)));
    }
  }

  error(message: string, error?: Error, context?: string): void {
    if (this.logLevel <= LogLevel.ERROR) {
      console.error(chalk.red(this.formatMessage('ERROR', message, context)));
      if (error && Config.isDebugMode()) {
        console.error(chalk.red(error.stack));
      }
    }
  }

  success(message: string, context?: string): void {
    console.log(chalk.green(this.formatMessage('SUCCESS', message, context)));
  }

  step(stepNumber: number, message: string): void {
    const stepIcon = Symbols.getAction('step');
    console.log(chalk.cyan(`\n${stepIcon} Step ${stepNumber}: ${message}`));
  }

  action(action: string, details?: string): void {
    const detailsStr = details ? ` - ${details}` : '';
    const executeIcon = Symbols.getAction('execute');
    console.log(chalk.magenta(`  ${executeIcon} Executing action: ${action}${detailsStr}`));
  }

  result(message: string, success: boolean = true): void {
    const icon = success ? Symbols.getStatus('success') : Symbols.getStatus('error');
    const color = success ? chalk.green : chalk.red;
    console.log(color(`  ${icon} ${message}`));
  }
}

export const logger = Logger.getInstance();
