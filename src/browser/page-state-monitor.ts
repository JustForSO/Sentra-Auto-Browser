import { logger } from '../utils/logger';

/**
 * 🌐 页面状态监控器 - 基于browser-use架构重构
 * 实时监控页面状态变化，包括URL、DOM结构、内容变化等
 */
export class PageStateMonitor {
  private page: any;
  private currentState: {
    url: string;
    title: string;
    domHash: string;
    timestamp: number;
    isLoading: boolean;
    hasNewContent: boolean;
    elementCount: number;
    interactiveElementCount: number;
  };
  private stateHistory: any[] = [];
  private changeListeners: any[] = [];
  private monitoringActive: boolean = false;
  private domCheckInterval: any = null;
  private lastDOMSnapshot: any = null;
 // 🎯 新增：监控暂停状态


  constructor(page: any) {
    this.page = page;
    this.currentState = {
      url: '',
      title: '',
      domHash: '',
      timestamp: 0,
      isLoading: false,
      hasNewContent: false,
      elementCount: 0,
      interactiveElementCount: 0
    };
  }

  /**
   * 启动页面状态监控
   */
  async startMonitoring() {
    if (this.monitoringActive) return;
    
    logger.info('🔄 启动页面状态监控器...', 'PageStateMonitor');
    
    // 监听页面导航事件
    this.page.on('domcontentloaded', () => this.handlePageChange('domcontentloaded'));
    this.page.on('load', () => this.handlePageChange('load'));
    this.page.on('framenavigated', () => this.handlePageChange('framenavigated'));
    
    // 定期检查DOM变化
    this.domCheckInterval = setInterval(() => {
      this.checkDOMChanges().catch(console.error);
    }, 2000);
    
    this.monitoringActive = true;
    
    // 获取初始状态
    await this.updateCurrentState();
    
    logger.info('✅ 页面状态监控器已启动', 'PageStateMonitor');
  }

  /**
   * 处理页面变化事件
   */
  async handlePageChange(eventType: string) {
    logger.info(`🔄 检测到页面事件: ${eventType}`, 'PageStateMonitor');
    
    // 等待页面稳定
    await this.waitForPageStability();
    
    // 更新状态
    const oldState = { ...this.currentState };
    await this.updateCurrentState();
    
    // 通知监听器
    await this.notifyStateChange(oldState, this.currentState, eventType);
  }

  /**
   * 等待页面稳定
   */
  async waitForPageStability(timeout = 10000) {
    try {
      logger.info('⏳ 等待页面稳定...', 'PageStateMonitor');
      
      // 等待DOM加载完成
      await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 });
      
      // 等待网络空闲
      await this.page.waitForLoadState('networkidle', { timeout: 5000 });
      
      // 额外等待确保动态内容加载
      await this.sleep(1500);
      
      logger.info('✅ 页面已稳定', 'PageStateMonitor');
    } catch (error: any) {
      logger.warn(`⚠️ 等待页面稳定超时: ${error.message}`, 'PageStateMonitor');
    }
  }

  /**
   * 更新当前页面状态
   */
  async updateCurrentState() {
    try {
      const pageInfo = await this.page.evaluate(() => {
        // 计算DOM结构哈希
        const getDOMHash = () => {
          const elements = document.querySelectorAll('*');
          let hash = 0;
          for (let i = 0; i < Math.min(elements.length, 100); i++) {
            const el = elements[i];
            const str = el.tagName + (el.id || '') + (el.className || '');
            for (let j = 0; j < str.length; j++) {
              const char = str.charCodeAt(j);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash; // 转换为32位整数
            }
          }
          return hash.toString();
        };

        return {
          url: window.location.href,
          title: document.title,
          domHash: getDOMHash(),
          timestamp: Date.now(),
          isLoading: document.readyState !== 'complete',
          elementCount: document.querySelectorAll('*').length,
          interactiveElementCount: document.querySelectorAll(
            'button, input, a, select, textarea, [onclick], [role="button"], [role="link"], [tabindex]'
          ).length
        };
      });

      // 检测变化
      const hasChanged = this.hasSignificantChange(pageInfo);
      
      if (hasChanged) {
        this.stateHistory.push({ ...this.currentState });
        if (this.stateHistory.length > 10) {
          this.stateHistory = this.stateHistory.slice(-10);
        }
        
        logger.info(`🔄 页面状态更新: ${pageInfo.url}`, 'PageStateMonitor');
        logger.info(`📊 元素数量: ${pageInfo.elementCount} (交互元素: ${pageInfo.interactiveElementCount})`, 'PageStateMonitor');
      }

      this.currentState = {
        ...pageInfo,
        hasNewContent: hasChanged
      };

      return hasChanged;

    } catch (error: any) {
      logger.error(`❌ 更新页面状态失败: ${error.message}`, error, 'PageStateMonitor');
      return false;
    }
  }

  /**
   * 检测重大变化
   */
  hasSignificantChange(newState: any) {
    const current = this.currentState;
    
    // URL变化
    if (current.url !== newState.url) {
      logger.info(`🌐 URL变化: ${current.url} → ${newState.url}`, 'PageStateMonitor');
      return true;
    }
    
    // 标题变化
    if (current.title !== newState.title) {
      logger.info(`📄 标题变化: "${current.title}" → "${newState.title}"`, 'PageStateMonitor');
      return true;
    }
    
    // DOM结构变化
    if (current.domHash !== newState.domHash) {
      logger.info(`🔄 DOM结构变化检测`, 'PageStateMonitor');
      return true;
    }
    
    // 元素数量重大变化
    const elementChange = Math.abs(newState.elementCount - (current.elementCount || 0));
    if (elementChange > 50) {
      logger.info(`📊 元素数量重大变化: ${current.elementCount} → ${newState.elementCount}`, 'PageStateMonitor');
      return true;
    }
    
    return false;
  }

  /**
   * 添加状态变化监听器
   */
  addChangeListener(listener: any) {
    this.changeListeners.push(listener);
  }

  /**
   * 通知状态变化
   */
  async notifyStateChange(oldState: any, newState: any, eventType: string) {
    for (const listener of this.changeListeners) {
      try {
        await listener(oldState, newState, eventType);
      } catch (error: any) {
        logger.error(`❌ 状态变化监听器错误: ${error.message}`, error, 'PageStateMonitor');
      }
    }
  }

  /**
   * 获取当前状态
   */
  getCurrentState() {
    return { ...this.currentState };
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    if (this.domCheckInterval) {
      clearInterval(this.domCheckInterval);
    }
    this.monitoringActive = false;
    logger.info('🛑 页面状态监控器已停止', 'PageStateMonitor');
  }



  /**
   * 检查DOM内容变化
   */
  async checkDOMChanges() {
    try {


      // 检查页面是否还存在且可访问
      if (!this.page || this.page.isClosed()) {
        return false;
      }

      const snapshot = await this.page.evaluate(() => {
        try {
          const getVisibleText = () => {
            try {
              // 确保document.body存在
              if (!document.body) return '';

              const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                {
                  acceptNode: (node: any) => {
                    try {
                      const parent = node.parentElement;
                      if (!parent) return NodeFilter.FILTER_REJECT;

                      // 🎯 排除DOM标注相关的元素
                      if (parent.id === 'playwright-highlight-container' ||
                          parent.classList.contains('playwright-highlight-label') ||
                          parent.classList.contains('browser-use-marker') ||
                          parent.hasAttribute('data-browser-use-index')) {
                        return NodeFilter.FILTER_REJECT;
                      }

                      const style = window.getComputedStyle(parent);
                      if (style.display === 'none' || style.visibility === 'hidden') {
                        return NodeFilter.FILTER_REJECT;
                      }

                      return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                    } catch (nodeError) {
                      return NodeFilter.FILTER_REJECT;
                    }
                  }
                }
              );

              let text = '';
              let node;
              while (node = walker.nextNode()) {
                text += node.textContent.trim() + ' ';
              }
              return text.substring(0, 5000); // 限制长度
            } catch (textError) {
              return '';
            }
          };

          return {
            visibleText: getVisibleText(),
            interactiveCount: document.querySelectorAll(
              'button:not([disabled]):not(#playwright-highlight-container *), input:not([disabled]):not(#playwright-highlight-container *), a[href]:not(#playwright-highlight-container *), select:not([disabled]):not(#playwright-highlight-container *), [onclick]:not(#playwright-highlight-container *), [role="button"]:not(#playwright-highlight-container *)'
            ).length,
            timestamp: Date.now()
          };
        } catch (evalError) {
          // 如果页面执行失败，返回默认值
          return {
            visibleText: '',
            interactiveCount: 0,
            timestamp: Date.now()
          };
        }
      }).catch(() => {
        // 如果evaluate完全失败，返回默认值
        return {
          visibleText: '',
          interactiveCount: 0,
          timestamp: Date.now()
        };
      });

      if (this.lastDOMSnapshot) {
        const textDiff = snapshot.visibleText !== this.lastDOMSnapshot.visibleText;
        const countDiff = Math.abs(snapshot.interactiveCount - this.lastDOMSnapshot.interactiveCount) > 2;

        // 🎯 避免DOM标注本身触发变化检测的无限循环
        const timeSinceLastUpdate = Date.now() - this.lastDOMSnapshot.timestamp;
        const isSignificantChange = (textDiff && snapshot.visibleText.length > 100) || countDiff;

        if (isSignificantChange && timeSinceLastUpdate > 2000) { // 至少2秒间隔


          logger.info('🔄 检测到DOM内容变化', 'PageStateMonitor');
          await this.updateCurrentState();
        }
      }

      this.lastDOMSnapshot = snapshot;

    } catch (error: any) {
      logger.warn(`⚠️ DOM变化检查失败: ${error.message}`, 'PageStateMonitor');
    }
  }

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
