import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { logger } from '../utils/logger';
import { BrowserProcessManager } from './browser-process-manager';

/**
 * 🧠 智能浏览器连接管理器
 * 
 * 自动检测和处理浏览器实例冲突，提供最佳连接策略
 */
export class SmartConnectionManager {
  private processManager: BrowserProcessManager;

  constructor() {
    this.processManager = new BrowserProcessManager();
  }

  /**
   * 🔍 检测最佳连接策略
   */
  async detectBestConnectionStrategy(): Promise<{
    strategy: 'connect' | 'smart_connect';
    reason: string;
    options: any;
  }> {
    logger.info('🔍 检测最佳浏览器连接策略', 'SmartConnectionManager');

    // 使用浏览器进程管理器检测连接状态
    const preparation = await this.processManager.prepareConnection();

    if (preparation.canConnect) {
      // 有可连接的调试实例
      return {
        strategy: 'connect',
        reason: preparation.message,
        options: {
          debugUrl: preparation.debugUrl
        }
      };
    } else {
      // 需要智能处理（关闭现有实例并启动调试实例）
      return {
        strategy: 'smart_connect',
        reason: preparation.message,
        options: {
          action: preparation.action,
          debugUrl: preparation.debugUrl
        }
      };
    }
  }

  /**
   * 🔗 智能连接浏览器
   */
  async smartConnect(): Promise<{
    browser: Browser | null;
    context: BrowserContext;
    page: Page;
    strategy: string;
  }> {
    const bestStrategy = await this.detectBestConnectionStrategy();

    logger.info(`🎯 使用策略: ${bestStrategy.strategy}`, 'SmartConnectionManager');
    logger.info(`📋 原因: ${bestStrategy.reason}`, 'SmartConnectionManager');

    switch (bestStrategy.strategy) {
      case 'connect':
        // 直接连接现有调试实例
        return await this.connectToExisting(bestStrategy.options);

      case 'smart_connect':
        // 智能处理：先准备连接环境，再连接
        const prepared = await this.processManager.executeConnectionPreparation();
        if (!prepared) {
          throw new Error('无法准备浏览器连接环境');
        }

        // 连接准备好的调试实例
        return await this.connectToExisting({
          debugUrl: bestStrategy.options.debugUrl
        });

      default:
        throw new Error(`未知连接策略: ${bestStrategy.strategy}`);
    }
  }

  /**
   * 🔗 连接到现有实例
   */
  private async connectToExisting(options: any): Promise<any> {
    const debugUrl = options.debugUrl;

    try {
      logger.info(`🔗 连接到调试端口: ${debugUrl}`, 'SmartConnectionManager');

      // chromium.connectOverCDP('http://localhost:9222')
      const browser = await chromium.connectOverCDP(debugUrl);

      let context: BrowserContext;
      const contexts = browser.contexts();
      if (contexts.length > 0) {
        context = contexts[0];
        logger.info('✅ 使用现有浏览器上下文', 'SmartConnectionManager');
      } else {
        // 如果没有上下文就抛出错误
        throw new Error('未找到浏览器上下文');
      }

      let page: Page;
      const pages = context.pages();
      if (pages.length > 0) {
        page = pages[0];
        logger.info('✅ 使用现有页面', 'SmartConnectionManager');
      } else {
        page = await context.newPage();
        logger.info('✅ 创建新页面', 'SmartConnectionManager');
      }

      // 注意：使用connectOverCDP时不需要应用反检测脚本，因为本身就没有自动化痕迹
      logger.info('🔓 使用CDP连接，无自动化痕迹', 'SmartConnectionManager');

      logger.success('✅ 成功连接到浏览器调试实例', 'SmartConnectionManager');

      return { browser, context, page, strategy: 'connect' };
    } catch (error: any) {
      logger.error('❌ 连接调试实例失败', error, 'SmartConnectionManager');
      throw error;
    }
  }
}