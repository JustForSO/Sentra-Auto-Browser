import { logger } from '../utils/logger';
import { BrowserSession } from './session';
import { PageStateMonitor } from './page-state-monitor';
import { SmartTabManager } from './smart-tab-manager';
import { EnhancedDOMDetector } from './enhanced-dom-detector';
import { EnhancedKeyHandler } from './enhanced-key-handler';


/**
 * 🎛️ 主控制器 - 协调所有增强组件
 */
export class MasterController {
  private browserSession: BrowserSession;
  private pageStateMonitor: PageStateMonitor | null = null;
  private smartTabManager: SmartTabManager | null = null;
  private enhancedDOMDetector: EnhancedDOMDetector | null = null;
  private enhancedKeyHandler: EnhancedKeyHandler | null = null;
  private isInitialized: boolean = false;
  private context: any = null;
  private page: any = null;

  private operationStats = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    pageNavigations: 0,
    tabSwitches: 0
  };

  constructor(browserSession: BrowserSession) {
    this.browserSession = browserSession;
  }

  /**
   * 初始化所有增强组件
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        logger.warn('⚠️ 主控制器已经初始化', 'MasterController');
        return;
      }

      logger.info('🚀 初始化主控制器...', 'MasterController');

      // 确保浏览器会话已启动
      if (!this.browserSession.isStarted()) {
        throw new Error('浏览器会话未启动');
      }

      const page = this.browserSession.getCurrentPage();
      const browser = this.browserSession.getBrowser();
      const context = this.browserSession.getContext();

      // 保存引用
      this.page = page;
      this.context = context;

      // 初始化页面状态监控器
      this.pageStateMonitor = new PageStateMonitor(page);
      await this.pageStateMonitor.startMonitoring();
      logger.info('✅ 页面状态监控器已初始化', 'MasterController');

      // 初始化智能标签页管理器
      this.smartTabManager = new SmartTabManager(browser, context);

      // 设置页面变化回调，立即更新页面引用
      this.smartTabManager.setPageChangeCallback(async (newPage: any) => {
        logger.info('🔄 SmartTabManager页面变化回调触发', 'MasterController');
        await this.updateAllComponentsPageReference(newPage);
      });

      await this.smartTabManager.startMonitoring();
      logger.info('✅ 智能标签页管理器已初始化', 'MasterController');

      // 初始化增强DOM检测器
      this.enhancedDOMDetector = new EnhancedDOMDetector(page, this.pageStateMonitor);
      logger.info('✅ 增强DOM检测器已初始化', 'MasterController');

      // 初始化增强按键处理器
      this.enhancedKeyHandler = new EnhancedKeyHandler(page, this.pageStateMonitor);
      logger.info('✅ 增强按键处理器已初始化', 'MasterController');

      // 设置页面状态变化监听器
      this.pageStateMonitor.addChangeListener(this.onPageStateChange.bind(this));

      // 执行初始检测
      await this.performInitialDetection();

      this.isInitialized = true;
      logger.info('🎯 主控制器初始化完成', 'MasterController');

    } catch (error: any) {
      logger.error(`❌ 主控制器初始化失败: ${error.message}`, error, 'MasterController');
      throw error;
    }
  }

  /**
   * 执行初始检测
   */
  async performInitialDetection(): Promise<void> {
    try {
      logger.info('🔍 执行初始页面检测...', 'MasterController');

      if (!this.enhancedDOMDetector) {
        throw new Error('DOM检测器未初始化');
      }

      // 检测页面元素
      const detection = await this.enhancedDOMDetector.detectElements();

      logger.info(`📊 初始检测完成: ${detection.elements.length}个元素`, 'MasterController');
      logger.info(`🎨 页面标记已添加`, 'MasterController');

    } catch (error: any) {
      logger.error(`❌ 初始检测失败: ${error.message}`, error, 'MasterController');
      throw error;
    }
  }

  /**
   * 页面状态变化处理
   */
  async onPageStateChange(oldState: any, newState: any, eventType: string): Promise<void> {
    try {
      logger.info(`🔄 处理页面状态变化: ${eventType}`, 'MasterController');

      // 更新统计
      if (oldState.url !== newState.url) {
        this.operationStats.pageNavigations++;
        logger.info(`🌐 页面导航计数: ${this.operationStats.pageNavigations}`, 'MasterController');
      }

      // 更新当前页面引用
      await this.updateCurrentPageReference();

      // 强制重新检测元素
      if (newState.hasNewContent && this.enhancedDOMDetector) {
        logger.info('🔄 检测到新内容，重新分析页面元素...', 'MasterController');
        await this.enhancedDOMDetector.detectElements(true);
      }

    } catch (error: any) {
      logger.error(`❌ 处理页面状态变化失败: ${error.message}`, error, 'MasterController');
    }
  }

  /**
   * 更新当前页面引用
   */
  async updateCurrentPageReference(): Promise<void> {
    try {
      // 获取SmartTabManager的活动页面
      const activeTabPage = this.smartTabManager?.getActiveTabPage();

      if (activeTabPage && activeTabPage !== this.page) {
        logger.info('🔄 检测到活动页面变化，更新引用...', 'MasterController');
        await this.updateAllComponentsPageReference(activeTabPage);
      } else {
        // 回退到BrowserSession的当前页面
        const currentPage = this.browserSession.getCurrentPage();
        await this.updateAllComponentsPageReference(currentPage);
      }
    } catch (error: any) {
      logger.error(`❌ 更新页面引用失败: ${error.message}`, error, 'MasterController');
    }
  }

  /**
   * 更新所有组件的页面引用
   */
  async updateAllComponentsPageReference(newPage: any): Promise<void> {
    try {
      logger.info('🔄 更新所有组件的页面引用...', 'MasterController');

      // 更新BrowserSession的页面引用
      this.browserSession.updateCurrentPage(newPage);

      // 更新PageStateMonitor
      if (this.pageStateMonitor) {
        this.pageStateMonitor['page'] = newPage;
        logger.debug('✅ PageStateMonitor页面引用已更新', 'MasterController');
      }

      // 更新EnhancedDOMDetector及其DOMService
      if (this.enhancedDOMDetector) {
        this.enhancedDOMDetector['page'] = newPage;
        this.enhancedDOMDetector['domService']['page'] = newPage;
        // 清理DOM缓存，因为页面已经改变
        this.enhancedDOMDetector['elementCache'].clear();
        this.enhancedDOMDetector['cacheTimestamps'].clear();
        logger.debug('✅ EnhancedDOMDetector页面引用已更新', 'MasterController');

        // 强制重新检测DOM并添加可视化标注
        try {
          logger.info('🔄 页面切换后强制重新检测DOM...', 'MasterController');
          await this.enhancedDOMDetector.detectElements();
          logger.info('✅ DOM重新检测完成，可视化标注已更新', 'MasterController');
        } catch (error: any) {
          logger.error(`❌ DOM重新检测失败: ${error.message}`, error, 'MasterController');
        }
      }

      // 更新EnhancedKeyHandler
      if (this.enhancedKeyHandler) {
        this.enhancedKeyHandler.updatePage(newPage);
        logger.debug('✅ EnhancedKeyHandler页面引用已更新', 'MasterController');
      }

      // 无等待更新
      // await new Promise(resolve => setTimeout(resolve, 200));

      logger.info('✅ 所有组件页面引用已更新', 'MasterController');

    } catch (error: any) {
      logger.error(`❌ 更新组件页面引用失败: ${error.message}`, error, 'MasterController');
    }
  }

  /**
   * 智能标签页切换
   */
  async smartSwitchTab(criteria: {
    preferredDomain?: string;
    preferredPageType?: string;
    mustHaveElements?: string[];
    avoidErrors?: boolean;
    preferRecent?: boolean;
  } = {}): Promise<any> {
    try {
      if (!this.smartTabManager) {
        throw new Error('智能标签页管理器未初始化');
      }

      logger.info('🎯 执行智能标签页切换...', 'MasterController');

      const newPage = await this.smartTabManager.smartSwitchTab(criteria);

      if (newPage) {
        // 更新浏览器会话的当前页面
        this.browserSession['page'] = newPage;

        // 更新所有组件的页面引用
        await this.updateCurrentPageReference();

        // 重新检测新页面的元素
        if (this.enhancedDOMDetector) {
          await this.enhancedDOMDetector.detectElements(true);
        }

        this.operationStats.tabSwitches++;
        logger.info(`✅ 智能标签页切换成功 (切换次数: ${this.operationStats.tabSwitches})`, 'MasterController');

        return newPage;
      } else {
        logger.warn('⚠️ 未找到合适的标签页', 'MasterController');
        return null;
      }

    } catch (error: any) {
      logger.error(`❌ 智能标签页切换失败: ${error.message}`, error, 'MasterController');
      throw error;
    }
  }

  /**
   * 增强的DOM检测 - 确保使用最新的活动页面
   */
  async detectElements(forceRefresh: boolean = false): Promise<any> {
    try {
      if (!this.enhancedDOMDetector) {
        throw new Error('DOM检测器未初始化');
      }

      // 在DOM检测前强制更新页面引用
      await this.updateCurrentPageReference();

      this.operationStats.totalOperations++;

      const result = await this.enhancedDOMDetector.detectElements(forceRefresh);

      this.operationStats.successfulOperations++;
      return result;

    } catch (error: any) {
      this.operationStats.failedOperations++;
      logger.error(`❌ DOM检测失败: ${error.message}`, error, 'MasterController');
      throw error;
    }
  }

  /**
   * 增强的按键处理
   */
  async pressKey(key: string, modifiers?: string[], options: {
    waitForNavigation?: boolean;
    expectFormSubmit?: boolean;
    targetElement?: any;
    retryCount?: number;
  } = {}): Promise<boolean> {
    try {
      if (!this.enhancedKeyHandler) {
        throw new Error('按键处理器未初始化');
      }

      this.operationStats.totalOperations++;

      // 记录操作前的标签页数量
      const initialTabCount = this.context.pages().length;

      const result = await this.enhancedKeyHandler.pressKey(key, modifiers, options);

      // 快速新标签页检测和切换
      if (key === 'Enter' && options.expectFormSubmit) {
        // 立即检查标签页变化
        await new Promise(resolve => setTimeout(resolve, 300));

        const currentTabCount = this.context.pages().length;
        if (currentTabCount > initialTabCount) {
          logger.info('🔄 检测到新标签页，立即切换...', 'MasterController');

          if (this.smartTabManager) {
            const newPage = await this.smartTabManager.smartSwitchTab({
              preferRecent: true,
              preferredPageType: 'search'
            });

            if (newPage) {
              // 立即更新页面引用 - 无等待
              this.page = newPage;
              await this.updateAllComponentsPageReference(newPage);
              logger.info('✅ 快速切换到新标签页完成', 'MasterController');
            }
          }
        }
      }

      this.operationStats.successfulOperations++;
      return result;

    } catch (error: any) {
      this.operationStats.failedOperations++;
      logger.error(`❌ 按键处理失败: ${error.message}`, error, 'MasterController');
      throw error;
    }
  }

  /**
   * 获取当前页面状态
   */
  getCurrentPageState(): any {
    if (!this.pageStateMonitor) {
      throw new Error('页面状态监控器未初始化');
    }

    return this.pageStateMonitor.getCurrentState();
  }



  /**
   * 获取所有标签页信息
   */
  getAllTabs(): any[] {
    if (!this.smartTabManager) {
      throw new Error('智能标签页管理器未初始化');
    }

    return this.smartTabManager.getAllTabs();
  }

  /**
   * 获取操作统计
   */
  getOperationStats(): any {
    return { ...this.operationStats };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.operationStats = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      pageNavigations: 0,
      tabSwitches: 0
    };
    logger.info('📊 操作统计已重置', 'MasterController');
  }

  /**
   * 停止所有监控
   */
  async shutdown(): Promise<void> {
    try {
      logger.info('🛑 关闭主控制器...', 'MasterController');

      if (this.pageStateMonitor) {
        this.pageStateMonitor.stopMonitoring();
      }

      if (this.smartTabManager) {
        this.smartTabManager.stopMonitoring();
      }

      this.isInitialized = false;
      logger.info('✅ 主控制器已关闭', 'MasterController');

    } catch (error: any) {
      logger.error(`❌ 关闭主控制器失败: ${error.message}`, error, 'MasterController');
    }
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 🧠 获取所有标签页信息供AI决策使用
   */
  getAllTabsInfo(): any[] {
    if (this.smartTabManager) {
      return this.smartTabManager.getAllTabsForAI();
    }
    return [];
  }

  /**
   * 🧠 AI智能切换标签页
   */
  async aiSwitchTab(targetTabId: string): Promise<any> {
    if (this.smartTabManager) {
      return await this.smartTabManager.aiSwitchTab(targetTabId);
    }
    return null;
  }

  /**
   * 🔍 获取增强DOM状态（包含可视化标注）
   */
  async getEnhancedDOMState(): Promise<any> {
    if (this.enhancedDOMDetector) {
      return await this.enhancedDOMDetector.detectElements();
    }
    throw new Error('增强DOM检测器未初始化');
  }
}
