import { BrowserSession } from '../browser/session';
import { Action, ActionResult } from '../types';
import { logger } from '../utils/logger';
import { PluginManager } from '../plugins/manager';
import { PluginRegistry } from '../plugins/registry';

/**
 * 操作控制器 - 浏览器操作的执行者
 *
 * 这个类就像一个专业的浏览器操作员，负责：
 * - 接收AI的指令并转换为具体的浏览器操作
 * - 处理各种类型的用户交互（点击、输入、滚动等）
 * - 提供操作结果反馈，让AI知道操作是否成功
 * - 处理异常情况，确保操作的稳定性
 */
export class Controller {
  private browserSession: BrowserSession;  // 浏览器会话，我们的工作环境
  private pluginManager?: PluginManager;   // 插件管理器
  private pluginRegistry?: PluginRegistry; // 插件注册表

  constructor(browserSession: BrowserSession, pluginManager?: PluginManager, pluginRegistry?: PluginRegistry) {
    this.browserSession = browserSession;
    this.pluginManager = pluginManager;
    this.pluginRegistry = pluginRegistry;
  }

  // 执行AI指定的操作，这是控制器的核心方法
  async executeAction(action: Action): Promise<ActionResult> {
    try {
      logger.action(`正在执行操作: ${action.type}`, this.getActionDetails(action));

      // 根据操作类型分发到对应的处理方法
      switch (action.type) {
        case 'click':           // 点击操作
          return await this.handleClick(action);
        case 'type':            // 输入文本
          return await this.handleType(action);
        case 'navigate':        // 页面导航
          return await this.handleNavigate(action);
        case 'scroll':          // 滚动页面
          return await this.handleScroll(action);
        case 'wait':            // 等待操作
          return await this.handleWait(action);
        case 'done':            // 任务完成
          return await this.handleDone(action);
        case 'hover':           // 鼠标悬停
          return await this.handleHover(action);
        case 'drag_drop':       // 拖拽操作
          return await this.handleDragDrop(action);
        case 'key':             // 按键操作
        case 'key_press':
          return await this.handleKeyPress(action);
        case 'select':          // 选择操作
          return await this.handleSelect(action);
        case 'upload_file':     // 文件上传
          return await this.handleUploadFile(action);
        case 'take_screenshot': // 截图
          return await this.handleTakeScreenshot(action);
        case 'extract_data':    // 数据提取
          return await this.handleExtractData(action);
        case 'execute_script':  // 执行脚本
          return await this.handleExecuteScript(action);
        case 'switch_tab':      // 切换标签页
          return await this.handleSwitchTab(action);
        case 'new_tab':
          return await this.handleNewTab(action);
        case 'close_tab':
          return await this.handleCloseTab(action);
        case 'go_back':
          return await this.handleGoBack(action);
        case 'go_forward':
          return await this.handleGoForward(action);
        case 'refresh':
          return await this.handleRefresh(action);
        case 'set_cookie':
          return await this.handleSetCookie(action);
        case 'wait_for_element':
          return await this.handleWaitForElement(action);
        case 'wait_for_navigation':
          return await this.handleWaitForNavigation(action);
        // 插件相关动作
        case 'execute_plugin':
          return await this.handleExecutePlugin(action);
        case 'create_page_effect':
          return await this.handleCreatePageEffect(action);
        case 'modify_page':
          return await this.handleModifyPage(action);
        case 'wrap_page_iframe':
          return await this.handleWrapPageInIframe(action);
        default:
          throw new Error(`Unknown action type: ${(action as any).type}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Action failed: ${action.type}`, error as Error, 'Controller');
      
      return {
        success: false,
        error: errorMessage,
        message: `Failed to execute ${action.type}: ${errorMessage}`,
      };
    }
  }

  private async handleClick(action: any): Promise<ActionResult> {
    // Extract enhanced locator information
    const { index, xpath, cssSelector, text, attributes } = action;

    try {
      // Use enhanced click with multiple strategies and retry mechanism
      const navigationDetected = await this.browserSession.click(index, xpath, cssSelector, text, attributes);

      return {
        success: true,
        message: `Successfully clicked element at index ${index}`,
        extractedContent: `Clicked element at index ${index}`,
        navigationDetected, // Pass navigation detection result to Agent
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('Execution context was destroyed') ||
          errorMessage.includes('Cannot find context with specified id') ||
          errorMessage.includes('Protocol error')) {
        logger.info('🔄 Page context changed during click, refreshing DOM state immediately...', 'Controller');

        try {
          await this.refreshDOMState();
          logger.info('✅ DOM state refreshed successfully after navigation', 'Controller');
        } catch (refreshError) {
          logger.warn(`⚠️ Failed to refresh DOM state: ${refreshError}`, 'Controller');
        }

        return {
          success: true, // Mark as success since navigation is expected behavior
          error: undefined,
          message: `Page navigation detected during click of element ${index}. DOM state refreshed.`,
          extractedContent: `Navigation occurred during click of element ${index}`,
          navigationDetected: true, // Special flag for the agent
        };
      }

      // Provide specific recovery suggestions for click failures
      let recoveryMessage = 'Try a different element or approach.';
      if (errorMessage.includes('timeout') || errorMessage.includes('not visible')) {
        recoveryMessage = 'Element may not be visible. Try scrolling or waiting for page to load.';
      } else if (errorMessage.includes('covered') || errorMessage.includes('not clickable')) {
        recoveryMessage = 'Element is covered by another element. Try scrolling or closing overlays.';
      } else if (errorMessage.includes('not found') || errorMessage.includes('out of range')) {
        recoveryMessage = 'Element not found. Page may have changed. Try refreshing or finding a different element.';
      }

      return {
        success: false,
        error: errorMessage,
        message: `Failed to click element at index ${index}: ${errorMessage}. ${recoveryMessage}`,
      };
    }
  }

  private async handleType(action: any): Promise<ActionResult> {
    // Extract enhanced locator information
    const { index, text, xpath, cssSelector, attributes } = action;

    try {
      // Use enhanced type with multiple strategies and retry mechanism
      await this.browserSession.type(index, text, xpath, cssSelector, attributes);

      return {
        success: true,
        message: `Successfully typed "${text}" into element at index ${index}`,
        extractedContent: `Typed "${text}" into element at index ${index}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('Execution context was destroyed') ||
          errorMessage.includes('Cannot find context with specified id') ||
          errorMessage.includes('Protocol error')) {
        logger.info('🔄 Page context changed during typing, refreshing DOM state immediately...', 'Controller');

        try {
          await this.refreshDOMState();
          logger.info('✅ DOM state refreshed successfully after navigation', 'Controller');
        } catch (refreshError) {
          logger.warn(`⚠️ Failed to refresh DOM state: ${refreshError}`, 'Controller');
        }

        return {
          success: true, // Mark as success since navigation is expected behavior
          error: undefined,
          message: `Page navigation detected during typing into element ${index}. DOM state refreshed.`,
          extractedContent: `Navigation occurred during typing into element ${index}`,
          navigationDetected: true, // Special flag for the agent
        };
      }

      // Provide specific recovery suggestions for type failures
      let recoveryMessage = 'Try a different input field.';
      if (errorMessage.includes('not editable') || errorMessage.includes('not an input')) {
        recoveryMessage = 'Element is not editable. Look for a different input field or text area.';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('not visible')) {
        recoveryMessage = 'Input field may not be visible. Try scrolling or waiting for page to load.';
      } else if (errorMessage.includes('not found') || errorMessage.includes('out of range')) {
        recoveryMessage = 'Input field not found. Page may have changed. Try refreshing or finding a different field.';
      }

      throw new Error(`${errorMessage}. ${recoveryMessage}`);
    }
  }

  private async handleNavigate(action: any): Promise<ActionResult> {
    await this.browserSession.navigate(action.url);
    
    return {
      success: true,
      message: `Navigated to ${action.url}`,
      extractedContent: `Navigated to ${action.url}`,
    };
  }

  private async handleScroll(action: any): Promise<ActionResult> {
    await this.browserSession.scroll(action.direction, action.amount);
    
    return {
      success: true,
      message: `Scrolled ${action.direction}${action.amount ? ` by ${action.amount}px` : ''}`,
      extractedContent: `Scrolled ${action.direction}`,
    };
  }

  private async handleWait(action: any): Promise<ActionResult> {
    await this.browserSession.wait(action.seconds);
    
    return {
      success: true,
      message: `Waited for ${action.seconds} seconds`,
      extractedContent: `Waited for ${action.seconds} seconds`,
    };
  }

  private async handleDone(action: any): Promise<ActionResult> {
    return {
      success: action.success,
      message: action.message,
      extractedContent: action.message,
    };
  }

  private getActionDetails(action: Action): string {
    switch (action.type) {
      case 'click':
        return `index: ${action.index}${action.xpath ? `, xpath: ${action.xpath}` : ''}`;
      case 'type':
        return `index: ${action.index}, text: "${action.text}"${action.xpath ? `, xpath: ${action.xpath}` : ''}`;
      case 'navigate':
        return `url: ${action.url}`;
      case 'scroll':
        return `direction: ${action.direction}${action.amount ? `, amount: ${action.amount}px` : ''}`;
      case 'wait':
        return `seconds: ${action.seconds}`;
      case 'done':
        return `success: ${action.success}, message: "${action.message}"`;
      default:
        return '';
    }
  }

  async getCurrentState() {
    if (!this.browserSession.isStarted()) {
      throw new Error('Browser session not started');
    }

    // 如果启用了增强模式，使用增强的DOM检测
    if (this.browserSession.isEnhancedModeEnabled()) {
      return await this.browserSession.getEnhancedDOMState();
    }

    return await this.browserSession.getDOMState();
  }

  /**
   * Refresh DOM state immediately - used when navigation is detected
   */
  private async refreshDOMState(): Promise<void> {
    if (!this.browserSession.isStarted()) {
      throw new Error('Browser session not started');
    }

    // Force a fresh DOM analysis by getting current state
    // This will clear caches and re-analyze the page
    await this.browserSession.getDOMState();
    logger.info('🔄 DOM state refreshed after navigation detection', 'Controller');
  }

  async takeScreenshot(): Promise<string> {
    return await this.browserSession.takeScreenshot();
  }

  getCurrentUrl(): string {
    return this.browserSession.getCurrentUrl();
  }

  async getCurrentTitle(): Promise<string> {
    return await this.browserSession.getCurrentTitle();
  }

  // Extended action handlers
  private async handleHover(action: any): Promise<ActionResult> {
    await this.browserSession.hover(action.index, action.xpath);

    return {
      success: true,
      message: `Hovered over element at index ${action.index}`,
      extractedContent: `Hovered over element at index ${action.index}`,
    };
  }

  private async handleDragDrop(action: any): Promise<ActionResult> {
    await this.browserSession.dragAndDrop(action.sourceIndex, action.targetIndex, action.sourceXpath, action.targetXpath);

    return {
      success: true,
      message: `Dragged element from ${action.sourceIndex} to ${action.targetIndex}`,
      extractedContent: `Drag and drop completed`,
    };
  }

  private async handleKeyPress(action: any): Promise<ActionResult> {
    try {
      // 通用按键选项 - 删除硬编码，让AI决策
      const options: any = {
        waitForNavigation: true,
        retryCount: 2, // 减少重试次数提升性能
        expectFormSubmit: action.key.toLowerCase() === 'enter' // 简化Enter键处理
      };

      const navigationDetected = await this.browserSession.pressKey(action.key, action.modifiers, options);

      return {
        success: true,
        message: `Pressed key: ${action.key}${action.modifiers ? ` with modifiers: ${action.modifiers.join('+')}` : ''}`,
        extractedContent: `Key press completed`,
        navigationDetected, // Pass navigation detection result to Agent
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('Execution context was destroyed') ||
          errorMessage.includes('Cannot find context with specified id') ||
          errorMessage.includes('Protocol error')) {
        logger.info('Page context changed during key press, navigation likely occurred', 'Controller');
        return {
          success: false,
          error: 'Page navigated during key press. State will be refreshed.',
          message: `Page navigation detected during key press: ${action.key}`,
        };
      }

      return {
        success: false,
        error: errorMessage,
        message: `Failed to press key ${action.key}: ${errorMessage}`,
      };
    }
  }

  private async handleSelect(action: any): Promise<ActionResult> {
    await this.browserSession.selectOption(action.index, action.value, action.xpath);

    return {
      success: true,
      message: `Selected option "${action.value}" in element at index ${action.index}`,
      extractedContent: `Option selected`,
    };
  }

  private async handleUploadFile(action: any): Promise<ActionResult> {
    await this.browserSession.uploadFile(action.index, action.filePath, action.xpath);

    return {
      success: true,
      message: `Uploaded file "${action.filePath}" to element at index ${action.index}`,
      extractedContent: `File uploaded`,
    };
  }

  private async handleTakeScreenshot(action: any): Promise<ActionResult> {
    const screenshot = await this.browserSession.takeScreenshot();

    return {
      success: true,
      message: `Screenshot taken`,
      extractedContent: `Screenshot captured`,
      screenshot,
    };
  }

  private async handleExtractData(action: any): Promise<ActionResult> {
    const data = await this.browserSession.extractData(action.selector, action.xpath, action.attribute, action.multiple);

    return {
      success: true,
      message: `Data extracted: ${Array.isArray(data) ? `${data.length} items` : data.toString().substring(0, 50)}`,
      extractedContent: Array.isArray(data) ? data.join(', ') : data.toString(),
    };
  }

  private async handleExecuteScript(action: any): Promise<ActionResult> {
    const result = await this.browserSession.executeScript(action.script, action.args);

    return {
      success: true,
      message: `Script executed successfully`,
      extractedContent: JSON.stringify(result),
    };
  }

  private async handleSwitchTab(action: any): Promise<ActionResult> {
    if (action.tabIndex !== undefined) {
      await this.browserSession.switchTab(action.tabIndex);
      return {
        success: true,
        message: `Switched to tab ${action.tabIndex}`,
        extractedContent: `Tab switched`,
      };
    } else if (action.url) {
      // Find tab by URL (simplified implementation)
      const currentUrl = this.browserSession.getCurrentUrl();
      if (currentUrl.includes(action.url)) {
        return {
          success: true,
          message: `Already on tab with URL containing "${action.url}"`,
          extractedContent: `Tab found`,
        };
      } else {
        throw new Error(`Tab with URL "${action.url}" not found`);
      }
    } else {
      throw new Error('Either tabIndex or url must be provided for switch_tab action');
    }
  }

  private async handleNewTab(action: any): Promise<ActionResult> {
    const tabIndex = await this.browserSession.newTab(action.url);

    return {
      success: true,
      message: `Created new tab (index: ${tabIndex})${action.url ? ` and navigated to ${action.url}` : ''}`,
      extractedContent: `New tab created`,
    };
  }

  private async handleCloseTab(action: any): Promise<ActionResult> {
    await this.browserSession.closeTab(action.tabIndex);

    return {
      success: true,
      message: `Closed tab ${action.tabIndex || 'current'}`,
      extractedContent: `Tab closed`,
    };
  }

  private async handleGoBack(action: any): Promise<ActionResult> {
    await this.browserSession.goBack();

    return {
      success: true,
      message: `Navigated back`,
      extractedContent: `Went back in history`,
    };
  }

  private async handleGoForward(action: any): Promise<ActionResult> {
    await this.browserSession.goForward();

    return {
      success: true,
      message: `Navigated forward`,
      extractedContent: `Went forward in history`,
    };
  }

  private async handleRefresh(action: any): Promise<ActionResult> {
    await this.browserSession.refresh();

    return {
      success: true,
      message: `Page refreshed`,
      extractedContent: `Page reloaded`,
    };
  }

  private async handleSetCookie(action: any): Promise<ActionResult> {
    await this.browserSession.setCookie(action.name, action.value, {
      domain: action.domain,
      path: action.path,
      expires: action.expires,
    });

    return {
      success: true,
      message: `Cookie "${action.name}" set`,
      extractedContent: `Cookie set`,
    };
  }

  private async handleWaitForElement(action: any): Promise<ActionResult> {
    const selector = action.selector || `xpath=${action.xpath}`;
    await this.browserSession.waitForElement(selector, action.timeout, action.state);

    return {
      success: true,
      message: `Element found: ${selector}`,
      extractedContent: `Element appeared`,
    };
  }

  private async handleWaitForNavigation(action: any): Promise<ActionResult> {
    await this.browserSession.waitForNavigation(action.timeout, action.waitUntil);

    return {
      success: true,
      message: `Navigation completed`,
      extractedContent: `Page loaded`,
    };
  }

  // ============================================================================
  // 插件动作处理方法
  // ============================================================================

  /**
   * 执行指定插件
   */
  private async handleExecutePlugin(action: any): Promise<ActionResult> {
    try {
      if (!this.pluginManager) {
        throw new Error('插件管理器未初始化');
      }

      const { pluginId, plugin_id, parameters = {}, description } = action;
      const actualPluginId = pluginId || plugin_id;

      // 创建插件执行上下文
      const context = await this.createPluginContext();

      if (!actualPluginId) {
        throw new Error('缺少插件ID');
      }

      const result = await this.pluginManager.execute(actualPluginId, {
        page: context.page,
        parameters,
        pluginPath: ''
      });

      return {
        success: result.success,
        message: result.message || `插件 ${actualPluginId} 执行${result.success ? '成功' : '失败'}`,
        error: result.error,
        extractedContent: result.data ? JSON.stringify(result.data) : undefined,
        metadata: {
          duration: 0,
          timestamp: new Date(),
          url: context.metadata.currentUrl,
          title: context.metadata.pageTitle
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        message: `插件执行失败: ${errorMessage}`
      };
    }
  }

  /**
   * 创建页面特效 - 直接使用插件ID
   */
  private async handleCreatePageEffect(action: any): Promise<ActionResult> {
    try {
      if (!this.pluginManager || !this.pluginRegistry) {
        throw new Error('插件系统未初始化');
      }

      const { pluginId, parameters = {}, description } = action;

      // 验证插件是否存在
      const plugin = this.pluginManager.getPlugin(pluginId);
      if (!plugin) {
        // 列出所有可用的插件ID
        const availablePlugins = this.pluginManager.getAllPlugins();
        const pluginList = availablePlugins.map(p => p.config.id).join(', ');
        throw new Error(`插件不存在: ${pluginId}。可用插件ID: ${pluginList}`);
      }

      // 创建插件执行上下文
      const context = await this.createPluginContext();

      const result = await this.pluginManager.execute(pluginId, {
        page: context.page,
        parameters,
        pluginPath: ''
      });

      return {
        success: result.success,
        message: result.message || `插件 ${plugin.config.name} ${result.success ? '执行成功' : '执行失败'}`,
        error: result.error,
        extractedContent: `插件: ${plugin.config.name} (${pluginId})`,
        metadata: {
          duration: 0,
          timestamp: new Date(),
          url: context.metadata.currentUrl,
          title: context.metadata.pageTitle
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        message: `页面特效创建失败: ${errorMessage}`
      };
    }
  }

  /**
   * 修改页面
   */
  private async handleModifyPage(action: any): Promise<ActionResult> {
    try {
      const { modifications, preserveOriginal = true, description } = action;

      if (!modifications || !Array.isArray(modifications)) {
        throw new Error('缺少有效的修改指令');
      }

      // 如果需要保护原页面，先创建iframe
      if (preserveOriginal) {
        await this.wrapPageInIframe();
      }

      // 执行DOM修改
      let modificationCount = 0;
      for (const mod of modifications) {
        try {
          await this.applyDOMModification(mod, preserveOriginal);
          modificationCount++;
        } catch (error) {
          logger.warn(`DOM修改失败: ${error}`, 'Controller');
        }
      }

      return {
        success: modificationCount > 0,
        message: `页面修改完成，成功应用 ${modificationCount}/${modifications.length} 个修改`,
        extractedContent: `修改数量: ${modificationCount}`,
        metadata: {
          duration: 0,
          timestamp: new Date(),
          url: await this.browserSession.getCurrentPage()?.url() || '',
          title: await this.browserSession.getCurrentPage()?.title() || '',
          elementCount: modificationCount
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        message: `页面修改失败: ${errorMessage}`
      };
    }
  }

  /**
   * 将页面包装在iframe中
   */
  private async handleWrapPageInIframe(action: any): Promise<ActionResult> {
    try {
      const { iframeOptions = {} } = action;

      await this.wrapPageInIframe(iframeOptions);

      return {
        success: true,
        message: '页面已成功包装在iframe中',
        extractedContent: 'iframe包装完成'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        message: `iframe包装失败: ${errorMessage}`
      };
    }
  }

  // ============================================================================
  // 插件辅助方法
  // ============================================================================

  /**
   * 创建插件上下文
   */
  private async createPluginContext() {
    const page = await this.browserSession.getCurrentPage();
    const domService = null; // DOM服务暂时设为null，后续可以扩展

    return {
      pluginId: '',
      browserSession: this.browserSession,
      page,
      domService,
      logger,
      config: { enabled: true },
      metadata: {
        currentUrl: await page?.url() || '',
        pageTitle: await page?.title() || '',
        timestamp: new Date(),
        sessionId: 'current-session'
      }
    };
  }

  /**
   * 将页面包装在iframe中
   */
  private async wrapPageInIframe(options: any = {}): Promise<void> {
    const page = await this.browserSession.getCurrentPage();
    if (!page) {
      throw new Error('无法获取当前页面');
    }

    await page.evaluate((iframeOptions: any) => {
      // 检查是否已经包装过
      if (document.getElementById('sentra-plugin-iframe-container')) {
        return;
      }

      // 获取当前页面的HTML内容
      const originalHTML = document.documentElement.outerHTML;

      // 创建iframe容器
      const iframeContainer = document.createElement('div');
      iframeContainer.id = 'sentra-plugin-iframe-container';
      iframeContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: ${iframeOptions.width || '100%'};
        height: ${iframeOptions.height || '100%'};
        z-index: 1;
        background: white;
        ${iframeOptions.border ? `border: ${iframeOptions.border};` : ''}
      `;

      // 创建iframe
      const iframe = document.createElement('iframe');
      iframe.id = 'sentra-plugin-original-page';
      iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
        margin: 0;
        padding: 0;
      `;

      if (iframeOptions.sandbox) {
        iframe.setAttribute('sandbox', iframeOptions.sandbox);
      }

      // 设置iframe内容
      iframe.srcdoc = originalHTML;

      // 创建多层插件层架构
      const pluginLayerContainer = document.createElement('div');
      pluginLayerContainer.id = 'sentra-plugin-layer-container';
      pluginLayerContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1000000;
      `;

      // 背景效果层 (最低层)
      const backgroundLayer = document.createElement('div');
      backgroundLayer.id = 'sentra-plugin-background-layer';
      backgroundLayer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
      `;

      // 覆盖层 (中间层)
      const overlayLayer = document.createElement('div');
      overlayLayer.id = 'sentra-plugin-overlay-layer';
      overlayLayer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 100;
      `;

      // 交互层 (最高层)
      const interactionLayer = document.createElement('div');
      interactionLayer.id = 'sentra-plugin-interaction-layer';
      interactionLayer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1000;
      `;

      // 组装层级结构
      pluginLayerContainer.appendChild(backgroundLayer);
      pluginLayerContainer.appendChild(overlayLayer);
      pluginLayerContainer.appendChild(interactionLayer);

      // 清空body并添加新结构
      document.body.innerHTML = '';
      iframeContainer.appendChild(iframe);
      document.body.appendChild(iframeContainer);
      document.body.appendChild(pluginLayerContainer);

      // 添加基础样式
      const style = document.createElement('style');
      style.textContent = `
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }

        /* 插件元素样式 */
        .sentra-plugin-element {
          pointer-events: auto;
        }

        /* 背景效果元素 */
        .sentra-plugin-background {
          pointer-events: none;
        }

        /* 覆盖元素 */
        .sentra-plugin-overlay {
          pointer-events: auto;
        }

        /* 交互元素 */
        .sentra-plugin-interactive {
          pointer-events: auto;
          cursor: pointer;
        }

        /* 确保插件元素不影响原页面布局 */
        #sentra-plugin-layer-container * {
          box-sizing: border-box;
        }
      `;
      document.head.appendChild(style);
    }, options);
  }

  /**
   * 应用DOM修改
   */
  private async applyDOMModification(modification: any, useIframe: boolean = false): Promise<void> {
    const page = await this.browserSession.getCurrentPage();
    if (!page) {
      throw new Error('无法获取当前页面');
    }

    await page.evaluate((params: { mod: any, useIframeMode: boolean }) => {
      const { mod, useIframeMode } = params;
      try {
        let targetDocument = document;
        let targetContainer = document.body;
        let targetLayer = null;

        // 如果使用iframe模式，选择合适的插件层
        if (useIframeMode) {
          // 根据修改类型选择合适的层
          const layerType = mod.layerType || 'overlay'; // 默认使用覆盖层

          switch (layerType) {
            case 'background':
              targetLayer = document.getElementById('sentra-plugin-background-layer');
              break;
            case 'overlay':
              targetLayer = document.getElementById('sentra-plugin-overlay-layer');
              break;
            case 'interaction':
              targetLayer = document.getElementById('sentra-plugin-interaction-layer');
              break;
            default:
              targetLayer = document.getElementById('sentra-plugin-overlay-layer');
          }

          if (targetLayer) {
            targetContainer = targetLayer;
          } else {
            // 如果没有插件层，回退到普通模式
            console.warn('插件层未找到，回退到普通DOM修改模式');
          }
        }

        // 根据目标选择器查找元素
        let target = null;
        if (mod.target) {
          if (useIframeMode && targetLayer) {
            // 在iframe模式下，我们需要在插件层中查找或创建对应的覆盖元素
            target = targetLayer.querySelector(`[data-overlay-for="${mod.target}"]`);
            if (!target && (mod.type === 'create' || mod.type === 'modify')) {
              // 如果没找到覆盖元素，使用插件层作为容器
              target = targetLayer;
            }
          } else {
            target = targetDocument.querySelector(mod.target);
          }
        }

        switch (mod.type) {
          case 'create':
            if (mod.element) {
              const newElement = document.createElement(mod.element.tag);

              // 设置属性
              if (mod.element.attributes) {
                Object.entries(mod.element.attributes).forEach(([key, value]: [string, any]) => {
                  newElement.setAttribute(key, value);
                });
              }

              // 设置内容
              if (mod.element.content) {
                newElement.innerHTML = mod.element.content;
              }

              // 设置样式
              if (mod.element.styles) {
                Object.entries(mod.element.styles).forEach(([key, value]: [string, any]) => {
                  (newElement.style as any)[key] = value;
                });
              }

              // 在iframe模式下，确保元素在插件层上可见
              if (useIframeMode && targetLayer) {
                // 根据层类型设置不同的样式类
                const layerType = mod.layerType || 'overlay';
                newElement.classList.add('sentra-plugin-element');

                switch (layerType) {
                  case 'background':
                    newElement.classList.add('sentra-plugin-background');
                    break;
                  case 'overlay':
                    newElement.classList.add('sentra-plugin-overlay');
                    break;
                  case 'interaction':
                    newElement.classList.add('sentra-plugin-interactive');
                    break;
                }

                // 确保元素定位正确
                if (!newElement.style.position) {
                  newElement.style.position = 'fixed';
                }

                // 设置合适的z-index
                if (!newElement.style.zIndex) {
                  const baseZIndex = layerType === 'background' ? 1 :
                                   layerType === 'overlay' ? 100 : 1000;
                  newElement.style.zIndex = String(baseZIndex + 1);
                }

                targetLayer.appendChild(newElement);
              } else if (target) {
                // 普通模式下的元素插入
                switch (mod.position) {
                  case 'before':
                    target.parentNode?.insertBefore(newElement, target);
                    break;
                  case 'after':
                    target.parentNode?.insertBefore(newElement, target.nextSibling);
                    break;
                  case 'afterBegin':
                    target.insertBefore(newElement, target.firstChild);
                    break;
                  case 'inside':
                    target.appendChild(newElement);
                    break;
                  case 'replace':
                    target.parentNode?.replaceChild(newElement, target);
                    break;
                  default:
                    target.appendChild(newElement);
                }
              }
            }
            break;

          case 'modify':
            if (target && mod.element) {
              if (mod.element.attributes) {
                Object.entries(mod.element.attributes).forEach(([key, value]: [string, any]) => {
                  target.setAttribute(key, value);
                });
              }
              if (mod.element.content) {
                target.innerHTML = mod.element.content;
              }
              if (mod.element.styles) {
                Object.entries(mod.element.styles).forEach(([key, value]: [string, any]) => {
                  (target as HTMLElement).style[key as any] = value;
                });
              }
            }
            break;

          case 'delete':
            if (target) {
              target.remove();
            }
            break;
        }
      } catch (error) {
        console.warn('DOM修改失败:', error);
        throw error;
      }
    }, { mod: modification, useIframeMode: useIframe });
  }
}
