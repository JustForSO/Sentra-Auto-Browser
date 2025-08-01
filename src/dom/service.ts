import { DOMState, DOMElement } from '../types';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

// 元素定位器接口 - 用于精确定位页面元素
export interface ElementLocator {
  index?: number;           // 元素在列表中的索引
  xpath?: string;           // XPath选择器
  cssSelector?: string;     // CSS选择器
  text?: string;            // 元素文本内容
  attributes?: Record<string, string>; // 元素属性
}

// 增强的DOM元素接口 - 包含更多智能分析信息
export interface EnhancedDOMElement extends DOMElement {
  cssSelector?: string;     // CSS选择器
  isTopElement?: boolean;   // 是否为顶层元素
  isInViewport?: boolean;   // 是否在视窗内
  boundingRect?: DOMRect;   // 元素边界矩形
  computedStyle?: CSSStyleDeclaration; // 计算样式
  highlightIndex?: number;  // 高亮索引
  shadowRoot?: boolean;     // 是否有Shadow DOM
  isInteractive?: boolean;  // 是否可交互
  priority?: number;        // 优先级（越高越重要）

  // 元素交互类型分类 - 帮助AI理解如何与元素交互
  interactionType?: 'input' | 'click' | 'interactive' | 'none';
  isInputElement?: boolean;    // 是否为输入元素
  isClickableOnly?: boolean;   // 是否只能点击
}

export interface DOMTreeNode {
  id: string;
  tagName: string;
  attributes: Record<string, string>;
  xpath: string;
  children: string[];
  isVisible?: boolean;
  isTopElement?: boolean;
  isInteractive?: boolean;
  shadowRoot?: boolean;
}

export interface PerformanceMetrics {
  totalNodes: number;
  processedNodes: number;
  skippedNodes: number;
  domOperations: Record<string, number>;
  domOperationCounts: Record<string, number>;
  timingBreakdown: Record<string, number>;
}

/**
 * DOM服务 - 页面元素的分析专家
 * 负责解析页面结构，识别可交互元素，提供元素定位服务
 */
export class DOMService {
  private page: any;
  private elementCache = new Map<string, EnhancedDOMElement>();
  private xpathCache = new Map<Element, string>();
  private visibilityCache = new Map<Element, boolean>();
  private domHashMap = new Map<string, DOMTreeNode>();
  private selectorMap = new Map<string, string>();
  private performanceMetrics: PerformanceMetrics;

  private buildDomTreeScript: string;

  constructor(page: any) {
    this.page = page;
    this.performanceMetrics = {
      totalNodes: 0,
      processedNodes: 0,
      skippedNodes: 0,
      domOperations: {},
      domOperationCounts: {},
      timingBreakdown: {}
    };

    // 加载buildDomTree.js脚本
    try {
      const scriptPath = path.join(__dirname, 'buildDomTree.js');
      this.buildDomTreeScript = fs.readFileSync(scriptPath, 'utf8');
    } catch (error) {
      logger.error('Failed to load buildDomTree.js', error as Error, 'DOMService');
      this.buildDomTreeScript = '';
    }
  }

  /**
   * 更新页面引用
   */
  updatePage(page: any) {
    this.page = page;
    // 清理缓存，因为页面已经改变
    this.clearCaches();
  }

  /**
   * 优化的DOM状态获取 - 使用buildDomTree.js
   */
  async getOptimizedDOMState(): Promise<DOMState> {
    logger.info('🚀 开始优化DOM检测...', 'DOMService');
    const startTime = Date.now();

    try {
      // 使用buildDomTree.js进行DOM分析，优化参数
      const args = {
        doHighlightElements: true,
        focusHighlightIndex: -1,
        viewportExpansion: 0, // 只检测视口内元素，提高性能
        debugMode: false, // 关闭调试模式提高性能
      };

      let domAnalysis: any;
      try {
        logger.info(`执行buildDomTree.js，参数: ${JSON.stringify(args)}`, 'DOMService');

        // 安全执行DOM分析脚本
        domAnalysis = await this.page.evaluate((scriptContent, evalArgs) => {
          try {
            // 动态创建并执行分析函数
            const buildDomTreeFunction = eval(`(${scriptContent})`);
            return buildDomTreeFunction(evalArgs);
          } catch (error) {
            console.error('buildDomTree执行错误:', error);
            return null;
          }
        }, this.buildDomTreeScript, args);

      } catch (error) {
        logger.error('buildDomTree.js执行失败', error as Error, 'DOMService');
        throw error;
      }

      if (!domAnalysis || !domAnalysis.success) {
        logger.warn('adaptedBuildDomTree.js执行失败或返回空结果', 'DOMService');
        return {
          elements: [],
          url: this.page.url(),
          title: await this.page.title(),
          screenshot: ''
        };
      }

      // 直接使用适配版本返回的elements数组，包含新的元素类型信息
      const elements = domAnalysis.elements.map((element: any) => ({
        index: element.index,
        tag: element.tag,
        text: this.cleanText(element.text || ''),
        attributes: element.attributes || {},
        xpath: element.xpath || '',
        isClickable: element.isClickable || false,
        isVisible: element.isVisible || false,
        cssSelector: `[data-browser-use-index="${element.index}"]`,
        // 新增：元素交互类型信息
        interactionType: element.interactionType || 'none',
        isInputElement: element.isInputElement || false,
        isClickableOnly: element.isClickableOnly || false
      }));

      // 更新缓存
      this.elementCache.clear();
      elements.forEach((element: any) => {
        this.elementCache.set(`index_${element.index}`, element);
      });

      const endTime = Date.now();
      logger.info(`✅ 优化DOM检测完成: ${elements.length}个元素, 耗时: ${endTime - startTime}ms`, 'DOMService');

      return {
        elements,
        url: this.page.url(),
        title: await this.page.title(),
        screenshot: ''
      };

    } catch (error) {
      logger.error('优化DOM检测失败', error as Error, 'DOMService');
      // 回退到标准检测
      return await this.getDOMState();
    }
  }

  async getDOMState(focusElement: number = -1, viewportExpansion: number = 0): Promise<DOMState> {
    try {
      // Clear caches for fresh analysis
      this.clearCaches();

      // 快速SPA导航检测
      await this.page.waitForTimeout(500);

      // 快速网络空闲检测
      try {
        await this.page.waitForLoadState('networkidle', { timeout: 2000 });
        logger.info('✅ Network idle achieved before DOM analysis', 'DOMService');
      } catch (networkError) {
        logger.debug(`⚠️ Network idle timeout, continuing with DOM analysis`, 'DOMService');
      }

      // Force a page evaluation to ensure we're working with the latest DOM
      const pageInfo = await this.page.evaluate(() => {
        // Force a reflow to ensure DOM is up to date
        document.body.offsetHeight;

        // Debug: Check what's actually in the page
        const bodyText = document.body.innerText.substring(0, 500);
        const title = document.title;
        const url = window.location.href;

        // Check for various search result indicators
        const searchResultSelectors = [
          '.search-result', '.video-item', '.bili-video-card',
          '.search-page', '[class*="search"]', '[class*="video"]',
          '.video-list', '.result-item', '.card-box'
        ];

        let hasSearchResults = false;
        let foundSelector = '';
        for (const selector of searchResultSelectors) {
          if (document.querySelector(selector)) {
            hasSearchResults = true;
            foundSelector = selector;
            break;
          }
        }

        // Also check if body text indicates search results
        const hasSearchContent = bodyText.includes('搞笑视频') ||
                                bodyText.includes('搜索结果') ||
                                bodyText.includes('视频') ||
                                !bodyText.includes('首页');

        return {
          url,
          title,
          bodyText,
          hasSearchResults,
          foundSelector,
          hasSearchContent,
          bodyElementCount: document.body.children.length
        };
      });

      logger.info(`🔍 Page debug info: URL=${pageInfo.url}, Title=${pageInfo.title}`, 'DOMService');
      logger.info(`🔍 Body text preview: ${pageInfo.bodyText.substring(0, 200)}...`, 'DOMService');
      logger.info(`🔍 Has search results: ${pageInfo.hasSearchResults} (${pageInfo.foundSelector}), Search content: ${pageInfo.hasSearchContent}`, 'DOMService');
      logger.info(`🔍 Body children: ${pageInfo.bodyElementCount}`, 'DOMService');

      // Get basic page info
      const url = this.page.url();
      const title = await this.page.title();

      // Handle empty page
      if (url === 'about:blank') {
        return {
          elements: [],
          url,
          title,
          screenshot: '',
        };
      }

      // Get enhanced clickable elements using the complete DOM analysis
      const elements = await this.buildCompleteDOM(focusElement, viewportExpansion);

      // Take screenshot
      const screenshot = await this.page.screenshot({
        type: 'png',
        fullPage: false
      });

      return {
        elements,
        url,
        title,
        screenshot: screenshot.toString('base64'),
      };
    } catch (error) {
      logger.error('Failed to get DOM state', error as Error, 'DOMService');
      throw error;
    }
  }

  private clearCaches(): void {
    this.elementCache.clear();
    this.xpathCache.clear();
    this.visibilityCache.clear();
    this.domHashMap.clear();
    this.selectorMap.clear();
  }

  private async buildCompleteDOM(focusElement: number = -1, viewportExpansion: number = 0): Promise<EnhancedDOMElement[]> {
    try {
      // Read the JavaScript version DOM analysis script
      const fs = require('fs');
      const path = require('path');
      const scriptPath = path.join(__dirname, 'buildDomTree.js');

      if (!fs.existsSync(scriptPath)) {
        logger.error(`buildDomTree.js not found at ${scriptPath}`, new Error('Script file missing'), 'DOMService');
        return this.fallbackDOMAnalysis();
      }

      const domScript = fs.readFileSync(scriptPath, 'utf8');

      const args = {
        doHighlightElements: true,
        focusHighlightIndex: focusElement,
        viewportExpansion: -1, // Force all interactive elements to get highlightIndex
        debugMode: true, // Enable debug mode to see what's happening
      };

      let domAnalysis;
      try {
        logger.info(`执行DOM分析脚本，参数: ${JSON.stringify(args)}`, 'DOMService');

        // Correct way to use Playwright page.evaluate with external script:
        // 1. Use page.addScriptTag to inject the script into the page
        // 2. Then call the function that was defined in the page context

        // Clear any previous script injection and inject fresh script
        await this.page.evaluate(() => {
          // Clear previous function if it exists
          delete (window as any).buildDomTreeFunction;
        });

        // 尝试直接在页面上下文中执行脚本，避免CSP问题
        try {
          domAnalysis = await this.page.evaluate((params: any) => {
            try {
              // 清除之前的函数定义
              delete (window as any).buildDomTreeFunction;

              // buildDomTree.js 是一个箭头函数表达式，需要将其赋值给 window.buildDomTreeFunction
              // 脚本格式: (args = {...}) => { ... }
              (window as any).buildDomTreeFunction = eval(`(${params.domScript})`);

              // 检查函数是否被定义
              if (typeof (window as any).buildDomTreeFunction !== 'function') {
                return { error: 'buildDomTreeFunction not defined after script execution' };
              }

              // 调用函数
              return (window as any).buildDomTreeFunction(params.args);
            } catch (error: any) {
              console.error('DOM script evaluation error:', error);
              return { error: error.message, stack: error.stack };
            }
          }, { args, domScript });

          // 检查是否有错误
          if (domAnalysis && domAnalysis.error) {
            logger.error(`DOM script internal error: ${domAnalysis.error}`, new Error(domAnalysis.error), 'DOMService');
            logger.warn('Using fallback DOM analysis', 'DOMService');
            return this.fallbackDOMAnalysis();
          }

        } catch (cspError) {
          // 如果CSP阻止，使用备用方法
          logger.warn(`⚠️ CSP阻止脚本执行，使用备用DOM分析: ${cspError}`, 'DOMService');
          return this.fallbackDOMAnalysis();
        }

        logger.info(`DOM script returned: ${domAnalysis ? 'valid result' : 'null/undefined'}`, 'DOMService');

        if (domAnalysis) {
          if (domAnalysis.error) {
            logger.error(`DOM script internal error: ${domAnalysis.error}`, new Error(domAnalysis.error), 'DOMService');
            return this.fallbackDOMAnalysis();
          }
          logger.info(`DOM analysis keys: ${Object.keys(domAnalysis).join(', ')}`, 'DOMService');

          // Debug: Log the first few interactive elements to see what we're getting
          if (domAnalysis.map) {
            const interactiveElements = Object.values(domAnalysis.map).filter((el: any) => el.isInteractive);
            logger.info(`Found ${interactiveElements.length} interactive elements`, 'DOMService');

            // Log first 10 interactive elements for debugging
            interactiveElements.slice(0, 10).forEach((el: any, index) => {
              const textContent = this.extractTextFromNode(el, domAnalysis.map);
              logger.info(`Element ${index}: ${el.tagName} - ${JSON.stringify(el.attributes)} - text: "${textContent?.substring(0, 50) || 'no text'}"`, 'DOMService');
            });

            // Debug: Log structure of first interactive element
            if (interactiveElements.length > 0) {
              const firstEl = interactiveElements[0] as any;
              logger.info(`First element structure: ${JSON.stringify(Object.keys(firstEl))}`, 'DOMService');
              logger.info(`First element highlightIndex: ${firstEl.highlightIndex}`, 'DOMService');
              logger.info(`First element isInteractive: ${firstEl.isInteractive}`, 'DOMService');
            }
          }
        }
      } catch (error) {
        logger.error(`DOM script evaluation failed: ${error}`, error as Error, 'DOMService');
        return this.fallbackDOMAnalysis();
      }

      if (!domAnalysis) {
        logger.error('DOM analysis returned null/undefined', new Error('No DOM analysis result'), 'DOMService');
        return this.fallbackDOMAnalysis();
      }

      if (domAnalysis.error) {
        logger.error(`DOM analysis script error: ${domAnalysis.error}`, new Error(domAnalysis.error), 'DOMService');
        return this.fallbackDOMAnalysis();
      }

      if (!domAnalysis.map || !domAnalysis.rootId) {
        logger.error('DOM analysis missing required fields (map/rootId)', new Error('Invalid DOM analysis structure'), 'DOMService');
        return this.fallbackDOMAnalysis();
      }
      this.domHashMap.clear();
      this.selectorMap.clear();

      Object.keys(domAnalysis.map).forEach(id => {
        this.domHashMap.set(id, domAnalysis.map[id]);
      });

      // Build selector map from highlighted elements
      Object.keys(domAnalysis.map).forEach(id => {
        const node = domAnalysis.map[id];
        if (node.highlightIndex !== undefined) {
          this.selectorMap.set(node.highlightIndex.toString(), id);
        }
      });

      // Extract interactive elements directly from DOM analysis result
      const interactiveElements: EnhancedDOMElement[] = [];

      // Process all nodes from the DOM analysis map to find interactive ones
      let elementIndex = 0;
      Object.keys(domAnalysis.map).forEach(id => {
        const node = domAnalysis.map[id];

        // Include all interactive nodes, assign index if not present
        if (node.isInteractive) {
          const textContent = this.extractTextFromNode(node, domAnalysis.map);

          const element: EnhancedDOMElement = {
            index: node.highlightIndex !== undefined ? node.highlightIndex : elementIndex++,
            tag: node.tagName?.toLowerCase() || 'unknown',
            text: textContent,
            attributes: node.attributes || {},
            xpath: node.xpath || '',
            cssSelector: node.cssSelector || '',
            isVisible: node.isVisible || false,
            isClickable: true,
            isTopElement: true,
            highlightIndex: node.highlightIndex !== undefined ? node.highlightIndex : (elementIndex - 1),
            boundingRect: node.rect ? {
              x: node.rect.x || 0,
              y: node.rect.y || 0,
              width: node.rect.width || 0,
              height: node.rect.height || 0,
              top: node.rect.y || 0,
              bottom: (node.rect.y || 0) + (node.rect.height || 0),
              left: node.rect.x || 0,
              right: (node.rect.x || 0) + (node.rect.width || 0)
            } as DOMRect : undefined,
            isInViewport: node.isInViewport || false,
            // 🔧 修复：添加我们新增的元素分类字段
            interactionType: node.interactionType || 'none',
            isInputElement: node.isInputElement || false,
            isClickableOnly: node.isClickableOnly || false
          };

          interactiveElements.push(element);
        }
      });

      // Sort by highlight index to maintain order
      interactiveElements.sort((a, b) => a.index - b.index);

      // Cache the elements for later use
      interactiveElements.forEach(element => {
        this.elementCache.set(`index_${element.index}`, element);
        if (element.cssSelector) {
          this.elementCache.set(`css_${element.cssSelector}`, element);
        }
      });

      return interactiveElements;

    } catch (error) {
      logger.error('Failed to build complete DOM', error as Error, 'DOMService');
      // Fallback to simple element detection
      return this.getEnhancedClickableElements(focusElement, viewportExpansion);
    }
  }

  private extractTextFromNode(node: any, domMap: any): string {
    if (!node || !domMap) return '';

    // If this is a text node, return its text directly
    if (node.type === 'TEXT_NODE' && node.text) {
      return node.text.trim();
    }

    // For element nodes, collect text from child text nodes
    const textParts: string[] = [];

    if (node.children && Array.isArray(node.children)) {
      for (const childId of node.children) {
        const childNode = domMap[childId];
        if (childNode) {
          if (childNode.type === 'TEXT_NODE' && childNode.text) {
            const text = childNode.text.trim();
            if (text) {
              textParts.push(text);
            }
          } else {
            // Recursively get text from child elements
            const childText = this.extractTextFromNode(childNode, domMap);
            if (childText) {
              textParts.push(childText);
            }
          }
        }
      }
    }

    return textParts.join(' ').trim();
  }

  /**
   * 清理文本内容
   */
  private cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  private calculateElementPriority(tagName: string, attributes: Record<string, string>, text: string): number {
    let priority = 0;

    // Higher priority for common interactive elements
    switch (tagName) {
      case 'button': priority += 10; break;
      case 'a': priority += 8; break;
      case 'input': priority += 7; break;
      case 'select': priority += 6; break;
      case 'textarea': priority += 5; break;
      default: priority += 1;
    }

    // Boost for important attributes
    if (attributes.id) priority += 3;
    if (attributes.role) priority += 2;
    if (attributes['aria-label']) priority += 2;
    if (attributes.href) priority += 2;

    // Boost for meaningful text
    if (text && text.length > 0) {
      priority += Math.min(text.length / 10, 3);
    }

    return priority;
  }

  private async getEnhancedClickableElements(focusElement: number = -1, viewportExpansion: number = 0): Promise<EnhancedDOMElement[]> {
    try {
      const elements = await this.page.evaluate((args) => {
        const { focusElement, viewportExpansion } = args;
        const results: any[] = [];
        let highlightIndex = 0;

        function isElementVisible(element: Element, expansion: number = 0): boolean {
          try {
            // Use checkVisibility if available (modern browsers)
            if ('checkVisibility' in element) {
              const isVisible = (element as any).checkVisibility({
                checkOpacity: true,
                checkVisibilityCSS: true,
              });
              if (!isVisible) return false;
            }

            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);

            // Basic style checks
            if (style.display === 'none' ||
                style.visibility === 'hidden' ||
                style.opacity === '0') {
              return false;
            }

            // Size checks
            if (rect.width === 0 && rect.height === 0) {
              return false;
            }

            // Viewport checks with expansion
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;

            return !(
              rect.bottom < -expansion ||
              rect.top > viewportHeight + expansion ||
              rect.right < -expansion ||
              rect.left > viewportWidth + expansion
            );
          } catch (e) {
            return false;
          }
        }

        // Function to check if element is clickable
        function isElementClickable(element: Element): boolean {
          const tagName = element.tagName.toLowerCase();
          const role = element.getAttribute('role');
          const type = element.getAttribute('type');

          // Standard clickable elements
          if (['a', 'button', 'input', 'select', 'textarea'].includes(tagName)) {
            return true;
          }

          // Elements with click handlers or roles
          if (role && ['button', 'link', 'menuitem', 'tab'].includes(role)) {
            return true;
          }

          // Input elements
          if (tagName === 'input' && type && ['button', 'submit', 'reset', 'checkbox', 'radio'].includes(type)) {
            return true;
          }

          // Elements with onclick or cursor pointer
          const style = window.getComputedStyle(element);
          if (style.cursor === 'pointer') {
            return true;
          }

          // Check for event listeners (simplified)
          if (element.hasAttribute('onclick') || element.hasAttribute('href')) {
            return true;
          }

          return false;
        }

        // Function to get XPath
        function getXPath(element: Element): string {
          if (element.id) {
            return `//*[@id="${element.id}"]`;
          }
          
          const parts: string[] = [];
          let current: Element | null = element;
          
          while (current && current.nodeType === Node.ELEMENT_NODE) {
            let tagName = current.tagName.toLowerCase();
            let index = 1;
            
            // Count siblings with same tag name
            let sibling = current.previousElementSibling;
            while (sibling) {
              if (sibling.tagName.toLowerCase() === tagName) {
                index++;
              }
              sibling = sibling.previousElementSibling;
            }
            
            parts.unshift(`${tagName}[${index}]`);
            current = current.parentElement;
          }
          
          return '/' + parts.join('/');
        }

        // Function to get element text
        function getElementText(element: Element): string {
          // Try different text sources
          const textContent = element.textContent?.trim() || '';
          const value = (element as any).value || '';
          const placeholder = element.getAttribute('placeholder') || '';
          const alt = element.getAttribute('alt') || '';
          const title = element.getAttribute('title') || '';
          const ariaLabel = element.getAttribute('aria-label') || '';

          return textContent || value || placeholder || alt || title || ariaLabel || '';
        }

        // Enhanced CSS selector generation
        function generateCSSSelector(element: Element): string {
          if (element.id) {
            return `#${element.id}`;
          }

          const path: string[] = [];
          let current: Element | null = element;

          while (current && current !== document.body) {
            let selector = current.tagName.toLowerCase();

            if (current.className && typeof current.className === 'string') {
              const classes = current.className.split(' ').filter(c => c.trim());
              if (classes.length > 0) {
                selector += '.' + classes.join('.');
              }
            }

            // Add nth-child if needed for uniqueness
            const siblings = Array.from(current.parentElement?.children || []);
            const sameTagSiblings = siblings.filter(s => s.tagName === current!.tagName);
            if (sameTagSiblings.length > 1) {
              const index = sameTagSiblings.indexOf(current) + 1;
              selector += `:nth-child(${index})`;
            }

            path.unshift(selector);
            current = current.parentElement;
          }

          return path.join(' > ');
        }

        // Enhanced top element checking
        function isTopElement(element: Element): boolean {
          try {
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const topElement = document.elementFromPoint(centerX, centerY);
            return topElement === element || element.contains(topElement);
          } catch (e) {
            return true; // Default to true if check fails
          }
        }

        // Find all potentially interactive elements
        const allElements = document.querySelectorAll('*');
        let index = 0;

        for (const element of allElements) {
          if (isElementVisible(element, viewportExpansion) && isElementClickable(element)) {
            // Check if element is actually on top (not covered by other elements)
            const isTop = isTopElement(element);
            if (!isTop) continue;

            // Add data attribute for indexing
            element.setAttribute('data-browser-use-index', index.toString());

            const rect = element.getBoundingClientRect();
            const domElement: any = {
              index,
              tag: element.tagName.toLowerCase(),
              text: getElementText(element),
              attributes: {} as Record<string, string>,
              xpath: getXPath(element),
              cssSelector: generateCSSSelector(element),
              isClickable: true,
              isVisible: true,
              isTopElement: isTop,
              isInViewport: rect.top >= 0 && rect.bottom <= window.innerHeight,
              boundingRect: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                top: rect.top,
                bottom: rect.bottom,
                left: rect.left,
                right: rect.right
              },
              highlightIndex: (focusElement === index) ? index : undefined
            };

            // Get important attributes
            const importantAttrs = ['id', 'class', 'type', 'name', 'href', 'role', 'aria-label', 'placeholder', 'data-testid'];
            for (const attr of importantAttrs) {
              const value = element.getAttribute(attr);
              if (value) {
                (domElement.attributes as Record<string, string>)[attr] = value;
              }
            }

            results.push(domElement);
            index++;
          }
        }

        return results;
      }, { focusElement, viewportExpansion });

      // Cache the elements for later use
      elements.forEach(element => {
        this.elementCache.set(`index_${element.index}`, element);
        if (element.cssSelector) {
          this.elementCache.set(`css_${element.cssSelector}`, element);
        }
        if (element.xpath) {
          this.elementCache.set(`xpath_${element.xpath}`, element);
        }
      });

      logger.debug(`Found ${elements.length} enhanced clickable elements`, 'DOMService');
      return elements;
    } catch (error) {
      logger.error('Failed to get clickable elements', error as Error, 'DOMService');
      throw error;
    }
  }

  async highlightElement(index: number): Promise<void> {
    try {
      await this.page.evaluate((elementIndex) => {
        const element = document.querySelector(`[data-browser-use-index="${elementIndex}"]`) as HTMLElement;
        if (element) {
          element.style.outline = '3px solid red';
          element.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';

          // Remove highlight after 2 seconds
          setTimeout(() => {
            element.style.outline = '';
            element.style.backgroundColor = '';
          }, 2000);
        }
      }, index);
    } catch (error) {
      logger.error(`Failed to highlight element at index ${index}`, error as Error, 'DOMService');
    }
  }

  async scrollToElement(index: number): Promise<void> {
    try {
      await this.page.evaluate((elementIndex: number) => {
        const element = document.querySelector(`[data-browser-use-index="${elementIndex}"]`) as HTMLElement;
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, index);

      await this.page.waitForTimeout(500); // Wait for scroll to complete
    } catch (error) {
      logger.error(`Failed to scroll to element at index ${index}`, error as Error, 'DOMService');
    }
  }

  async locateElement(locator: ElementLocator): Promise<any> {
    const strategies = [
      () => this.locateByIndex(locator.index),
      () => this.locateByCSSSelector(locator.cssSelector),
      () => this.locateByXPath(locator.xpath),
      () => this.locateByText(locator.text),
      () => this.locateByAttributes(locator.attributes)
    ];

    for (const strategy of strategies) {
      try {
        const element = await strategy();
        if (element) {
          // Verify element is still visible and interactable
          const isVisible = await this.isElementVisible(element);
          if (isVisible) {
            await this.scrollElementIntoView(element);
            return element;
          }
        }
      } catch (error) {
        logger.debug(`Element location strategy failed: ${error}`, 'DOMService');
        continue;
      }
    }

    throw new Error(`Failed to locate element with any strategy: ${JSON.stringify(locator)}`);
  }

  private async locateByIndex(index?: number): Promise<any> {
    if (index === undefined) return null;

    logger.info(`🔍 尝试定位元素 index: ${index}`, 'DOMService');

    // 策略1: 通过data-browser-use-index属性查找
    try {
      const element = await this.page.locator(`[data-browser-use-index="${index}"]`).first();
      if (await element.count() > 0) {
        logger.info(`✅ 通过data-browser-use-index找到元素 ${index}`, 'DOMService');
        return element;
      }
    } catch (error) {
      logger.info(`❌ data-browser-use-index策略失败: ${error}`, 'DOMService');
    }

    // 策略2: 通过缓存的元素信息查找
    const cachedElement = this.elementCache.get(`index_${index}`);
    if (cachedElement) {
      try {
        // 尝试通过CSS选择器查找
        if (cachedElement.cssSelector) {
          const element = await this.page.locator(cachedElement.cssSelector).first();
          if (await element.count() > 0) {
            logger.info(`✅ 通过缓存CSS选择器找到元素 ${index}`, 'DOMService');
            return element;
          }
        }

        // 尝试通过XPath查找
        if (cachedElement.xpath) {
          const element = await this.page.locator(`xpath=${cachedElement.xpath}`).first();
          if (await element.count() > 0) {
            logger.info(`✅ 通过缓存XPath找到元素 ${index}`, 'DOMService');
            return element;
          }
        }

        // 尝试通过文本内容查找
        if (cachedElement.text && cachedElement.text.trim()) {
          const element = await this.page.locator(`text="${cachedElement.text.trim()}"`).first();
          if (await element.count() > 0) {
            logger.info(`✅ 通过缓存文本找到元素 ${index}`, 'DOMService');
            return element;
          }
        }
      } catch (error) {
        logger.info(`❌ 缓存策略失败: ${error}`, 'DOMService');
      }
    }

    // 策略3: 重新扫描页面，按顺序查找第index个交互元素
    try {
      const interactiveElements = await this.page.locator('button, a[href], input, textarea, select, [onclick], [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])').all();
      if (interactiveElements.length > index) {
        logger.info(`✅ 通过重新扫描找到元素 ${index}`, 'DOMService');
        return interactiveElements[index];
      }
    } catch (error) {
      logger.info(`❌ 重新扫描策略失败: ${error}`, 'DOMService');
    }

    logger.warn(`❌ 所有策略都失败，无法找到元素 ${index}`, 'DOMService');
    return null;
  }

  private async locateByCSSSelector(cssSelector?: string): Promise<any> {
    if (!cssSelector) return null;

    try {
      const element = await this.page.locator(cssSelector).first();
      const count = await element.count();
      return count > 0 ? element : null;
    } catch (error) {
      return null;
    }
  }

  private async locateByXPath(xpath?: string): Promise<any> {
    if (!xpath) return null;

    try {
      const element = await this.page.locator(`xpath=${xpath}`).first();
      const count = await element.count();
      return count > 0 ? element : null;
    } catch (error) {
      return null;
    }
  }

  private async locateByText(text?: string): Promise<any> {
    if (!text) return null;

    try {
      // Try exact text match first
      let element = await this.page.locator(`text="${text}"`).first();
      let count = await element.count();

      if (count === 0) {
        // Try partial text match
        element = await this.page.locator(`text=${text}`).first();
        count = await element.count();
      }

      if (count === 0) {
        // Try case-insensitive match
        element = await this.page.locator(`text=/${text}/i`).first();
        count = await element.count();
      }

      return count > 0 ? element : null;
    } catch (error) {
      return null;
    }
  }

  private async locateByAttributes(attributes?: Record<string, string>): Promise<any> {
    if (!attributes || Object.keys(attributes).length === 0) return null;

    try {
      // Build selector from attributes
      const selectors = Object.entries(attributes).map(([key, value]) => {
        if (key === 'id') return `#${value}`;
        if (key === 'class') return `.${value.split(' ').join('.')}`;
        return `[${key}="${value}"]`;
      });

      const selector = selectors.join('');
      const element = await this.page.locator(selector).first();
      const count = await element.count();
      return count > 0 ? element : null;
    } catch (error) {
      return null;
    }
  }

  private async isElementVisible(element: any): Promise<boolean> {
    try {
      return await element.isVisible();
    } catch (error) {
      return false;
    }
  }

  private async scrollElementIntoView(element: any): Promise<void> {
    try {
      await element.scrollIntoViewIfNeeded();
    } catch (error) {
      logger.debug('Failed to scroll element into view', 'DOMService');
    }
  }

  async relocateElement(originalElement: EnhancedDOMElement): Promise<any> {
    logger.debug(`Attempting to relocate element: ${originalElement.tag}[${originalElement.index}]`, 'DOMService');

    // Try multiple strategies to find the element again
    const strategies = [
      // Try by CSS selector first (most reliable)
      () => originalElement.cssSelector ? this.locateByCSSSelector(originalElement.cssSelector) : null,
      // Try by XPath
      () => originalElement.xpath ? this.locateByXPath(originalElement.xpath) : null,
      // Try by text content
      () => originalElement.text ? this.locateByText(originalElement.text) : null,
      // Try by attributes
      () => this.locateByAttributes(originalElement.attributes),
      // Try by similar elements (same tag + similar attributes)
      () => this.locateSimilarElement(originalElement)
    ];

    for (const strategy of strategies) {
      try {
        const element = await strategy();
        if (element) {
          const isVisible = await this.isElementVisible(element);
          if (isVisible) {
            logger.debug('Successfully relocated element', 'DOMService');
            return element;
          }
        }
      } catch (error) {
        continue;
      }
    }

    throw new Error(`Failed to relocate element: ${originalElement.tag}[${originalElement.index}]`);
  }

  private async locateSimilarElement(originalElement: EnhancedDOMElement): Promise<any> {
    try {
      // Find elements with same tag
      const elements = await this.page.locator(originalElement.tag).all();

      for (const element of elements) {
        // Check if attributes match
        let matchScore = 0;
        const totalAttrs = Object.keys(originalElement.attributes || {}).length;

        if (totalAttrs > 0) {
          for (const [key, value] of Object.entries(originalElement.attributes || {})) {
            const elementValue = await element.getAttribute(key);
            if (elementValue === value) {
              matchScore++;
            }
          }

          // If most attributes match, consider it a match
          if (matchScore / totalAttrs >= 0.7) {
            return element;
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // Fallback DOM analysis when buildDomTree.js fails (simple element detection)
  private async fallbackDOMAnalysis(): Promise<EnhancedDOMElement[]> {
    try {
      logger.warn('Using fallback DOM analysis', 'DOMService');

      // Add data-browser-use-index attributes to elements and get their info
      const elements = await this.page.evaluate(() => {
        const results: any[] = [];
        let highlightIndex = 0;

        // Simple element detection as fallback
        const interactiveSelectors = [
          'button', 'a[href]', 'input', 'textarea', 'select',
          '[onclick]', '[role="button"]', '[role="link"]',
          '[tabindex]:not([tabindex="-1"])'
        ];

        const allElements = document.querySelectorAll(interactiveSelectors.join(','));

        for (const element of allElements) {
          if (element instanceof HTMLElement) {
            const rect = element.getBoundingClientRect();

            // Basic visibility check
            if (rect.width > 0 && rect.height > 0 &&
                rect.top >= 0 && rect.left >= 0 &&
                rect.bottom <= window.innerHeight &&
                rect.right <= window.innerWidth) {

              // CRITICAL: Set the data-browser-use-index attribute
              element.setAttribute('data-browser-use-index', highlightIndex.toString());

              // Get text content
              let text = element.textContent?.trim() || '';
              if (!text) {
                text = element.getAttribute('placeholder') ||
                       element.getAttribute('aria-label') ||
                       element.getAttribute('title') ||
                       element.getAttribute('alt') || '';
              }

              // Collect all attributes
              const attributes: Record<string, string> = {};
              for (let i = 0; i < element.attributes.length; i++) {
                const attr = element.attributes[i];
                attributes[attr.name] = attr.value;
              }
              attributes['data-browser-use-index'] = highlightIndex.toString();

              // Classify element interaction type (same logic as buildDomTree.js)
              const tagName = element.tagName.toLowerCase();
              let interactionType = 'none';
              let isInputElement = false;
              let isClickableOnly = false;

              // Check if it's an input element
              if (tagName === 'input' || tagName === 'textarea') {
                const inputType = element.getAttribute('type')?.toLowerCase() || 'text';
                if (['text', 'email', 'password', 'search', 'url', 'tel', 'number'].includes(inputType) || tagName === 'textarea') {
                  interactionType = 'input';
                  isInputElement = true;
                }
              } else if (element.getAttribute('contenteditable') === 'true') {
                interactionType = 'input';
                isInputElement = true;
              }

              // Check if it's clickable only
              if (!isInputElement) {
                if (tagName === 'a' || tagName === 'button' ||
                    element.getAttribute('role') === 'button' ||
                    element.getAttribute('onclick') ||
                    (tagName === 'input' && ['submit', 'button', 'reset'].includes(element.getAttribute('type') || ''))) {
                  interactionType = 'click';
                  isClickableOnly = true;
                } else if (element.hasAttribute('tabindex') || element.hasAttribute('role')) {
                  interactionType = 'interactive';
                }
              }

              results.push({
                tag: tagName,
                text: text.substring(0, 100),
                xpath: `//*[@data-browser-use-index="${highlightIndex}"]`,
                attributes: attributes,
                highlightIndex: highlightIndex,
                isVisible: true,
                isInteractive: true,
                interactionType: interactionType,
                isInputElement: isInputElement,
                isClickableOnly: isClickableOnly,
              });

              highlightIndex++;
            }
          }
        }

        return results;
      });

      return elements.map((el: any) => ({
        ...el,
        index: el.highlightIndex, // Ensure index field is set
        cssSelector: `[data-browser-use-index="${el.highlightIndex}"]`,
        isTopElement: true,
        isInViewport: true,
        priority: 1,
        // Ensure all required fields are present
        interactionType: el.interactionType || 'none',
        isInputElement: el.isInputElement || false,
        isClickableOnly: el.isClickableOnly || false,
      }));

    } catch (error) {
      logger.error('Fallback DOM analysis also failed', error as Error, 'DOMService');
      return [];
    }
  }
}
