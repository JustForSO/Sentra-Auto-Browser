import { logger } from '../utils/logger';

/**
 * 🗂️ 智能标签页管理器
 *
 * 这个类就像一个贴心的浏览器助手，帮你管理所有打开的标签页
 * 它会实时监控页面状态，智能判断哪个页面最重要，然后自动切换过去
 * 就像有个小秘书在旁边帮你整理桌面一样贴心
 */
export class SmartTabManager {
  private browser: any;                    // 浏览器实例，我们的工作台
  private context: any;                    // 浏览器上下文，相当于工作环境
  private tabs: Map<any, any> = new Map(); // 标签页信息存储，用页面对象做key很巧妙
  private activeTab: any = null;           // 当前活跃的标签页，就是用户正在看的那个
  private lastUpdateTime: number = 0;      // 上次更新时间，避免频繁刷新
  private updateInterval: any = null;      // 定时器，定期检查标签页状态
  private monitoringActive: boolean = false; // 监控开关，控制是否在工作
  private pageChangeCallback: ((newPage: any) => Promise<void>) | null = null; // 页面切换时的回调函数
  private useTraditionalSwitching: boolean = false; // 是否使用传统评分切换，现在主要靠AI决策

  constructor(browser: any, context: any) {
    this.browser = browser;
    this.context = context;
  }

  /**
   * 设置页面变化回调函数
   * 当标签页切换时，会调用这个函数通知外部
   */
  setPageChangeCallback(callback: (newPage: any) => Promise<void>) {
    this.pageChangeCallback = callback;
  }

  /**
   * 启动标签页监控
   * 就像启动一个勤劳的小助手，开始帮你盯着所有标签页的动态
   */
  async startMonitoring() {
    if (this.monitoringActive) return;

    logger.info('🗂️ 启动智能标签页管理器...', 'SmartTabManager');

    // 监听新页面创建事件 - 有新标签页打开时立即响应
    this.context.on('page', (page: any) => {
      logger.info('📄 检测到新页面创建', 'SmartTabManager');
      this.handleNewPage(page);
    });

    // 定期更新标签页信息 - 每2秒检查一次，保持信息新鲜
    this.updateInterval = setInterval(() => {
      this.updateAllTabs().catch(console.error);
    }, 2000);

    // 先做一次全面扫描，了解当前状况
    await this.updateAllTabs();

    this.monitoringActive = true;
    logger.info('✅ 智能标签页管理器已启动', 'SmartTabManager');
  }

  /**
   * 处理新页面创建
   * 当有新标签页出现时，我们要判断它是否值得关注
   */
  async handleNewPage(page: any) {
    try {
      // 等等页面基本加载完成，但不要等太久（3秒足够了）
      try {
        await page.waitForLoadState('domcontentloaded', { timeout: 3000 });
      } catch (timeoutError) {
        logger.warn('⏰ 新页面加载超时，继续处理', 'SmartTabManager');
      }

      // 检查页面URL是否有效，过滤掉那些没用的空白页
      const url = page.url();
      if (!url || url === 'about:blank' || url === 'chrome://newtab/') {
        logger.warn('⚠️ 跳过空白页面注册', 'SmartTabManager');
        return;
      }

      const tabInfo = await this.createTabInfo(page);

      // 验证这个标签页是否值得我们管理
      const isValidTab = this.isValidTab(url, tabInfo.title);

      if (isValidTab) {
        this.tabs.set(page, tabInfo);
        logger.info(`📄 新标签页已注册: ${tabInfo.title || url}`, 'SmartTabManager');

        // 如果不是传统切换模式，且这是个新页面，考虑切换过去
        if (!this.useTraditionalSwitching && this.activeTab !== page) {
          // 用户主动打开的新页面通常是想要看的
          this.activeTab = page;
          await page.bringToFront();

          // 通知外部有页面切换了
          if (this.pageChangeCallback) {
            try {
              await this.pageChangeCallback(page);
              logger.info('✅ 新页面切换回调已执行', 'SmartTabManager');
            } catch (error: any) {
              logger.error(`❌ 新页面切换回调执行失败: ${error.message}`, error, 'SmartTabManager');
            }
          }
        }
      } else {
        logger.warn(`⚠️ 跳过无效标签页: ${tabInfo.title || '(无标题)'} (${url})`, 'SmartTabManager');
      }

    } catch (error: any) {
      logger.warn(`⚠️ 处理新页面失败: ${error.message}`, 'SmartTabManager');
    }
  }

  /**
   * 更新所有标签页信息
   * 定期检查所有标签页的状态，就像巡视员检查各个房间一样
   */
  async updateAllTabs() {
    try {
      const currentPages = this.context.pages();

      // 清理已经关闭的标签页，保持数据整洁
      for (const [page] of this.tabs) {
        if (!currentPages.includes(page)) {
          logger.info('🗑️ 清理已关闭的标签页', 'SmartTabManager');
          this.tabs.delete(page);
        }
      }

      // 更新每个页面的最新信息
      for (const page of currentPages) {
        try {
          const tabInfo = await this.createTabInfo(page);
          this.tabs.set(page, tabInfo);
        } catch (error: any) {
          logger.warn(`⚠️ 更新标签页信息失败: ${error.message}`, 'SmartTabManager');
        }
      }

      // 如果还没有设置活动页面，就选择一个作为默认的
      if (!this.activeTab && currentPages.length > 0) {
        // 通常选择最后一个页面，因为它可能是用户最近打开的
        this.activeTab = currentPages[currentPages.length - 1];
        logger.info(`🎯 设置初始活动页面: ${await this.activeTab.url()}`, 'SmartTabManager');

        // 确保这个页面显示在前台
        await this.activeTab.bringToFront();

        // 告诉外部系统页面已经切换了
        if (this.pageChangeCallback) {
          try {
            await this.pageChangeCallback(this.activeTab);
            logger.info('✅ 初始页面设置回调已执行', 'SmartTabManager');
          } catch (error: any) {
            logger.error(`❌ 初始页面设置回调执行失败: ${error.message}`, error, 'SmartTabManager');
          }
        }
      }

      // 只有在传统模式下才会自动切换标签页
      if (this.useTraditionalSwitching) {
        await this.smartSwitchTab();
      }

      this.lastUpdateTime = Date.now();

    } catch (error: any) {
      logger.error(`❌ 更新标签页信息失败: ${error.message}`, error, 'SmartTabManager');
    }
  }

  /**
   * 创建标签页信息
   * 收集页面的各种信息，就像给每个标签页建立档案
   */
  private async createTabInfo(page: any): Promise<any> {
    try {
      // 先安全地获取页面基本信息
      let url = 'unknown';
      let title = 'Unknown';

      try {
        url = await page.url();
        title = await page.title();
      } catch (error: any) {
        logger.warn(`获取页面基本信息失败: ${error.message}`, 'SmartTabManager');
      }

      // 深入页面内部，获取更详细的信息
      const pageInfo = await page.evaluate(() => {
        return {
          readyState: document.readyState,                    // 页面加载状态
          elementCount: document.querySelectorAll('*').length, // 页面元素总数
          interactiveCount: document.querySelectorAll(        // 可交互元素数量
            'button, input, a, select, textarea, [onclick], [role="button"]'
          ).length,
          hasContent: document.body ? document.body.innerText.trim().length > 100 : false, // 是否有实质内容
          timestamp: Date.now()
        };
      }).catch(() => ({
        // 如果页面执行失败，返回默认值
        readyState: 'loading',
        elementCount: 0,
        interactiveCount: 0,
        hasContent: false,
        timestamp: Date.now()
      }));

      return {
        id: this.generateTabId(page),
        page,
        url,
        title,
        ...pageInfo,
        lastUpdate: Date.now(),
        score: this.calculateTabScore(url, title, pageInfo)
      };
    } catch (error: any) {
      logger.warn(`⚠️ 创建标签页信息失败: ${error.message}`, 'SmartTabManager');
      // 即使失败也要返回基本信息，保证程序继续运行
      return {
        id: this.generateTabId(page),
        page,
        url: 'unknown',
        title: 'Unknown',
        readyState: 'loading',
        elementCount: 0,
        interactiveCount: 0,
        hasContent: false,
        lastUpdate: Date.now(),
        score: 0
      };
    }
  }

  /**
   * 验证标签页是否有效
   * 判断这个标签页是否值得我们关注，过滤掉那些没用的页面
   */
  private isValidTab(url: string, title: string): boolean {
    // 排除明显无效的URL，比如空白页、新标签页等
    if (!url || url === 'about:blank' || url === 'chrome://newtab/' || url === 'chrome-extension://') {
      return false;
    }

    // 排除浏览器内部页面，这些页面用户一般不会操作
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      return false;
    }

    // 对于正常的网页，即使标题为空也可能是有效的（可能还在加载中）
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // 但是要排除明显的错误页面
      if (title && (title.includes('404') || title.includes('Error') || title.includes('Not Found'))) {
        return false;
      }
      return true;
    }

    // 其他情况需要有有效的标题才认为是有效页面
    return title && title.trim() !== '' && title !== 'about:blank';
  }

  /**
   * 计算标签页评分（已废弃）
   * 这个方法现在不再使用，因为我们改用AI来做智能决策
   * 保留只是为了兼容性，避免破坏现有代码
   */
  private calculateTabScore(_url: string, _title: string, _pageInfo: any): number {
    // AI智能切换已经替代了传统的评分系统
    return 0;
  }

  /**
   * 分析标签页内容
   */
  async analyzeTab(page: any) {
    try {
      // 检查页面是否还存在且可访问
      if (!page || page.isClosed()) {
        return {
          url: 'unknown',
          title: 'Unknown',
          domain: 'unknown',
          pageType: 'unknown',
          hasErrors: true,
          contentLength: 0,
          interactiveElements: 0
        };
      }

      const analysis = await page.evaluate(() => {
        try {
        // 获取页面基本信息
        const getPageInfo = () => {
          return {
            url: window.location.href,
            title: document.title,
            domain: window.location.hostname,
            path: window.location.pathname,
            isLoading: document.readyState !== 'complete'
          };
        };

        // 分析页面内容
        const analyzeContent = () => {
          const forms = document.querySelectorAll('form');
          const inputs = document.querySelectorAll('input, textarea, select');
          const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"]');
          const links = document.querySelectorAll('a[href]');
          const images = document.querySelectorAll('img');
          
          // 检测页面类型
          let pageType = 'unknown';
          if (forms.length > 0) pageType = 'form';
          else if (links.length > 20) pageType = 'navigation';
          else if (images.length > 10) pageType = 'media';
          else if (document.querySelector('table')) pageType = 'data';
          
          // 获取可见文本
          const getVisibleText = () => {
            try {
              if (!document.body) return '';

              const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                {
                  acceptNode: (node: any) => {
                    try {
                      const parent = node.parentElement;
                      if (!parent) return NodeFilter.FILTER_REJECT;

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
              let node: Node | null;
              while ((node = walker.nextNode()) !== null) {
                text += (node.textContent || '').trim() + ' ';
              }
              return text.substring(0, 1000); // 限制长度
            } catch (textError) {
              return '';
            }
          };

          return {
            pageType,
            elementCounts: {
              forms: forms.length,
              inputs: inputs.length,
              buttons: buttons.length,
              links: links.length,
              images: images.length
            },
            visibleText: getVisibleText(),
            hasErrors: !!document.querySelector('.error, .alert-danger, [class*="error"]'),
            hasSuccess: !!document.querySelector('.success, .alert-success, [class*="success"]')
          };
        };

          return {
            ...getPageInfo(),
            ...analyzeContent()
          };
        } catch (evalError) {
          // 如果页面执行失败，返回基本信息
          return {
            url: window.location?.href || 'unknown',
            title: document?.title || 'Unknown',
            domain: window.location?.hostname || 'unknown',
            path: window.location?.pathname || '/',
            isLoading: true,
            pageType: 'unknown',
            elementCounts: { forms: 0, inputs: 0, buttons: 0, links: 0, images: 0 },
            visibleText: '',
            hasErrors: true,
            hasSuccess: false
          };
        }
      }).catch(() => {
        // 如果evaluate完全失败，返回默认值
        return {
          url: 'unknown',
          title: 'Unknown',
          domain: 'unknown',
          path: '/',
          isLoading: true,
          pageType: 'unknown',
          elementCounts: { forms: 0, inputs: 0, buttons: 0, links: 0, images: 0 },
          visibleText: '',
          hasErrors: true,
          hasSuccess: false
        };
      });

      return analysis;

    } catch (error: any) {
      logger.warn(`⚠️ 分析标签页失败: ${error.message}`, 'SmartTabManager');
      return {
        url: 'unknown',
        title: 'Unknown',
        domain: 'unknown',
        path: '/',
        isLoading: false,
        pageType: 'unknown',
        elementCounts: { forms: 0, inputs: 0, buttons: 0, links: 0, images: 0 },
        visibleText: '',
        hasErrors: false,
        hasSuccess: false
      };
    }
  }

  /**
   * 🧠 AI智能切换标签页 - 基于AI决策而非硬编码评分
   */
  async aiSwitchTab(targetTabId: string): Promise<any> {
    try {
      if (this.tabs.size === 0) {
        logger.warn('⚠️ 没有可用的标签页', 'SmartTabManager');
        return null;
      }

      // 查找目标标签页
      let targetTab = null;
      for (const tabInfo of this.tabs.values()) {
        if (tabInfo.id === targetTabId) {
          targetTab = tabInfo;
          break;
        }
      }

      if (!targetTab) {
        logger.warn(`⚠️ 未找到目标标签页: ${targetTabId}`, 'SmartTabManager');
        return null;
      }

      if (targetTab.page !== this.activeTab) {
        logger.info(`🧠 AI决策切换到标签页: ${targetTab.title} (ID: ${targetTabId})`, 'SmartTabManager');

        const oldActiveTab = this.activeTab;
        this.activeTab = targetTab.page;

        // 确保页面可见
        await this.activeTab.bringToFront();
        await this.sleep(500);

        // 立即通知页面变化回调
        if (this.pageChangeCallback && oldActiveTab !== this.activeTab) {
          try {
            await this.pageChangeCallback(this.activeTab);
            logger.info('✅ 页面变化回调已执行', 'SmartTabManager');
          } catch (error: any) {
            logger.error(`❌ 页面变化回调执行失败: ${error.message}`, error, 'SmartTabManager');
          }
        }

        return this.activeTab;
      }

      logger.info('ℹ️ 目标标签页已经是当前活动页面', 'SmartTabManager');
      return this.activeTab;

    } catch (error: any) {
      logger.error(`❌ AI切换标签页失败: ${error.message}`, error, 'SmartTabManager');
      return this.activeTab;
    }
  }

  /**
   * 传统智能切换标签页（已废弃）
   * 这个方法已经不再使用，现在我们用AI来做智能决策
   * 保留只是为了兼容性，避免破坏现有代码
   */
  async smartSwitchTab(_criteria: any = {}) {
    // AI智能切换已经替代了传统的评分系统
    logger.debug('⚠️ 传统smartSwitchTab已废弃，请使用aiSwitchTab', 'SmartTabManager');
    return this.activeTab;
  }

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }



  /**
   * 生成标签页ID
   * 为每个标签页创建一个唯一的标识符，就像给每个人发身份证一样
   */
  generateTabId(page: any) {
    return `tab_${page._guid || Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 清理已关闭的标签页
   */
  cleanupClosedTabs(activePagesArray: any[]) {
    const activePageGuids = new Set(activePagesArray.map(p => p._guid));
    
    for (const [tabId, tab] of this.tabs.entries()) {
      if (!activePageGuids.has(tab.page._guid)) {
        this.tabs.delete(tabId);
        logger.info(`🗑️ 清理已关闭的标签页: ${tabId}`, 'SmartTabManager');
      }
    }
  }

  /**
   * 获取所有标签页信息
   */
  getAllTabs() {
    return Array.from(this.tabs.values());
  }

  /**
   * 获取当前活动标签页
   */
  getActiveTab() {
    return this.activeTab;
  }

  /**
   * 获取当前活动页面对象
   * 🎯 修复：this.activeTab 直接就是页面对象，不需要 .page
   */
  getActiveTabPage() {
    return this.activeTab;
  }

  /**
   * 🧠 获取所有标签页信息供AI决策使用
   */
  getAllTabsForAI(): any[] {
    const tabsInfo = [];

    for (const tabInfo of this.tabs.values()) {
      tabsInfo.push({
        id: tabInfo.id || this.generateTabId(tabInfo.page),
        title: tabInfo.title || 'Unknown',
        url: tabInfo.url || 'unknown',
        domain: tabInfo.domain || 'unknown',
        pageType: tabInfo.pageType || 'unknown',
        isActive: tabInfo.page === this.activeTab,
        hasContent: tabInfo.hasContent || false,
        elementCount: tabInfo.elementCount || 0,
        interactiveCount: tabInfo.interactiveCount || 0,
        readyState: tabInfo.readyState || 'unknown',
        lastUpdate: tabInfo.lastUpdate || 0
      });
    }

    return tabsInfo;
  }

  /**
   * 🎯 获取当前活动标签页ID
   */
  getActiveTabId(): string | null {
    if (!this.activeTab) return null;

    for (const tabInfo of this.tabs.values()) {
      if (tabInfo.page === this.activeTab) {
        return tabInfo.id || this.generateTabId(tabInfo.page);
      }
    }

    return null;
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.monitoringActive = false;
    logger.info('🛑 智能标签页管理器已停止', 'SmartTabManager');
  }
}
