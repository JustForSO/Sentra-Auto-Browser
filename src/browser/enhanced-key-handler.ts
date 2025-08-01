import { logger } from '../utils/logger';
import { PageStateMonitor } from './page-state-monitor';

/**
 * ⌨️ 增强按键处理器 - 优化Enter键行为和智能重试
 */
export class EnhancedKeyHandler {
  private page: any;
  private pageStateMonitor: PageStateMonitor;

  constructor(page: any, pageStateMonitor: PageStateMonitor) {
    this.page = page;
    this.pageStateMonitor = pageStateMonitor;
  }

  /**
   * 更新页面引用
   */
  updatePage(page: any) {
    this.page = page;
  }

  /**
   * 增强的按键处理 - 特别优化Enter键
   */
  async pressKey(key: string, modifiers?: string[], options: {
    waitForNavigation?: boolean;
    expectFormSubmit?: boolean;
    targetElement?: any;
    retryCount?: number;
  } = {}): Promise<boolean> {
    try {
      const {
        waitForNavigation = true,
        expectFormSubmit = false,
        targetElement = null,
        retryCount = 3
      } = options;

      logger.info(`⌨️ 按键操作: ${key}${modifiers ? ` (${modifiers.join('+')})` : ''}`, 'EnhancedKeyHandler');

      // 存储当前状态用于导航检测
      const currentUrl = this.page.url();
      const currentState = this.pageStateMonitor.getCurrentState();

      // Enter键特殊处理
      if (key.toLowerCase() === 'enter') {
        return await this.handleEnterKey(targetElement, expectFormSubmit, waitForNavigation);
      }

      // 其他按键的标准处理
      return await this.handleStandardKey(key, modifiers, currentUrl, currentState, waitForNavigation, retryCount);

    } catch (error: any) {
      logger.error(`❌ 按键操作失败: ${error.message}`, error, 'EnhancedKeyHandler');
      throw error;
    }
  }

  /**
   * Enter键专门处理
   */
  async handleEnterKey(targetElement: any = null, expectFormSubmit: boolean = false, waitForNavigation: boolean = true): Promise<boolean> {
    try {
      logger.info('🔍 分析Enter键上下文...', 'EnhancedKeyHandler');

      // 分析当前焦点和上下文
      const context = await this.analyzeEnterContext(targetElement);
      
      logger.info(`📋 Enter键上下文: ${context.type} (表单: ${context.isInForm}, 提交: ${context.canSubmit})`, 'EnhancedKeyHandler');

      let navigationDetected = false;

      // 根据上下文选择最佳策略
      switch (context.type) {
        case 'form_input':
          navigationDetected = await this.handleFormEnter(context, expectFormSubmit, waitForNavigation);
          break;
          
        case 'search_input':
          navigationDetected = await this.handleSearchEnter(context, waitForNavigation);
          break;
          
        case 'button_focused':
          navigationDetected = await this.handleButtonEnter(context, waitForNavigation);
          break;
          
        case 'link_focused':
          navigationDetected = await this.handleLinkEnter(context, waitForNavigation);
          break;
          
        default:
          navigationDetected = await this.handleGenericEnter(waitForNavigation);
          break;
      }

      return navigationDetected;

    } catch (error: any) {
      logger.error(`❌ Enter键处理失败: ${error.message}`, error, 'EnhancedKeyHandler');
      throw error;
    }
  }

  /**
   * 分析Enter键上下文
   */
  async analyzeEnterContext(targetElement: any = null) {
    try {
      return await this.page.evaluate((hasTargetElement: boolean) => {
        // 获取当前焦点元素
        let focusedElement = document.activeElement;
        
        // 如果没有焦点元素，尝试找到最可能的目标
        if (!focusedElement || focusedElement === document.body) {
          // 查找最近交互的输入框
          const inputs = document.querySelectorAll('input[type="text"], input[type="search"], input[type="email"], textarea');
          if (inputs.length > 0) {
            focusedElement = inputs[inputs.length - 1]; // 最后一个输入框
          }
        }

        if (!focusedElement) {
          return { type: 'no_focus', isInForm: false, canSubmit: false };
        }

        const tagName = focusedElement.tagName.toLowerCase();
        const type = focusedElement.getAttribute('type')?.toLowerCase() || '';
        const role = focusedElement.getAttribute('role')?.toLowerCase() || '';

        // 检查是否在表单中
        const form = focusedElement.closest('form');
        const isInForm = !!form;

        // 检查表单是否可以提交
        let canSubmit = false;
        if (isInForm) {
          const submitButtons = form.querySelectorAll('input[type="submit"], button[type="submit"], button:not([type])');
          canSubmit = submitButtons.length > 0;
        }

        // 智能检测输入框是否可提交 - 泛化处理，删除硬编码
        const className = focusedElement.getAttribute('class')?.toLowerCase() || '';
        const placeholder = focusedElement.getAttribute('placeholder')?.toLowerCase() || '';
        const id = focusedElement.getAttribute('id')?.toLowerCase() || '';
        const name = focusedElement.getAttribute('name')?.toLowerCase() || '';

        // 通用搜索框检测模式
        const searchPatterns = ['search', 'query', 'find', 'lookup', 'nav-search', 'searchbox'];
        const isSearchInput = type === 'search' ||
          searchPatterns.some(pattern =>
            placeholder.includes(pattern) || className.includes(pattern) ||
            id.includes(pattern) || name.includes(pattern)
          );

        if (isSearchInput) {
          canSubmit = true;
        }

        // 判断上下文类型
        let contextType = 'generic';

        if (tagName === 'input') {
          if (['text', 'email', 'password', 'search'].includes(type)) {
            // 简化上下文判断 - 让AI决策处理具体逻辑
            if (isSearchInput) {
              contextType = 'search_input';
            } else if (isInForm) {
              contextType = 'form_input';
            } else {
              contextType = 'standalone_input';
            }
          }
        } else if (tagName === 'textarea') {
          contextType = isInForm ? 'form_input' : 'standalone_input';
        } else if (tagName === 'button' || role === 'button') {
          contextType = 'button_focused';
        } else if (tagName === 'a') {
          contextType = 'link_focused';
        }

        return {
          type: contextType,
          isInForm,
          canSubmit,
          elementTag: tagName,
          elementType: type,
          elementRole: role,
          hasPlaceholder: !!focusedElement.getAttribute('placeholder'),
          placeholder: focusedElement.getAttribute('placeholder') || '',
          formAction: form?.getAttribute('action') || '',
          formMethod: form?.getAttribute('method') || 'get'
        };
      }, !!targetElement);

    } catch (error: any) {
      logger.warn(`⚠️ 分析Enter上下文失败: ${error.message}`, 'EnhancedKeyHandler');
      return { type: 'generic', isInForm: false, canSubmit: false };
    }
  }

  /**
   * 处理表单输入的Enter
   */
  async handleFormEnter(context: any, expectFormSubmit: boolean, waitForNavigation: boolean): Promise<boolean> {
    try {
      if (context.canSubmit && expectFormSubmit) {
        logger.info('📝 表单Enter - 预期提交表单', 'EnhancedKeyHandler');
        
        // 等待导航的Enter
        const navigationPromise = waitForNavigation ? this.waitForNavigationWithTimeout() : null;
        
        await this.page.keyboard.press('Enter');
        
        if (navigationPromise) {
          const navigationDetected = await navigationPromise;
          if (navigationDetected) {
            logger.info('✅ 表单提交导航检测成功', 'EnhancedKeyHandler');
            return true;
          }
        }
        
        // 检查是否有表单验证错误
        await this.page.waitForTimeout(1000);
        const hasErrors = await this.checkFormValidationErrors();
        if (hasErrors) {
          logger.warn('⚠️ 表单验证错误，未提交', 'EnhancedKeyHandler');
        }
        
        return false;
      } else {
        logger.info('📝 表单Enter - 移动到下一个字段', 'EnhancedKeyHandler');
        
        // 尝试移动到下一个输入字段
        await this.page.keyboard.press('Tab');
        await this.page.waitForTimeout(200);
        
        return false;
      }
    } catch (error: any) {
      logger.error(`❌ 表单Enter处理失败: ${error.message}`, error, 'EnhancedKeyHandler');
      return false;
    }
  }

  /**
   * 处理搜索输入的Enter
   */
  async handleSearchEnter(context: any, waitForNavigation: boolean): Promise<boolean> {
    try {
      logger.info('🔍 搜索Enter - 执行搜索', 'EnhancedKeyHandler');
      
      const navigationPromise = waitForNavigation ? this.waitForNavigationWithTimeout() : null;
      
      await this.page.keyboard.press('Enter');
      
      if (navigationPromise) {
        const navigationDetected = await navigationPromise;
        if (navigationDetected) {
          logger.info('✅ 搜索导航检测成功', 'EnhancedKeyHandler');
          return true;
        }
      }
      
      // 等待搜索结果加载
      await this.page.waitForTimeout(2000);
      
      return false;
    } catch (error: any) {
      logger.error(`❌ 搜索Enter处理失败: ${error.message}`, error, 'EnhancedKeyHandler');
      return false;
    }
  }

  /**
   * 处理按钮焦点的Enter
   */
  async handleButtonEnter(context: any, waitForNavigation: boolean): Promise<boolean> {
    try {
      logger.info('🔘 按钮Enter - 点击按钮', 'EnhancedKeyHandler');
      
      const navigationPromise = waitForNavigation ? this.waitForNavigationWithTimeout() : null;
      
      await this.page.keyboard.press('Enter');
      
      if (navigationPromise) {
        const navigationDetected = await navigationPromise;
        if (navigationDetected) {
          logger.info('✅ 按钮点击导航检测成功', 'EnhancedKeyHandler');
          return true;
        }
      }
      
      return false;
    } catch (error: any) {
      logger.error(`❌ 按钮Enter处理失败: ${error.message}`, error, 'EnhancedKeyHandler');
      return false;
    }
  }

  /**
   * 处理链接焦点的Enter
   */
  async handleLinkEnter(context: any, waitForNavigation: boolean): Promise<boolean> {
    try {
      logger.info('🔗 链接Enter - 跟随链接', 'EnhancedKeyHandler');
      
      const navigationPromise = waitForNavigation ? this.waitForNavigationWithTimeout() : null;
      
      await this.page.keyboard.press('Enter');
      
      if (navigationPromise) {
        const navigationDetected = await navigationPromise;
        if (navigationDetected) {
          logger.info('✅ 链接导航检测成功', 'EnhancedKeyHandler');
          return true;
        }
      }
      
      return false;
    } catch (error: any) {
      logger.error(`❌ 链接Enter处理失败: ${error.message}`, error, 'EnhancedKeyHandler');
      return false;
    }
  }

  /**
   * 处理通用Enter
   */
  async handleGenericEnter(waitForNavigation: boolean): Promise<boolean> {
    try {
      logger.info('⌨️ 通用Enter处理', 'EnhancedKeyHandler');
      
      const navigationPromise = waitForNavigation ? this.waitForNavigationWithTimeout() : null;
      
      await this.page.keyboard.press('Enter');
      
      if (navigationPromise) {
        const navigationDetected = await navigationPromise;
        if (navigationDetected) {
          logger.info('✅ 通用Enter导航检测成功', 'EnhancedKeyHandler');
          return true;
        }
      }
      
      return false;
    } catch (error: any) {
      logger.error(`❌ 通用Enter处理失败: ${error.message}`, error, 'EnhancedKeyHandler');
      return false;
    }
  }

  /**
   * 处理标准按键
   */
  async handleStandardKey(key: string, modifiers: string[] | undefined, currentUrl: string, currentState: any, waitForNavigation: boolean, retryCount: number): Promise<boolean> {
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        if (modifiers && modifiers.length > 0) {
          const modifierString = modifiers.join('+') + '+' + key;
          await this.page.keyboard.press(modifierString);
        } else {
          await this.page.keyboard.press(key);
        }

        // 检测导航
        if (waitForNavigation) {
          const navigationDetected = await this.waitForPotentialNavigation(currentUrl, currentState.domHash);
          if (navigationDetected) {
            logger.info('✅ 按键导航检测成功', 'EnhancedKeyHandler');
            return true;
          }
        }

        return false;

      } catch (error: any) {
        logger.warn(`⚠️ 按键尝试 ${attempt}/${retryCount} 失败: ${error.message}`, 'EnhancedKeyHandler');
        
        if (attempt === retryCount) {
          throw error;
        }
        
        await this.page.waitForTimeout(300 * attempt);
      }
    }

    return false;
  }

  /**
   * 等待导航（带超时）- 支持新标签页检测
   */
  async waitForNavigationWithTimeout(timeout: number = 5000): Promise<boolean> {
    try {
      const context = this.page.context();
      const initialPageCount = context.pages().length;

      // 同时等待当前页面导航和新标签页创建
      const navigationPromise = this.page.waitForNavigation({ timeout, waitUntil: 'domcontentloaded' }).catch(() => false);
      const newPagePromise = new Promise<boolean>((resolve) => {
        const checkNewPage = () => {
          if (context.pages().length > initialPageCount) {
            resolve(true);
          }
        };

        const interval = setInterval(checkNewPage, 100);
        setTimeout(() => {
          clearInterval(interval);
          resolve(false);
        }, timeout);
      });

      const [navigationResult, newPageResult] = await Promise.all([navigationPromise, newPagePromise]);

      if (newPageResult) {
        logger.info('✅ 检测到新标签页创建', 'EnhancedKeyHandler');
        return true;
      }

      if (navigationResult) {
        logger.info('✅ 检测到页面导航', 'EnhancedKeyHandler');
        return true;
      }

      return false;
    } catch (error: any) {
      // 超时不算错误，可能没有导航发生
      return false;
    }
  }

  /**
   * 等待潜在导航
   */
  async waitForPotentialNavigation(originalUrl: string, originalDOMHash: string, timeout: number = 3000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      await this.page.waitForTimeout(500);
      
      try {
        const currentUrl = this.page.url();
        if (currentUrl !== originalUrl) {
          logger.info(`🌐 检测到URL变化: ${originalUrl} → ${currentUrl}`, 'EnhancedKeyHandler');
          return true;
        }
        
        const currentState = this.pageStateMonitor.getCurrentState();
        if (currentState.domHash !== originalDOMHash) {
          logger.info('🔄 检测到DOM变化', 'EnhancedKeyHandler');
          return true;
        }
      } catch (error: any) {
        // 页面可能正在导航中
        logger.info('🔄 页面导航中...', 'EnhancedKeyHandler');
        return true;
      }
    }
    
    return false;
  }

  /**
   * 检查表单验证错误
   */
  async checkFormValidationErrors(): Promise<boolean> {
    try {
      return await this.page.evaluate(() => {
        const errorSelectors = [
          '.error', '.alert-danger', '.invalid-feedback',
          '[class*="error"]', '[class*="invalid"]',
          'input:invalid', 'textarea:invalid'
        ];
        
        for (const selector of errorSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            return true;
          }
        }
        
        return false;
      });
    } catch (error: any) {
      return false;
    }
  }
}
