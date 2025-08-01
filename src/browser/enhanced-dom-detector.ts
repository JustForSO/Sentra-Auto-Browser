import { logger } from '../utils/logger';
import { DOMService } from '../dom/service';
import { PageStateMonitor } from './page-state-monitor';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 增强DOM检测器 - 页面元素的智能识别专家
 * 能够智能缓存、动态更新、精准定位页面中的可交互元素
 */
export class EnhancedDOMDetector {
  private page: any;
  private domService: DOMService;
  private pageStateMonitor: PageStateMonitor;
  private elementCache: Map<string, any> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();
  private lastPageState: any = null;
  private detectionInProgress: boolean = false;
  private cacheValidityDuration: number = 30000; // 30秒缓存有效期
  private buildDomTreeScript: string = '';

  constructor(page: any, pageStateMonitor: PageStateMonitor) {
    this.page = page;
    this.domService = new DOMService(page);
    this.pageStateMonitor = pageStateMonitor;

    // 加载DOM分析脚本
    try {
      const scriptPath = path.join(__dirname, '../dom/buildDomTree.js');
      this.buildDomTreeScript = fs.readFileSync(scriptPath, 'utf8');
      logger.info('✅ DOM分析脚本加载成功', 'EnhancedDOMDetector');
    } catch (error) {
      logger.error('❌ 加载DOM分析脚本失败', error as Error, 'EnhancedDOMDetector');
      this.buildDomTreeScript = '';
    }

    // 监听页面状态变化
    this.pageStateMonitor.addChangeListener(this.onPageStateChange.bind(this));
  }

  async detectElements(forceRefresh: boolean = false) {
    try {
      // Check cache first (unless force refresh)
      const pageUrl = await this.page.url();
      if (!forceRefresh && this.cacheTimestamps.has(pageUrl)) {
        const cacheTime = this.cacheTimestamps.get(pageUrl)!;
        const now = Date.now();

        if (now - cacheTime < this.cacheValidityDuration) {
          const cached = this.elementCache.get(pageUrl);
          if (cached) {
            logger.debug(`Using cached DOM elements for page ${pageUrl}`, 'EnhancedDOMDetector');
            return cached;
          }
        }
      }

      if (this.detectionInProgress) {
        logger.info('🔄 检测正在进行中，等待完成...', 'EnhancedDOMDetector');
        return await this.waitForDetectionComplete();
      }

      this.detectionInProgress = true;

      const currentState = this.pageStateMonitor.getCurrentState();

      logger.info('🔍 开始新的DOM元素检测...', 'EnhancedDOMDetector');
      
      // 等待页面稳定
      await this.waitForPageStability();

      // 🚀 直接使用 buildDomTree.js 进行DOM检测，避免 service.ts 的复杂逻辑
      const domAnalysis = await this.executeBuildDomTree();

      if (!domAnalysis || !domAnalysis.success) {
        logger.warn('buildDomTree.js 执行失败，回退到 DOMService', 'EnhancedDOMDetector');

        // 🎯 在回退之前，清除所有可能的重复索引标记
        await this.page.evaluate(() => {
          console.log('🧹 清除所有现有的 data-browser-use-index 属性，准备回退到 DOMService');
          const elementsWithIndex = document.querySelectorAll('[data-browser-use-index]');
          elementsWithIndex.forEach(el => {
            el.removeAttribute('data-browser-use-index');
          });

          // 同时清除可视化标记
          const oldMarkers = document.querySelectorAll('.browser-use-marker');
          oldMarkers.forEach(marker => marker.remove());
        });

        // 回退到原来的方法
        const domState = await this.domService.getDOMState();
        const enhancedElements = await this.enhanceElements(domState.elements);

        const result = {
          elements: enhancedElements,
          url: domState.url || this.page.url(),
          title: domState.title || await this.page.title(),
          screenshot: domState.screenshot || '',
          detectionTime: Date.now(),
          pageState: currentState
        };

        // 🎯 不再使用缓存机制

        // 🎯 回退情况下需要添加可视化标记，因为 DOMService.fallbackDOMAnalysis()
        // 只设置了 data-browser-use-index 属性，但没有创建可视化标记
        await this.addPageMarkers(enhancedElements);

        this.detectionInProgress = false;
        return result;
      }

      // 🎯 处理 buildDomTree.js 的结果
      const enhancedElements = domAnalysis.elements || [];

      // 🎯 确保结果包含必要的属性，使用最新的页面引用
      const currentPage = this.page;
      const result = {
        elements: enhancedElements,
        url: currentPage ? currentPage.url() : 'unknown',
        title: currentPage ? await currentPage.title() : 'unknown',
        screenshot: '', // buildDomTree.js 不提供截图，如需要可以单独获取
        detectionTime: Date.now(),
        pageState: currentState
      };
      
      // 🎯 不再使用缓存机制

      // 🎯 不需要添加页面标记，因为 buildDomTree.js 已经创建了完整的可视化标记
      // buildDomTree.js 会创建：
      // 1. data-browser-use-index 属性
      // 2. 彩色边框覆盖层
      // 3. 数字标签 (playwright-highlight-label)
      // await this.addPageMarkers(enhancedElements); // ❌ 移除重复的标记

      logger.info(`✅ DOM检测完成: ${enhancedElements.length}个元素 (buildDomTree.js已添加可视化标记)`, 'EnhancedDOMDetector');
      
      this.detectionInProgress = false;
      return result;
      
    } catch (error: any) {
      logger.error(`❌ DOM检测失败: ${error.message}`, error, 'EnhancedDOMDetector');
      this.detectionInProgress = false;
      throw error;
    }
  }

  /**
   * 🚀 直接执行 buildDomTree.js 脚本
   */
  private async executeBuildDomTree(): Promise<any> {
    if (!this.buildDomTreeScript) {
      logger.error('buildDomTree.js 脚本未加载', new Error('Script not loaded'), 'EnhancedDOMDetector');
      return null;
    }

    try {
      const args = {
        doHighlightElements: true,
        focusHighlightIndex: -1,
        viewportExpansion: 0,
        debugMode: false,
      };

      logger.info(`🔧 执行 buildDomTree.js，参数: ${JSON.stringify(args)}`, 'EnhancedDOMDetector');

      // 🎯 确保使用最新的页面引用，防止页面跳转后使用旧页面
      const currentPage = this.page;
      if (!currentPage) {
        logger.error('页面引用为空', new Error('Page reference is null'), 'EnhancedDOMDetector');
        return null;
      }

      // 验证页面是否有效
      try {
        await currentPage.url(); // 测试页面是否可访问
      } catch (error) {
        logger.error('页面引用无效，可能已关闭', error as Error, 'EnhancedDOMDetector');
        return null;
      }

      const domAnalysis = await currentPage.evaluate((params: any) => {
        try {
          // 清除之前的函数定义
          delete (window as any).buildDomTreeFunction;

          // buildDomTree.js 是一个箭头函数表达式
          (window as any).buildDomTreeFunction = eval(`(${params.domScript})`);

          // 检查函数是否被定义
          if (typeof (window as any).buildDomTreeFunction !== 'function') {
            return { error: 'buildDomTreeFunction not defined after script execution' };
          }

          // 调用函数
          const result = (window as any).buildDomTreeFunction(params.args);

          // 🎯 转换结果格式，buildDomTree.js 返回 { rootId, map: DOM_HASH_MAP }
          if (result && result.map && typeof result.map === 'object') {
            const elements = [];

            // 遍历 DOM_HASH_MAP 提取交互元素
            for (const [id, nodeData] of Object.entries(result.map)) {
              const node = nodeData as any;

              // 只包含有 highlightIndex 的交互元素
              if (node.highlightIndex !== undefined && node.highlightIndex !== null) {
                elements.push({
                  index: node.highlightIndex,
                  tag: node.tagName?.toLowerCase() || 'unknown',
                  text: node.text || '',
                  attributes: node.attributes || {},
                  xpath: node.xpath || '',
                  isClickable: node.isClickable || false,
                  isVisible: node.isVisible || false,
                  cssSelector: `[data-browser-use-index="${node.highlightIndex}"]`,
                  interactionType: node.interactionType || 'none',
                  isInputElement: node.isInputElement || false,
                  isClickableOnly: node.isClickableOnly || false
                });
              }
            }

            // 按索引排序
            elements.sort((a, b) => a.index - b.index);

            return {
              success: true,
              elements: elements
            };
          }

          return { success: false, error: 'Invalid result format or no DOM map returned' };
        } catch (error: any) {
          console.error('DOM script evaluation error:', error);
          return { error: error.message, stack: error.stack };
        }
      }, { args, domScript: this.buildDomTreeScript });

      if (domAnalysis && domAnalysis.error) {
        logger.error(`buildDomTree.js 内部错误: ${domAnalysis.error}`, new Error(domAnalysis.error), 'EnhancedDOMDetector');
        return null;
      }

      if (domAnalysis && domAnalysis.success) {
        logger.info(`✅ buildDomTree.js 执行成功: ${domAnalysis.elements.length}个元素`, 'EnhancedDOMDetector');
        return domAnalysis;
      }

      return null;
    } catch (error) {
      logger.error('执行 buildDomTree.js 失败', error as Error, 'EnhancedDOMDetector');
      return null;
    }
  }

  /**
   * 获取最后有效的缓存结果
   */
  private getLastValidCacheResult(): any {
    // 返回最近的有效缓存
    for (const [cacheKey, result] of this.elementCache.entries()) {
      if (this.isCacheValid(cacheKey)) {
        logger.info('📋 返回最后有效的缓存结果', 'EnhancedDOMDetector');
        return result;
      }
    }

    // 如果没有有效缓存，返回空结果
    logger.warn('⚠️ 没有有效的缓存结果，返回空结果', 'EnhancedDOMDetector');
    return {
      elements: [],
      url: this.page?.url() || '',
      title: '',
      screenshot: '',
      detectionTime: Date.now(),
      pageState: null
    };
  }

  /**
   * 页面状态变化处理
   */
  async onPageStateChange(_oldState: any, newState: any, eventType: string) {
    try {


      logger.info(`🔄 页面状态变化，清理DOM缓存: ${eventType}`, 'EnhancedDOMDetector');

      // 清理所有缓存
      this.invalidateAllCache();

      // 如果是重大变化，重新检测
      if (newState.hasNewContent) {
        logger.info('🔄 检测到新内容，重新分析页面元素...', 'EnhancedDOMDetector');
        await this.detectElements(true);
      }
      
    } catch (error: any) {
      logger.error(`❌ 处理页面状态变化失败: ${error.message}`, error, 'EnhancedDOMDetector');
    }
  }

  /**
   * 增强元素信息
   */
  async enhanceElements(elements: any[]) {
    try {
      const enhancedElements = [];
      
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        
        try {
          // 获取元素的额外信息
          const enhancement = await this.page.evaluate((index: number) => {
            const elements = document.querySelectorAll('[data-browser-use-index]');
            const el = elements[index];
            
            if (!el) return null;
            
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            
            return {
              isVisible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none',
              isInViewport: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth,
              isClickable: el.tagName.toLowerCase() === 'button' || 
                          el.tagName.toLowerCase() === 'a' || 
                          (el as any).onclick !== null ||
                          el.getAttribute('role') === 'button' ||
                          style.cursor === 'pointer',
              isEditable: el.tagName.toLowerCase() === 'input' || 
                         el.tagName.toLowerCase() === 'textarea' || 
                         (el as any).contentEditable === 'true',
              hasText: el.textContent && el.textContent.trim().length > 0,
              backgroundColor: style.backgroundColor,
              color: style.color,
              fontSize: style.fontSize,
              zIndex: style.zIndex
            };
          }, i);
          
          if (enhancement) {
            enhancedElements.push({
              ...element,
              ...enhancement,
              priority: this.calculateElementPriority(element, enhancement)
            });
          } else {
            enhancedElements.push(element);
          }
          
        } catch (error: any) {
          logger.warn(`⚠️ 增强元素 ${i} 失败: ${error.message}`, 'EnhancedDOMDetector');
          enhancedElements.push(element);
        }
      }
      
      return enhancedElements;
      
    } catch (error: any) {
      logger.error(`❌ 增强元素信息失败: ${error.message}`, error, 'EnhancedDOMDetector');
      return elements;
    }
  }

  /**
   * 计算元素优先级
   */
  calculateElementPriority(element: any, enhancement: any) {
    let priority = 0;
    
    // 可见性
    if (enhancement.isVisible) priority += 10;
    if (enhancement.isInViewport) priority += 15;
    
    // 交互性
    if (enhancement.isClickable) priority += 20;
    if (enhancement.isEditable) priority += 25;
    
    // 内容
    if (enhancement.hasText) priority += 5;
    
    // 元素类型
    const tag = element.tag?.toLowerCase() || '';
    if (tag === 'button') priority += 15;
    else if (tag === 'input') priority += 12;
    else if (tag === 'a') priority += 10;
    else if (tag === 'select') priority += 8;
    
    // 特殊属性
    if (element.attributes?.type === 'submit') priority += 10;
    if (element.attributes?.role === 'button') priority += 8;
    
    return priority;
  }

  /**
   * 添加页面标记 - 增强版本，确保标记持久性
   */
  async addPageMarkers(elements: any[]) {
    try {
      // 🎯 确保使用最新的页面引用
      const currentPage = this.page;
      if (!currentPage) {
        logger.warn('页面引用为空，跳过添加标记', 'EnhancedDOMDetector');
        return;
      }

      await currentPage.evaluate((elementsData: any[]) => {
        // 🎯 只清除旧的可视化标记，不动 data-browser-use-index 属性
        // 因为索引属性应该由 buildDomTree.js 或 DOMService 统一管理
        const oldMarkers = document.querySelectorAll('.browser-use-marker');
        oldMarkers.forEach(marker => marker.remove());

        console.log('🎨 EnhancedDOMDetector: 添加可视化标记，使用现有的索引');

        // 添加可视化标记 - 使用 buildDomTree.js 设置的索引
        elementsData.forEach((elementData) => {
          try {
            // 使用元素自己的索引，而不是数组索引
            const elementIndex = elementData.index || elementData.highlightIndex;
            if (elementIndex === undefined) return;

            const element = document.querySelector(`[data-browser-use-index="${elementIndex}"]`);

            if (!element) return;

            const rect = element.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            const marker = document.createElement('div');
            marker.className = 'browser-use-marker';
            marker.textContent = elementIndex.toString();

            // 根据元素类型设置颜色
            let color = '#007bff'; // 默认蓝色
            if (elementData.isClickable) color = '#28a745'; // 绿色
            if (elementData.isInputElement) color = '#ffc107'; // 黄色（输入元素）
            if (elementData.isClickableOnly) color = '#17a2b8'; // 青色（仅可点击）

            marker.style.cssText = `
              position: fixed;
              top: ${rect.top + window.scrollY - 2}px;
              left: ${rect.left + window.scrollX - 2}px;
              background: ${color};
              color: white;
              padding: 2px 6px;
              border-radius: 3px;
              font-size: 12px;
              font-weight: bold;
              z-index: 10000;
              pointer-events: none;
              font-family: monospace;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            `;

            document.body.appendChild(marker);
          } catch (error) {
            console.warn('添加标记失败:', error);
          }
        });
      }, elements);

      logger.info(`🎨 已添加 ${elements.length} 个页面标记（增强持久性）`, 'EnhancedDOMDetector');

    } catch (error: any) {
      logger.warn(`⚠️ 添加页面标记失败: ${error.message}`, 'EnhancedDOMDetector');
    }
  }

  /**
   * 等待页面稳定
   */
  async waitForPageStability() {
    try {
      await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 });
      await this.page.waitForTimeout(1000); // 额外等待动态内容
    } catch (error: any) {
      logger.warn(`⚠️ 等待页面稳定超时: ${error.message}`, 'EnhancedDOMDetector');
    }
  }

  /**
   * 生成缓存键
   */
  generateCacheKey(pageState: any) {
    return `${pageState.url}_${pageState.domHash}_${pageState.timestamp}`;
  }

  /**
   * 检查缓存是否有效
   */
  isCacheValid(cacheKey: string) {
    if (!this.elementCache.has(cacheKey)) return false;
    
    const timestamp = this.cacheTimestamps.get(cacheKey);
    if (!timestamp) return false;
    
    return (Date.now() - timestamp) < this.cacheValidityDuration;
  }

  /**
   * 更新缓存
   */
  updateCache(cacheKey: string, result: any) {
    this.elementCache.set(cacheKey, result);
    this.cacheTimestamps.set(cacheKey, Date.now());
    
    // 清理过期缓存
    this.cleanupExpiredCache();
  }

  /**
   * 清理过期缓存
   */
  cleanupExpiredCache() {
    const now = Date.now();
    
    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if (now - timestamp > this.cacheValidityDuration) {
        this.elementCache.delete(key);
        this.cacheTimestamps.delete(key);
      }
    }
  }

  /**
   * 失效所有缓存
   */
  invalidateAllCache() {
    this.elementCache.clear();
    this.cacheTimestamps.clear();
    logger.info('🗑️ 已清理所有DOM缓存', 'EnhancedDOMDetector');
  }

  /**
   * 等待检测完成
   */
  async waitForDetectionComplete() {
    while (this.detectionInProgress) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 返回最新的缓存结果
    const currentState = this.pageStateMonitor.getCurrentState();
    const cacheKey = this.generateCacheKey(currentState);
    return this.elementCache.get(cacheKey);
  }
}
