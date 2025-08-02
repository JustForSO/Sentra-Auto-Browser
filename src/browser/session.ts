const { chromium } = require('playwright');
import { BrowserProfile, DOMState } from '../types';
import { logger } from '../utils/logger';
import { DOMService } from '../dom/service';
import { Helpers } from '../utils/helpers';
import { MasterController } from './master-controller';
import { Config } from '../config';
import { DownloadManager } from '../utils/download-manager';

/**
 * 浏览器会话管理器 - 浏览器的大管家
 *
 * 这个类就像一个专业的浏览器管家，负责：
 * - 启动和关闭浏览器（支持多种启动方式）
 * - 管理标签页（创建、切换、关闭）
 * - 处理页面交互（点击、输入、导航等）
 * - 提供增强功能（智能DOM检测、标签页管理等）
 */
export class BrowserSession {
  private browser: any = null;        // 浏览器实例，我们的工作伙伴
  private context: any = null;        // 浏览器上下文，工作环境
  private page: any = null;           // 当前活跃页面，主要操作对象
  private domService: DOMService | null = null;  // DOM服务，负责页面元素分析
  private profile: BrowserProfile;               // 浏览器配置，控制启动参数
  private tabs: any[] = [];                      // 标签页列表，管理多个页面
  private currentTabIndex: number = 0;           // 当前标签页索引
  private masterController: MasterController | null = null;  // 主控制器，增强功能的核心
  private enhancedMode: boolean = false;         // 是否启用增强模式
  private downloadManager: DownloadManager | null = null;    // 下载管理器

  constructor(profile: BrowserProfile = {}) {
    // 设置默认配置，用户可以覆盖这些设置
    this.profile = {
      headless: true,                              // 默认无头模式，提高性能
      viewport: { width: 1280, height: 720 },     // 标准分辨率
      timeout: 30000,                              // 30秒超时
      ...profile,                                  // 用户自定义配置会覆盖默认值
    };
  }

  async start(): Promise<void> {
    try {
      logger.info('正在启动浏览器会话...', 'BrowserSession');

      // 🎯 检查是否启用CDP连接模式
      const connectionConfig = Config.getBrowserConnectionConfig();

      if (connectionConfig.connectToUserBrowser) {
        // 使用CDP连接到现有浏览器（无自动化痕迹）
        await this.startWithCDPConnection();
      } else if (this.profile.userDataDir) {
        // 使用 launchPersistentContext 支持用户数据目录
        await this.startWithPersistentContext();
      } else {
        // 使用传统的 launch + newContext 方式
        await this.startWithNewContext();
      }

      // Create page if not already created by CDP connection
      if (!this.page) {
        this.page = await this.context.newPage();
      }
      this.tabs = [this.page];

      // Initialize DOM service
      this.domService = new DOMService(this.page);

      // Set up event listeners
      this.setupEventListeners();

      // 初始化下载管理器
      this.downloadManager = new DownloadManager(this.profile.downloadsPath);

      // 设置下载监听器
      await this.setupDownloadListener();

      logger.success('浏览器会话启动成功', 'BrowserSession');
    } catch (error) {
      logger.error('Failed to start browser session', error as Error, 'BrowserSession');
      throw error;
    }
  }

  /**
   * 使用 launchPersistentContext 启动浏览器（支持用户数据目录）
   */
  private async startWithPersistentContext(): Promise<void> {
    logger.info(`🌎 启动持久化浏览器上下文，用户数据目录: ${this.profile.userDataDir}`, 'BrowserSession');

    // 检查用户数据目录是否存在
    if (this.profile.userDataDir) {
      const fs = require('fs');
      const path = require('path');

      try {
        // 确保用户数据目录存在
        if (!fs.existsSync(this.profile.userDataDir)) {
          fs.mkdirSync(this.profile.userDataDir, { recursive: true });
          logger.info(`📁 创建用户数据目录: ${this.profile.userDataDir}`, 'BrowserSession');
        }
      } catch (error: any) {
        logger.warn(`⚠️ 无法创建用户数据目录: ${error.message}`, 'BrowserSession');
      }
    }

    // 确保下载目录存在
    if (this.profile.downloadsPath) {
      await this.ensureDownloadsDirectory(this.profile.downloadsPath);
    }

    // 构建启动参数
    const launchOptions = {
      userDataDir: this.profile.userDataDir,
      headless: this.profile.headless,
      executablePath: this.profile.executablePath,
      timeout: this.profile.timeout,
      slowMo: this.profile.slowMo,
      devtools: this.profile.devtools,
      args: this.profile.args || [],
      viewport: this.profile.viewport,
      userAgent: this.profile.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: this.profile.ignoreHTTPSErrors,
      proxy: this.profile.proxy,
      locale: this.profile.locale,
      timezoneId: this.profile.timezone,
      geolocation: this.profile.geolocation,
      permissions: this.profile.permissions,
      extraHTTPHeaders: this.profile.extraHTTPHeaders,
      colorScheme: this.profile.colorScheme,
      reducedMotion: this.profile.reducedMotion,
      forcedColors: this.profile.forcedColors,
      // 下载配置
      acceptDownloads: this.profile.acceptDownloads !== false,
      downloadsPath: this.profile.downloadsPath,
    };

    try {
      // 使用 launchPersistentContext 启动
      this.context = await chromium.launchPersistentContext(this.profile.userDataDir!, launchOptions);

      // 从 context 获取 browser 对象（如果可用）
      // 注意：launchPersistentContext 可能不提供 browser 对象
      this.browser = this.context.browser();

      // 初始化下载管理器
      this.downloadManager = new DownloadManager(this.profile.downloadsPath);

      // 设置下载监听器
      await this.setupDownloadListener();

      logger.success(`✅ 持久化浏览器上下文启动成功`, 'BrowserSession');

    } catch (error: any) {
      // 如果启动失败且启用了自动安装
      if (error.message.includes("Executable doesn't exist") && this.profile.autoInstall !== false) {
        logger.info('浏览器未找到，正在自动安装...', 'BrowserSession');

        try {
          const { execSync } = require('child_process');
          execSync('npx playwright install chromium', { stdio: 'inherit' });
          logger.success('浏览器安装完成，重新启动...', 'BrowserSession');

          // 重试启动，但不使用自定义可执行路径
          const retryOptions = { ...launchOptions };
          delete retryOptions.executablePath;

          this.context = await chromium.launchPersistentContext(this.profile.userDataDir!, retryOptions);
          this.browser = this.context.browser();

          // 初始化下载管理器
          this.downloadManager = new DownloadManager(this.profile.downloadsPath);

          // 设置下载监听器
          await this.setupDownloadListener();

        } catch (installError) {
          logger.error('浏览器自动安装失败', installError as Error, 'BrowserSession');
          throw new Error(`浏览器启动失败。请手动运行: npx playwright install chromium`);
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * 确保下载目录存在
   */
  private async ensureDownloadsDirectory(downloadsPath: string): Promise<void> {
    const fs = require('fs');

    try {
      if (!fs.existsSync(downloadsPath)) {
        fs.mkdirSync(downloadsPath, { recursive: true });
        logger.info(`📁 创建下载目录: ${downloadsPath}`, 'BrowserSession');
      }
    } catch (error: any) {
      logger.warn(`⚠️ 无法创建下载目录: ${error.message}`, 'BrowserSession');
    }
  }

  /**
   * 设置下载监听器
   */
  private async setupDownloadListener(): Promise<void> {
    if (!this.context || !this.downloadManager) return;

    this.context.on('page', (page: any) => {
      page.on('download', async (download: any) => {
        if (this.downloadManager) {
          await this.downloadManager.handleDownload(download);
        }
      });
    });

    // 为当前页面也设置下载监听器
    if (this.page) {
      this.page.on('download', async (download: any) => {
        if (this.downloadManager) {
          await this.downloadManager.handleDownload(download);
        }
      });
    }
  }



  /**
   * 📥 获取下载历史
   */
  getDownloadHistory() {
    return this.downloadManager?.getDownloadHistory() || [];
  }

  /**
   * 📁 获取下载目录路径
   */
  getDownloadsPath(): string {
    return this.downloadManager?.getDownloadsPath() || Config.getDefaultDownloadsPath();
  }

  /**
   * 使用传统的 launch + newContext 方式启动浏览器
   */
  private async startWithNewContext(): Promise<void> {
    logger.info('🚀 启动新浏览器实例', 'BrowserSession');

    // Try to launch browser, with auto-install fallback
    try {
      this.browser = await chromium.launch({
        headless: this.profile.headless,
        executablePath: this.profile.executablePath,
        timeout: this.profile.timeout,
        slowMo: this.profile.slowMo,
        devtools: this.profile.devtools,
        args: this.profile.args,
      });
    } catch (error: any) {
      // If browser not found and auto-install is enabled
      if (error.message.includes("Executable doesn't exist") && this.profile.autoInstall !== false) {
        logger.info('浏览器未找到，正在自动安装...', 'BrowserSession');

        try {
          // Install browser using playwright
          const { execSync } = require('child_process');
          execSync('npx playwright install chromium', { stdio: 'inherit' });

          logger.success('浏览器安装完成，重新启动...', 'BrowserSession');

          // Retry launch without custom executable path
          this.browser = await chromium.launch({
            headless: this.profile.headless,
            timeout: this.profile.timeout,
            slowMo: this.profile.slowMo,
            devtools: this.profile.devtools,
            args: this.profile.args,
          });
        } catch (installError) {
          logger.error('浏览器自动安装失败', installError as Error, 'BrowserSession');
          throw new Error(`浏览器启动失败。请手动运行: npx playwright install chromium`);
        }
      } else {
        throw error;
      }
    }

    // 确保下载目录存在
    if (this.profile.downloadsPath) {
      await this.ensureDownloadsDirectory(this.profile.downloadsPath);
    }

    // Create context
    this.context = await this.browser.newContext({
      viewport: this.profile.viewport,
      userAgent: this.profile.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: this.profile.ignoreHTTPSErrors,
      proxy: this.profile.proxy,
      locale: this.profile.locale,
      timezoneId: this.profile.timezone,
      geolocation: this.profile.geolocation,
      permissions: this.profile.permissions,
      extraHTTPHeaders: this.profile.extraHTTPHeaders,
      colorScheme: this.profile.colorScheme,
      reducedMotion: this.profile.reducedMotion,
      forcedColors: this.profile.forcedColors,
      // 下载配置
      acceptDownloads: this.profile.acceptDownloads !== false,
      downloadsPath: this.profile.downloadsPath,
    });
  }

  /**
   * 🔗 使用CDP连接到现有浏览器（无自动化痕迹）
   */
  private async startWithCDPConnection(): Promise<void> {
    try {
      const connectionConfig = Config.getBrowserConnectionConfig();
      const debugUrl = `http://${connectionConfig.debugHost}:${connectionConfig.debugPort}`;

      logger.info(`🔗 连接到调试端口: ${debugUrl}`, 'BrowserSession');

      // 使用connectOverCDP连接
      this.browser = await chromium.connectOverCDP(debugUrl);

      // 获取现有上下文
      const contexts = this.browser.contexts();
      if (contexts.length === 0) {
        throw new Error('未找到浏览器上下文，请确保浏览器正在运行');
      }

      this.context = contexts[0];
      logger.info('✅ 使用现有浏览器上下文', 'BrowserSession');

      // 获取现有页面
      const pages = this.context.pages();
      if (pages.length === 0) {
        throw new Error('未找到打开的页面，请在浏览器中打开一个页面');
      }

      this.page = pages[0];
      logger.info('✅ 使用现有页面', 'BrowserSession');

      // 设置视口大小
      await this.page.setViewportSize({ width: 1920, height: 1080 });

      // 注意：使用connectOverCDP时不需要应用反检测脚本，因为本身就没有自动化痕迹
      logger.info('🔓 使用CDP连接，无自动化痕迹', 'BrowserSession');

      logger.success('✅ 成功连接到浏览器调试实例', 'BrowserSession');

    } catch (error: any) {
      logger.warn('❌ CDP连接失败，尝试自动启动调试浏览器', 'BrowserSession');

      // 如果连接失败且用户提供了浏览器路径，自动启动调试浏览器
      if (this.profile.executablePath) {
        await this.startDebugBrowserAndConnect();
      } else {
        logger.warn('❌ 未提供浏览器路径，无法自动启动调试浏览器', 'BrowserSession');
        throw new Error('CDP连接失败且未提供浏览器路径。请设置BROWSER_EXECUTABLE_PATH或手动启动调试浏览器');
      }
    }
  }

  /**
   * 🚀 自动启动调试浏览器并连接
   */
  private async startDebugBrowserAndConnect(): Promise<void> {
    try {
      logger.info('🚀 自动启动调试浏览器...', 'BrowserSession');

      // 先检查并清理现有浏览器进程
      await this.cleanupExistingBrowserProcesses();

      const { spawn } = require('child_process');
      const connectionConfig = Config.getBrowserConnectionConfig();

      const args = [
        `--remote-debugging-port=${connectionConfig.debugPort}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--start-maximized'
      ];

      // 如果有用户数据目录，添加参数
      if (this.profile.userDataDir) {
        args.push(`--user-data-dir=${this.profile.userDataDir}`);
      }

      // 启动默认页面
      args.push('https://www.baidu.com');

      logger.info(`📝 启动参数: ${args.join(' ')}`, 'BrowserSession');

      const browserProcess = spawn(this.profile.executablePath, args, {
        detached: true,
        stdio: 'ignore'
      });

      browserProcess.unref();

      logger.info('⏳ 等待浏览器启动...', 'BrowserSession');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 重新尝试CDP连接
      const debugUrl = `http://${connectionConfig.debugHost}:${connectionConfig.debugPort}`;
      logger.info(`🔗 重新连接到调试端口: ${debugUrl}`, 'BrowserSession');

      this.browser = await chromium.connectOverCDP(debugUrl);

      const contexts = this.browser.contexts();
      if (contexts.length === 0) {
        throw new Error('自动启动后仍未找到浏览器上下文');
      }

      this.context = contexts[0];
      const pages = this.context.pages();
      if (pages.length === 0) {
        throw new Error('自动启动后仍未找到打开的页面');
      }

      this.page = pages[0];
      await this.page.setViewportSize({ width: 1920, height: 1080 });

      logger.success('✅ 自动启动调试浏览器并连接成功', 'BrowserSession');

    } catch (error: any) {
      logger.error('❌ 自动启动调试浏览器失败', error, 'BrowserSession');
      throw error;
    }
  }

  /**
   * 🧹 清理现有浏览器进程
   */
  private async cleanupExistingBrowserProcesses(): Promise<void> {
    try {
      logger.info('🧹 检查并清理现有浏览器进程...', 'BrowserSession');

      const { execSync } = require('child_process');
      const path = require('path');

      // 获取浏览器可执行文件名
      const browserName = path.basename(this.profile.executablePath || '', '.exe');

      // 检查是否有相同的浏览器进程在运行
      try {
        const result = execSync(`tasklist /FI "IMAGENAME eq ${browserName}.exe" /FO CSV`, {
          encoding: 'utf8',
          timeout: 5000
        });

        if (result.includes(browserName)) {
          logger.info(`🔍 发现现有${browserName}进程，正在清理...`, 'BrowserSession');

          // 强制结束所有相同名称的浏览器进程
          execSync(`taskkill /F /IM ${browserName}.exe`, {
            encoding: 'utf8',
            timeout: 10000
          });

          logger.info(`✅ 已清理${browserName}进程`, 'BrowserSession');

          // 等待进程完全结束
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          logger.info('✅ 未发现冲突的浏览器进程', 'BrowserSession');
        }
      } catch (error: any) {
        // 如果tasklist命令失败，可能是因为没有找到进程，这是正常的
        if (!error.message.includes('No tasks are running')) {
          logger.warn(`⚠️ 检查浏览器进程时出错: ${error.message}`, 'BrowserSession');
        }
      }

      // 额外检查调试端口是否被占用
      await this.checkAndCleanupDebugPort();

    } catch (error: any) {
      logger.warn(`⚠️ 清理浏览器进程时出错: ${error.message}`, 'BrowserSession');
      // 不抛出错误，继续尝试启动
    }
  }

  /**
   * 🔍 检查并清理调试端口
   */
  private async checkAndCleanupDebugPort(): Promise<void> {
    try {
      const connectionConfig = Config.getBrowserConnectionConfig();
      const { execSync } = require('child_process');

      // 检查端口是否被占用
      try {
        const result = execSync(`netstat -ano | findstr :${connectionConfig.debugPort}`, {
          encoding: 'utf8',
          timeout: 5000
        });

        if (result.trim()) {
          logger.info(`🔍 调试端口${connectionConfig.debugPort}被占用，正在清理...`, 'BrowserSession');

          // 提取PID并结束进程
          const lines = result.trim().split('\n');
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 5) {
              const pid = parts[parts.length - 1];
              if (pid && pid !== '0') {
                try {
                  execSync(`taskkill /F /PID ${pid}`, {
                    encoding: 'utf8',
                    timeout: 5000
                  });
                  logger.info(`✅ 已结束占用端口的进程 PID: ${pid}`, 'BrowserSession');
                } catch (killError) {
                  logger.warn(`⚠️ 无法结束进程 PID: ${pid}`, 'BrowserSession');
                }
              }
            }
          }

          // 等待端口释放
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          logger.info(`✅ 调试端口${connectionConfig.debugPort}未被占用`, 'BrowserSession');
        }
      } catch (error: any) {
        // 如果netstat命令失败，可能是因为端口未被占用
        logger.info(`✅ 调试端口${connectionConfig.debugPort}检查完成`, 'BrowserSession');
      }

    } catch (error: any) {
      logger.warn(`⚠️ 检查调试端口时出错: ${error.message}`, 'BrowserSession');
    }
  }

  async close(): Promise<void> {
    try {
      // 检查是否应该关闭浏览器
      const connectionConfig = Config.getBrowserConnectionConfig();
      const shouldCloseBrowser = connectionConfig.autoClose && !connectionConfig.connectToUserBrowser;

      if (!shouldCloseBrowser) {
        logger.info('🔗 CDP连接模式，保持浏览器运行', 'BrowserSession');

        // 只禁用增强模式，不关闭浏览器
        if (this.enhancedMode) {
          await this.disableEnhancedMode();
        }

        // 断开连接但不关闭浏览器
        if (this.browser) {
          try {
            await this.browser.close();
            logger.info('✅ 已断开CDP连接，浏览器继续运行', 'BrowserSession');
          } catch (error) {
            logger.warn('⚠️ 断开CDP连接时出错，但浏览器继续运行', 'BrowserSession');
          }
        }

        this.browser = null;
        this.context = null;
        this.page = null;

        logger.success('✅ 会话已结束，浏览器保持运行', 'BrowserSession');
        return;
      }

      logger.info('Closing browser session...', 'BrowserSession');

      // Set a timeout for the entire close operation
      const closePromise = this.performClose();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Browser close timeout')), 10000);
      });

      await Promise.race([closePromise, timeoutPromise]);
      logger.success('Browser session closed successfully', 'BrowserSession');
    } catch (error) {
      logger.error('Error closing browser session', error as Error, 'BrowserSession');
      // Force kill if normal close fails
      try {
        if (this.browser) {
          await this.browser.close();
        }
      } catch (killError) {
        logger.error('Failed to force close browser', killError as Error, 'BrowserSession');
      }
    }
  }

  private async performClose(): Promise<void> {
    // 首先关闭增强模式
    if (this.enhancedMode) {
      try {
        await this.disableEnhancedMode();
      } catch (error) {
        logger.warn('Failed to disable enhanced mode during close', 'BrowserSession');
      }
    }

    if (this.page) {
      try {
        await this.page.close();
      } catch (error) {
        logger.warn('Failed to close page gracefully', 'BrowserSession');
      }
      this.page = null;
    }

    if (this.context) {
      try {
        await this.context.close();
      } catch (error) {
        logger.warn('Failed to close context gracefully', 'BrowserSession');
      }
      this.context = null;
    }

    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        logger.warn('Failed to close browser gracefully', 'BrowserSession');
      }
      this.browser = null;
    }

    this.domService = null;
  }

  async navigate(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser session not started');
    }

    try {
      logger.info(`Navigating to: ${url}`, 'BrowserSession');
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.profile.timeout });
      await this.page.waitForTimeout(1000); // Wait for page to stabilize
      logger.success(`Successfully navigated to: ${url}`, 'BrowserSession');
    } catch (error) {
      logger.error(`Failed to navigate to: ${url}`, error as Error, 'BrowserSession');
      throw error;
    }
  }

  async getDOMState(): Promise<DOMState> {
    if (!this.page || !this.domService) {
      throw new Error('Browser session not started');
    }

    try {
      // 🎯 如果启用了增强模式，使用增强DOM检测器
      if (this.enhancedMode && this.masterController) {
        logger.info('🔍 使用增强DOM检测器', 'BrowserSession');
        return await this.masterController.getEnhancedDOMState();
      }

      // 否则使用标准DOM服务
      return await this.domService.getDOMState();
    } catch (error) {
      logger.error('Failed to get DOM state', error as Error, 'BrowserSession');
      throw error;
    }
  }

  async click(index: number, xpath?: string, cssSelector?: string, text?: string, attributes?: Record<string, string>): Promise<boolean> {
    if (!this.page) {
      throw new Error('Browser session not started');
    }

    try {
      logger.info(`🎯 开始点击元素 index: ${index}`, 'BrowserSession');

      // 使用buildDomTree.js设置的data-browser-use-index属性
      const selector = `[data-browser-use-index="${index}"]`;

      // 等待元素存在并可见
      await this.page.waitForSelector(selector, { timeout: 10000 });

      // Store current state to detect navigation
      const currentUrl = this.page.url();
      const currentDOMHash = await this.getDOMStructureHash();

      // 执行点击
      await this.page.click(selector);

      logger.info(`✅ 成功点击元素 index: ${index}`, 'BrowserSession');

      // Wait for potential navigation and page load
      const navigationDetected = await this.waitForPotentialNavigation(currentUrl, currentDOMHash);

      if (navigationDetected) {
        logger.info('🔄 Navigation detected after click, page state may have changed', 'BrowserSession');
      }

      return navigationDetected;
    } catch (error) {
      logger.error(`❌ 点击元素失败 index ${index}`, error as Error, 'BrowserSession');
      throw error;
    }
  }

  /**
   * 创建强健的Playwright定位器 - 符合最佳实践
   */
  private async createRobustLocator(index: number, options: { xpath?: string, cssSelector?: string, text?: string, attributes?: Record<string, string> }): Promise<any> {
    logger.info(`🔍 创建强健定位器 index: ${index}`, 'BrowserSession');

    // 获取缓存的元素信息
    const cachedElement = this.domService['elementCache'].get(`index_${index}`);

    // 策略1: 使用用户可见的属性（Playwright最佳实践）
    if (cachedElement) {
      // 优先使用role + name组合（最推荐）
      const role = cachedElement.attributes?.role;
      if (role && cachedElement.text) {
        try {
          const locator = this.page.getByRole(role as any, { name: new RegExp(cachedElement.text.trim(), 'i') });
          if (await locator.count() === 1) {
            logger.info(`✅ 通过role+name定位成功: ${role}[${cachedElement.text}]`, 'BrowserSession');
            return locator;
          }
        } catch (error) {
          logger.debug(`Role+name策略失败: ${error}`, 'BrowserSession');
        }
      }

      // 使用文本内容定位
      if (cachedElement.text && cachedElement.text.trim()) {
        try {
          const locator = this.page.getByText(cachedElement.text.trim());
          if (await locator.count() === 1) {
            logger.info(`✅ 通过文本定位成功: ${cachedElement.text}`, 'BrowserSession');
            return locator;
          }
        } catch (error) {
          logger.debug(`文本策略失败: ${error}`, 'BrowserSession');
        }
      }

      // 使用label定位（表单元素）
      const label = cachedElement.attributes?.['aria-label'] || cachedElement.attributes?.label;
      if (label) {
        try {
          const locator = this.page.getByLabel(label);
          if (await locator.count() === 1) {
            logger.info(`✅ 通过label定位成功: ${label}`, 'BrowserSession');
            return locator;
          }
        } catch (error) {
          logger.debug(`Label策略失败: ${error}`, 'BrowserSession');
        }
      }

      // 使用placeholder定位
      const placeholder = cachedElement.attributes?.placeholder;
      if (placeholder) {
        try {
          const locator = this.page.getByPlaceholder(placeholder);
          if (await locator.count() === 1) {
            logger.info(`✅ 通过placeholder定位成功: ${placeholder}`, 'BrowserSession');
            return locator;
          }
        } catch (error) {
          logger.debug(`Placeholder策略失败: ${error}`, 'BrowserSession');
        }
      }

      // 使用title属性定位
      const title = cachedElement.attributes?.title;
      if (title) {
        try {
          const locator = this.page.getByTitle(title);
          if (await locator.count() === 1) {
            logger.info(`✅ 通过title定位成功: ${title}`, 'BrowserSession');
            return locator;
          }
        } catch (error) {
          logger.debug(`Title策略失败: ${error}`, 'BrowserSession');
        }
      }
    }

    // 策略2: 使用传入的选择器（回退策略）
    if (options.cssSelector) {
      try {
        const locator = this.page.locator(options.cssSelector);
        if (await locator.count() === 1) {
          logger.info(`✅ 通过CSS选择器定位成功: ${options.cssSelector}`, 'BrowserSession');
          return locator;
        }
      } catch (error) {
        logger.debug(`CSS选择器策略失败: ${error}`, 'BrowserSession');
      }
    }

    if (options.xpath) {
      try {
        const locator = this.page.locator(`xpath=${options.xpath}`);
        if (await locator.count() === 1) {
          logger.info(`✅ 通过XPath定位成功: ${options.xpath}`, 'BrowserSession');
          return locator;
        }
      } catch (error) {
        logger.debug(`XPath策略失败: ${error}`, 'BrowserSession');
      }
    }

    // 策略3: 通过data-browser-use-index属性（最后的回退）
    try {
      const locator = this.page.locator(`[data-browser-use-index="${index}"]`);
      if (await locator.count() === 1) {
        logger.info(`✅ 通过data-browser-use-index定位成功: ${index}`, 'BrowserSession');
        return locator;
      }
    } catch (error) {
      logger.debug(`data-browser-use-index策略失败: ${error}`, 'BrowserSession');
    }

    logger.warn(`❌ 所有定位策略都失败，无法找到元素 ${index}`, 'BrowserSession');
    return null;
  }

  /**
   * 执行强健的点击操作 - 使用Playwright自动等待
   */
  private async performRobustClick(locator: any, index: number): Promise<void> {
    logger.info(`🎯 执行强健点击操作 index: ${index}`, 'BrowserSession');

    try {
      // 使用Playwright的自动等待和可操作性检查
      await locator.waitFor({ state: 'visible', timeout: 10000 });
      await locator.waitFor({ state: 'attached', timeout: 5000 });

      // 确保元素在视口中
      await locator.scrollIntoViewIfNeeded();

      // 等待元素稳定（不在动画中）
      await locator.waitFor({ state: 'stable', timeout: 5000 });

      // 执行点击 - Playwright会自动检查可操作性
      await locator.click({
        timeout: 10000,
        force: false, // 不强制点击，让Playwright检查可操作性
        trial: false  // 不是试运行
      });

      logger.info(`✅ 强健点击操作成功 index: ${index}`, 'BrowserSession');

    } catch (error) {
      logger.error(`❌ 强健点击操作失败 index: ${index}`, error as Error, 'BrowserSession');

      // 尝试强制点击作为最后的回退
      try {
        logger.info(`🔄 尝试强制点击作为回退 index: ${index}`, 'BrowserSession');
        await locator.click({ force: true, timeout: 5000 });
        logger.info(`✅ 强制点击成功 index: ${index}`, 'BrowserSession');
      } catch (forceError) {
        logger.error(`❌ 强制点击也失败 index: ${index}`, forceError as Error, 'BrowserSession');
        throw error; // 抛出原始错误
      }
    }
  }

  private async performClickWithRetry(element: any, index: number, maxRetries: number = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check if element is still attached and visible
        const isVisible = await element.isVisible();
        if (!isVisible) {
          throw new Error('Element is not visible');
        }

        // Try different click strategies
        if (attempt === 1) {
          // Standard click
          await element.click({ timeout: 5000 });
        } else if (attempt === 2) {
          // Force click (ignore covering elements)
          await element.click({ force: true, timeout: 5000 });
        } else {
          // JavaScript click as last resort
          await element.evaluate((el: HTMLElement) => el.click());
        }

        return; // Success
      } catch (error) {
        logger.warn(`Click attempt ${attempt}/${maxRetries} failed for element ${index}: ${error}`, 'BrowserSession');

        if (attempt === maxRetries) {
          throw error;
        }

        // Wait before retry
        await this.page.waitForTimeout(500 * attempt);
      }
    }
  }

  /**
   * 强健的文本输入 - 使用Playwright最佳实践
   */
  async type(index: number, text: string, xpath?: string, cssSelector?: string, attributes?: Record<string, string>): Promise<void> {
    if (!this.page) {
      throw new Error('Browser session not started');
    }

    try {
      logger.info(`⌨️ 开始输入文本到元素 index: ${index}, text: "${text}"`, 'BrowserSession');

      // 使用buildDomTree.js设置的data-browser-use-index属性
      const selector = `[data-browser-use-index="${index}"]`;

      // 等待元素存在并可见
      await this.page.waitForSelector(selector, { timeout: 10000 });

      // 验证元素是否适合输入操作
      await this.validateInputElement(selector, index);

      // Store current state to detect navigation
      const currentUrl = this.page.url();
      const currentDOMHash = await this.getDOMStructureHash();

      // 清除现有内容并输入新文本
      await this.page.fill(selector, text);

      logger.info(`✅ 成功输入文本到元素 index: ${index}`, 'BrowserSession');

      // Wait for potential navigation after typing (e.g., auto-submit forms)
      const navigationDetected = await this.waitForPotentialNavigation(currentUrl, currentDOMHash);

      if (navigationDetected) {
        logger.info('🔄 Navigation detected after typing, page state may have changed', 'BrowserSession');
      }
    } catch (error) {
      logger.error(`❌ 输入文本失败 index ${index}`, error as Error, 'BrowserSession');
      throw error;
    }
  }

  /**
   * 验证元素是否适合输入操作
   */
  private async validateInputElement(selector: string, index: number): Promise<void> {
    try {
      // 获取元素信息
      const elementInfo = await this.page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) return null;

        return {
          tagName: element.tagName.toLowerCase(),
          type: element.getAttribute('type'),
          disabled: element.hasAttribute('disabled'),
          readOnly: element.hasAttribute('readonly'),
          contentEditable: element.getAttribute('contenteditable'),
          role: element.getAttribute('role'),
          className: element.className,
          href: element.getAttribute('href')
        };
      }, selector);

      if (!elementInfo) {
        throw new Error(`Element with index ${index} not found`);
      }

      // 检查是否是链接元素
      if (elementInfo.tagName === 'a') {
        throw new Error(`Element is not an <input>, <textarea>, <select> or [contenteditable] and does not have a role allowing [aria-readonly]. Cannot type into link element (index: ${index}). Links should be clicked, not typed into.`);
      }

      // 检查是否是按钮元素
      if (elementInfo.tagName === 'button' ||
          (elementInfo.tagName === 'input' && ['button', 'submit', 'reset'].includes(elementInfo.type || ''))) {
        throw new Error(`Element is not an <input>, <textarea>, <select> or [contenteditable] and does not have a role allowing [aria-readonly]. Cannot type into button element (index: ${index}). Buttons should be clicked, not typed into.`);
      }

      // 检查是否是可输入的元素
      const isInputElement = elementInfo.tagName === 'input' &&
        ['text', 'search', 'email', 'password', 'tel', 'url', 'number'].includes(elementInfo.type || 'text');
      const isTextarea = elementInfo.tagName === 'textarea';
      const isContentEditable = elementInfo.contentEditable === 'true';
      const isSelect = elementInfo.tagName === 'select';

      if (!isInputElement && !isTextarea && !isContentEditable && !isSelect) {
        throw new Error(`Element is not an <input>, <textarea>, <select> or [contenteditable] and does not have a role allowing [aria-readonly]. Cannot type into ${elementInfo.tagName} element (index: ${index}).`);
      }

      // 检查是否被禁用或只读
      if (elementInfo.disabled) {
        throw new Error(`Cannot type into disabled element (index: ${index})`);
      }

      if (elementInfo.readOnly) {
        throw new Error(`Cannot type into readonly element (index: ${index})`);
      }

      logger.debug(`✅ Element validation passed for index ${index} (${elementInfo.tagName})`, 'BrowserSession');
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error(`❌ Element validation failed for index ${index}`, errorObj, 'BrowserSession');
      throw error;
    }
  }

  /**
   * 执行强健的文本输入操作
   */
  private async performRobustType(locator: any, text: string, index: number): Promise<void> {
    logger.info(`⌨️ 执行强健文本输入 index: ${index}`, 'BrowserSession');

    try {
      // 等待元素可见和可编辑
      await locator.waitFor({ state: 'visible', timeout: 10000 });
      await locator.waitFor({ state: 'attached', timeout: 5000 });

      // 确保元素在视口中
      await locator.scrollIntoViewIfNeeded();

      // 检查元素类型和属性
      const tagName = await locator.evaluate((el: any) => el.tagName.toLowerCase());
      const elementType = await locator.evaluate((el: any) => el.type || '');
      logger.info(`📝 元素信息: ${tagName}, type: ${elementType}`, 'BrowserSession');

      // 聚焦元素
      await locator.focus();
      await this.page.waitForTimeout(200); // 等待聚焦完成

      // 根据元素类型选择不同的输入策略
      if (tagName === 'textarea' || (tagName === 'input' && elementType !== 'search')) {
        // 对于普通输入框和文本域
        await locator.clear();
        await locator.fill(text);
      } else {
        // 对于搜索框等特殊元素，使用更温和的方法
        await locator.click(); // 确保聚焦
        await locator.selectText(); // 选择所有文本
        await locator.type(text, { delay: 50 }); // 逐字符输入
      }

      // 验证输入是否成功
      try {
        const inputValue = await locator.inputValue();
        logger.info(`📝 输入验证: 期望="${text}", 实际="${inputValue}"`, 'BrowserSession');

        if (inputValue !== text) {
          logger.warn(`⚠️ 输入验证失败，尝试重新输入`, 'BrowserSession');
          // 尝试重新输入
          await locator.clear();
          await locator.type(text, { delay: 100 }); // 更慢的输入
        }
      } catch (validationError) {
        logger.warn(`⚠️ 无法验证输入值，可能是特殊元素类型`, 'BrowserSession');
      }

      logger.info(`✅ 强健文本输入成功 index: ${index}`, 'BrowserSession');

    } catch (error) {
      logger.error(`❌ 强健文本输入失败 index: ${index}`, error as Error, 'BrowserSession');

      // 尝试最基本的输入作为回退
      try {
        logger.info(`🔄 尝试最基本输入作为回退 index: ${index}`, 'BrowserSession');
        await locator.click(); // 确保聚焦
        await this.page.waitForTimeout(300);

        // 使用页面级别的键盘输入
        await this.page.keyboard.press('Control+a'); // 全选
        await this.page.keyboard.type(text, { delay: 100 }); // 逐字符输入

        logger.info(`✅ 最基本输入成功 index: ${index}`, 'BrowserSession');
      } catch (fallbackError) {
        logger.error(`❌ 最基本输入也失败 index: ${index}`, fallbackError as Error, 'BrowserSession');
        throw error; // 抛出原始错误
      }
    }
  }

  private async performTypeWithRetry(element: any, text: string, index: number, maxRetries: number = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check if element is still attached and visible
        const isVisible = await element.isVisible();
        if (!isVisible) {
          throw new Error('Input element is not visible');
        }

        // Check if element is editable
        const isEditable = await element.isEditable();
        if (!isEditable) {
          throw new Error('Element is not editable');
        }

        // Try different typing strategies
        if (attempt === 1) {
          // Standard fill
          await element.fill(text, { timeout: 5000 });
        } else if (attempt === 2) {
          // Clear and type
          await element.clear();
          await element.type(text, { delay: 50 });
        } else {
          // JavaScript value setting as last resort
          await element.evaluate((el: HTMLInputElement, value: string) => {
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }, text);
        }

        return; // Success
      } catch (error) {
        logger.warn(`Type attempt ${attempt}/${maxRetries} failed for element ${index}: ${error}`, 'BrowserSession');

        if (attempt === maxRetries) {
          throw error;
        }

        // Wait before retry
        await this.page.waitForTimeout(300 * attempt);
      }
    }
  }

  async scroll(direction: 'up' | 'down', amount?: number): Promise<void> {
    if (!this.page) {
      throw new Error('Browser session not started');
    }

    try {
      const scrollAmount = amount || 500;
      const scrollDirection = direction === 'down' ? scrollAmount : -scrollAmount;
      
      await this.page.evaluate((delta) => {
        window.scrollBy(0, delta);
      }, scrollDirection);

      logger.info(`Scrolled ${direction} by ${Math.abs(scrollDirection)}px`, 'BrowserSession');
      await this.page.waitForTimeout(500); // Wait for scroll to complete
    } catch (error) {
      logger.error(`Failed to scroll ${direction}`, error as Error, 'BrowserSession');
      throw error;
    }
  }

  async wait(seconds: number): Promise<void> {
    logger.info(`Waiting for ${seconds} seconds...`, 'BrowserSession');
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  async takeScreenshot(): Promise<string> {
    if (!this.page) {
      throw new Error('Browser session not started');
    }

    try {
      // 1. 先等待页面基本稳定（短时间）
      try {
        await this.page.waitForLoadState('domcontentloaded', { timeout: 3000 });
      } catch (error) {
        logger.debug('页面加载状态等待超时，继续截图', 'BrowserSession');
      }

      // 2. 获取视口尺寸
      const dimensions = await this.page.evaluate(() => ({
        width: Math.min(1920, window.innerWidth),
        height: Math.min(1080, window.innerHeight)
      }));

      // 3. 使用优化的截图参数
      const screenshot = await this.page.screenshot({
        type: 'jpeg',
        quality: 80,
        fullPage: false,
        timeout: 15000, // 增加超时时间
        animations: 'disabled', // 禁用动画避免等待
        clip: {
          x: 0,
          y: 0,
          width: dimensions.width,
          height: dimensions.height
        }
      });

      return screenshot.toString('base64');
    } catch (error) {
      logger.error('Failed to take screenshot', error as Error, 'BrowserSession');

      // 🎯 回退策略1：尝试更简单的截图
      try {
        logger.info('尝试回退截图策略...', 'BrowserSession');
        const fallbackScreenshot = await this.page.screenshot({
          type: 'png',
          fullPage: false,
          timeout: 8000,
          animations: 'disabled'
        });
        return fallbackScreenshot.toString('base64');
      } catch (fallbackError) {
        logger.error('回退截图也失败', fallbackError as Error, 'BrowserSession');

        // 🎯 回退策略2：强制截图当前界面（最短超时）
        try {
          logger.info('尝试强制截图当前界面...', 'BrowserSession');
          const forceScreenshot = await this.page.screenshot({
            type: 'jpeg',
            quality: 60,
            fullPage: false,
            timeout: 3000, // 最短超时
            animations: 'disabled'
          });
          return forceScreenshot.toString('base64');
        } catch (forceError) {
          logger.error('强制截图也失败，返回空截图', forceError as Error, 'BrowserSession');
          // 返回一个1x1像素的透明图片的base64
          return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        }
      }
    }
  }

  async getCurrentState(): Promise<DOMState> {
    if (!this.page) {
      throw new Error('Browser session not started');
    }

    try {
      return await this.domService.getDOMState();
    } catch (error) {
      logger.error('Failed to get current state', error as Error, 'BrowserSession');
      throw error;
    }
  }

  getCurrentUrl(): string {
    if (!this.page) {
      throw new Error('Browser session not started');
    }
    return this.page.url();
  }

  async getCurrentTitle(): Promise<string> {
    if (!this.page) {
      throw new Error('Browser session not started');
    }
    return await this.page.title();
  }

  isStarted(): boolean {
    // 🎯 修复：使用 launchPersistentContext 时 browser 可能为 null
    // 只要有 context 和 page 就认为已启动
    return this.context !== null && this.page !== null;
  }

  // Getter methods for enhanced components
  getCurrentPage() {
    return this.page;
  }

  updateCurrentPage(page: any) {
    this.page = page;
    // 同时更新DOM服务的页面引用
    if (this.domService) {
      this.domService.updatePage(page);
    }
  }

  getBrowser() {
    return this.browser;
  }

  getContext() {
    return this.context;
  }

  /**
   * 创建新标签页并导航
   */
  async createNewTab(url: string): Promise<void> {
    if (!this.context) {
      throw new Error('Browser context not available');
    }

    try {
      logger.info(`Creating new tab and navigating to: ${url}`, 'BrowserSession');

      // 创建新页面
      const newPage = await this.context.newPage();

      // 导航到指定URL
      await newPage.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      // 更新标签页列表
      this.tabs = await this.context.pages();

      logger.info(`Created new tab (index: ${this.tabs.length - 1}) and navigated to ${url}`, 'BrowserSession');

    } catch (error) {
      logger.error('Failed to create new tab', error as Error, 'BrowserSession');
      throw error;
    }
  }

  /**
   * 启用增强模式 - 激活所有智能功能
   */
  async enableEnhancedMode(): Promise<void> {
    try {
      if (this.enhancedMode) {
        logger.warn('⚠️ 增强模式已经启用', 'BrowserSession');
        return;
      }

      if (!this.isStarted()) {
        throw new Error('浏览器会话未启动，无法启用增强模式');
      }

      logger.info('🚀 启用增强模式...', 'BrowserSession');

      // 初始化主控制器
      this.masterController = new MasterController(this);
      await this.masterController.initialize();

      this.enhancedMode = true;
      logger.success('✅ 增强模式已启用', 'BrowserSession');

    } catch (error: any) {
      logger.error(`❌ 启用增强模式失败: ${error.message}`, error, 'BrowserSession');
      throw error;
    }
  }

  /**
   * 禁用增强模式
   */
  async disableEnhancedMode(): Promise<void> {
    try {
      if (!this.enhancedMode) {
        logger.warn('⚠️ 增强模式未启用', 'BrowserSession');
        return;
      }

      logger.info('🛑 禁用增强模式...', 'BrowserSession');

      if (this.masterController) {
        await this.masterController.shutdown();
        this.masterController = null;
      }

      this.enhancedMode = false;
      logger.success('✅ 增强模式已禁用', 'BrowserSession');

    } catch (error: any) {
      logger.error(`❌ 禁用增强模式失败: ${error.message}`, error, 'BrowserSession');
    }
  }

  /**
   * 检查是否启用了增强模式
   */
  isEnhancedModeEnabled(): boolean {
    return this.enhancedMode;
  }

  /**
   * 增强的DOM状态获取 - 使用智能缓存和检测
   */
  async getEnhancedDOMState(forceRefresh: boolean = false): Promise<DOMState> {
    if (!this.page) {
      throw new Error('Browser session not started');
    }

    try {
      // 如果启用了增强模式，使用增强的DOM检测器
      if (this.enhancedMode && this.masterController) {
        logger.info('🚀 使用增强DOM检测器', 'BrowserSession');
        return await this.masterController.detectElements(forceRefresh);
      }

      // 回退到快速DOM检测
      logger.info('⚡ 使用快速DOM检测', 'BrowserSession');
      return await this.getFastDOMState();

    } catch (error) {
      logger.error('Failed to get enhanced DOM state', error as Error, 'BrowserSession');
      throw error;
    }
  }

  /**
   * 快速DOM状态获取
   */
  async getFastDOMState(): Promise<DOMState> {
    if (!this.page) {
      throw new Error('Browser session not started');
    }

    try {
      const startTime = Date.now();

      // 使用优化的DOM检测
      const domState = await this.domService!.getOptimizedDOMState();
      const elements = domState.elements;

      // 获取页面基本信息
      const [url, title] = await Promise.all([
        this.page.url(),
        this.page.title()
      ]);

      const endTime = Date.now();
      logger.info(`⚡ 快速DOM状态获取完成: ${elements.length}个元素, 耗时: ${endTime - startTime}ms`, 'BrowserSession');

      return {
        elements,
        url,
        title,
        screenshot: '' // 快速模式下跳过截图
      };

    } catch (error) {
      logger.error('快速DOM状态获取失败', error as Error, 'BrowserSession');
      // 最终回退到标准DOM服务
      return await this.domService!.getDOMState();
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
    if (!this.enhancedMode || !this.masterController) {
      throw new Error('增强模式未启用，无法使用智能标签页切换');
    }

    try {
      logger.info('🎯 执行智能标签页切换...', 'BrowserSession');
      const newPage = await this.masterController.smartSwitchTab(criteria);

      if (newPage) {
        // 更新当前页面引用
        this.page = newPage;

        // 更新DOM服务
        if (this.domService) {
          this.domService = new DOMService(this.page);
        }

        logger.success('✅ 智能标签页切换成功', 'BrowserSession');
        return newPage;
      } else {
        logger.warn('⚠️ 未找到合适的标签页', 'BrowserSession');
        return null;
      }

    } catch (error) {
      logger.error('Failed to smart switch tab', error as Error, 'BrowserSession');
      throw error;
    }
  }

  /**
   * 获取增强模式统计信息
   */
  getEnhancedModeStats(): any {
    if (!this.enhancedMode || !this.masterController) {
      return null;
    }

    return this.masterController.getOperationStats();
  }

  // Advanced browser features
  async hover(index: number, xpath?: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser session not started');
    }

    try {
      if (xpath) {
        const element = this.page.locator(`xpath=${xpath}`);
        await element.hover();
        logger.info(`Hovered over element with xpath: ${xpath}`, 'BrowserSession');
      } else {
        const elements = await this.page.locator('[data-browser-use-index]').all();
        if (index >= 0 && index < elements.length) {
          await elements[index].hover();
          logger.info(`Hovered over element at index: ${index}`, 'BrowserSession');
        } else {
          throw new Error(`Element index ${index} out of range`);
        }
      }
      await this.page.waitForTimeout(300);
    } catch (error) {
      logger.error(`Failed to hover over element`, error as Error, 'BrowserSession');
      throw error;
    }
  }

  async dragAndDrop(sourceIndex: number, targetIndex: number, sourceXpath?: string, targetXpath?: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser session not started');
    }

    try {
      let sourceElement, targetElement;

      if (sourceXpath && targetXpath) {
        sourceElement = this.page.locator(`xpath=${sourceXpath}`);
        targetElement = this.page.locator(`xpath=${targetXpath}`);
      } else {
        const elements = await this.page.locator('[data-browser-use-index]').all();
        if (sourceIndex >= elements.length || targetIndex >= elements.length) {
          throw new Error('Element index out of range');
        }
        sourceElement = elements[sourceIndex];
        targetElement = elements[targetIndex];
      }

      await sourceElement.dragTo(targetElement);
      logger.info(`Dragged element from ${sourceIndex} to ${targetIndex}`, 'BrowserSession');
      await this.page.waitForTimeout(500);
    } catch (error) {
      logger.error(`Failed to drag and drop`, error as Error, 'BrowserSession');
      throw error;
    }
  }

  async pressKey(key: string, modifiers?: string[], options: {
    waitForNavigation?: boolean;
    expectFormSubmit?: boolean;
    targetElement?: any;
    retryCount?: number;
  } = {}): Promise<boolean> {
    if (!this.page) {
      throw new Error('Browser session not started');
    }

    try {
      logger.info(`⌨️ 按键操作: ${key}`, 'BrowserSession');

      // Store current state to detect navigation
      const currentUrl = this.page.url();
      const currentDOMHash = await this.getDOMStructureHash();

      if (modifiers && modifiers.length > 0) {
        const modifierString = modifiers.join('+') + '+' + key;
        await this.page.keyboard.press(modifierString);
        logger.info(`Pressed key combination: ${modifierString}`, 'BrowserSession');
      } else {
        await this.page.keyboard.press(key);
        logger.info(`Pressed key: ${key}`, 'BrowserSession');
      }

      // Wait for potential navigation after key press (e.g., Enter key)
      const navigationDetected = await this.waitForPotentialNavigation(currentUrl, currentDOMHash);

      if (navigationDetected) {
        logger.info('🔄 Navigation detected after key press, page state may have changed', 'BrowserSession');
      }

      return navigationDetected;
    } catch (error) {
      logger.error(`Failed to press key`, error as Error, 'BrowserSession');
      throw error;
    }
  }

  /**
   * 执行强健的按键操作 - 使用Playwright最佳实践
   */
  private async performRobustKeyPress(key: string, modifiers?: string[], options: {
    waitForNavigation?: boolean;
    expectFormSubmit?: boolean;
    targetElement?: any;
    retryCount?: number;
  } = {}): Promise<boolean> {
    logger.info(`⌨️ 执行强健按键操作: ${key}`, 'BrowserSession');

    try {
      // Store current state to detect navigation
      const currentUrl = this.page.url();
      const currentDOMHash = await this.getDOMStructureHash();

      // 如果指定了目标元素，先聚焦到该元素
      if (options.targetElement) {
        await options.targetElement.focus();
        await this.page.waitForTimeout(100); // 等待聚焦完成
      }

      // 构建按键组合
      let keyCombo = key;
      if (modifiers && modifiers.length > 0) {
        keyCombo = modifiers.join('+') + '+' + key;
      }

      // 执行按键操作
      if (options.targetElement) {
        // 在特定元素上按键
        await options.targetElement.press(keyCombo);
      } else {
        // 在页面级别按键
        await this.page.keyboard.press(keyCombo);
      }

      logger.info(`✅ 按键操作成功: ${keyCombo}`, 'BrowserSession');

      // 等待潜在的导航或页面变化
      let navigationDetected = false;

      if (options.waitForNavigation || options.expectFormSubmit || key === 'Enter') {
        // 对于可能触发导航的按键，等待更长时间
        await this.page.waitForTimeout(500);
        navigationDetected = await this.waitForPotentialNavigation(currentUrl, currentDOMHash);
      } else {
        // 对于普通按键，等待较短时间
        await this.page.waitForTimeout(100);
        navigationDetected = await this.waitForPotentialNavigation(currentUrl, currentDOMHash);
      }

      if (navigationDetected) {
        logger.info('🔄 Navigation detected after key press, page state may have changed', 'BrowserSession');
      }

      return navigationDetected;

    } catch (error) {
      logger.error(`❌ 强健按键操作失败: ${key}`, error as Error, 'BrowserSession');

      // 尝试重试
      const retryCount = options.retryCount || 1;
      if (retryCount > 0) {
        logger.info(`🔄 重试按键操作: ${key}, 剩余重试次数: ${retryCount}`, 'BrowserSession');
        await this.page.waitForTimeout(200);
        return await this.performRobustKeyPress(key, modifiers, { ...options, retryCount: retryCount - 1 });
      }

      throw error;
    }
  }

  async selectOption(index: number, value: string | string[], xpath?: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser session not started');
    }

    try {
      if (xpath) {
        const element = this.page.locator(`xpath=${xpath}`);
        await element.selectOption(value);
        logger.info(`Selected option in element with xpath: ${xpath}`, 'BrowserSession');
      } else {
        const elements = await this.page.locator('[data-browser-use-index]').all();
        if (index >= 0 && index < elements.length) {
          await elements[index].selectOption(value);
          logger.info(`Selected option in element at index: ${index}`, 'BrowserSession');
        } else {
          throw new Error(`Element index ${index} out of range`);
        }
      }
      await this.page.waitForTimeout(500);
    } catch (error) {
      logger.error(`Failed to select option`, error as Error, 'BrowserSession');
      throw error;
    }
  }

  async uploadFile(index: number, filePath: string, xpath?: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser session not started');
    }

    try {
      if (xpath) {
        const element = this.page.locator(`xpath=${xpath}`);
        await element.setInputFiles(filePath);
        logger.info(`Uploaded file to element with xpath: ${xpath}`, 'BrowserSession');
      } else {
        const elements = await this.page.locator('[data-browser-use-index]').all();
        if (index >= 0 && index < elements.length) {
          await elements[index].setInputFiles(filePath);
          logger.info(`Uploaded file to element at index: ${index}`, 'BrowserSession');
        } else {
          throw new Error(`Element index ${index} out of range`);
        }
      }
      await this.page.waitForTimeout(1000);
    } catch (error) {
      logger.error(`Failed to upload file`, error as Error, 'BrowserSession');
      throw error;
    }
  }

  async executeScript(script: string, args?: any[]): Promise<any> {
    if (!this.page) {
      throw new Error('Browser session not started');
    }

    try {
      const result = await this.page.evaluate(script, args);
      logger.info(`Executed script successfully`, 'BrowserSession');
      return result;
    } catch (error) {
      logger.error(`Failed to execute script`, error as Error, 'BrowserSession');
      throw error;
    }
  }

  async newTab(url?: string): Promise<number> {
    if (!this.context) {
      throw new Error('Browser session not started');
    }

    try {
      const newPage = await this.context.newPage();
      this.tabs.push(newPage);
      const tabIndex = this.tabs.length - 1;

      if (url) {
        await newPage.goto(url, { waitUntil: 'domcontentloaded' });
      }

      logger.info(`Created new tab (index: ${tabIndex})${url ? ` and navigated to ${url}` : ''}`, 'BrowserSession');
      return tabIndex;
    } catch (error) {
      logger.error(`Failed to create new tab`, error as Error, 'BrowserSession');
      throw error;
    }
  }

  async switchTab(tabIndex: number): Promise<void> {
    if (tabIndex < 0 || tabIndex >= this.tabs.length) {
      throw new Error(`Tab index ${tabIndex} out of range`);
    }

    try {
      this.currentTabIndex = tabIndex;
      this.page = this.tabs[tabIndex];

      if (this.domService) {
        this.domService = new DOMService(this.page);
      }

      await this.page.bringToFront();
      logger.info(`Switched to tab ${tabIndex}`, 'BrowserSession');
    } catch (error) {
      logger.error(`Failed to switch tab`, error as Error, 'BrowserSession');
      throw error;
    }
  }

  async closeTab(tabIndex?: number): Promise<void> {
    const indexToClose = tabIndex ?? this.currentTabIndex;

    if (indexToClose < 0 || indexToClose >= this.tabs.length) {
      throw new Error(`Tab index ${indexToClose} out of range`);
    }

    if (this.tabs.length === 1) {
      throw new Error('Cannot close the last tab');
    }

    try {
      await this.tabs[indexToClose].close();
      this.tabs.splice(indexToClose, 1);

      // Adjust current tab index if necessary
      if (this.currentTabIndex >= indexToClose && this.currentTabIndex > 0) {
        this.currentTabIndex--;
      }

      // Switch to the current tab
      this.page = this.tabs[this.currentTabIndex];
      if (this.domService) {
        this.domService = new DOMService(this.page);
      }

      logger.info(`Closed tab ${indexToClose}`, 'BrowserSession');
    } catch (error) {
      logger.error(`Failed to close tab`, error as Error, 'BrowserSession');
      throw error;
    }
  }

  async goBack(): Promise<void> {
    if (!this.page) {
      throw new Error('Browser session not started');
    }

    try {
      await this.page.goBack({ waitUntil: 'domcontentloaded' });
      logger.info('Navigated back', 'BrowserSession');
      await this.page.waitForTimeout(1000);
    } catch (error) {
      logger.error('Failed to go back', error as Error, 'BrowserSession');
      throw error;
    }
  }

  async goForward(): Promise<void> {
    if (!this.page) {
      throw new Error('Browser session not started');
    }

    try {
      await this.page.goForward({ waitUntil: 'domcontentloaded' });
      logger.info('Navigated forward', 'BrowserSession');
      await this.page.waitForTimeout(1000);
    } catch (error) {
      logger.error('Failed to go forward', error as Error, 'BrowserSession');
      throw error;
    }
  }

  async refresh(): Promise<void> {
    if (!this.page) {
      throw new Error('Browser session not started');
    }

    try {
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      logger.info('Page refreshed', 'BrowserSession');
      await this.page.waitForTimeout(1000);
    } catch (error) {
      logger.error('Failed to refresh page', error as Error, 'BrowserSession');
      throw error;
    }
  }

  async setCookie(name: string, value: string, options?: {
    domain?: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }): Promise<void> {
    if (!this.context) {
      throw new Error('Browser session not started');
    }

    try {
      const cookieData: any = {
        name,
        value,
        domain: options?.domain || new URL(this.getCurrentUrl()).hostname,
        path: options?.path || '/',
      };

      if (options?.expires !== undefined) cookieData.expires = options.expires;
      if (options?.httpOnly !== undefined) cookieData.httpOnly = options.httpOnly;
      if (options?.secure !== undefined) cookieData.secure = options.secure;
      if (options?.sameSite) cookieData.sameSite = options.sameSite;

      await this.context.addCookies([cookieData]);
      logger.info(`Set cookie: ${name}`, 'BrowserSession');
    } catch (error) {
      logger.error('Failed to set cookie', error as Error, 'BrowserSession');
      throw error;
    }
  }

  async getCookies(): Promise<any[]> {
    if (!this.context) {
      throw new Error('Browser session not started');
    }

    try {
      return await this.context.cookies();
    } catch (error) {
      logger.error('Failed to get cookies', error as Error, 'BrowserSession');
      throw error;
    }
  }

  async waitForElement(selector: string, timeout: number = 30000, state: 'visible' | 'hidden' | 'attached' | 'detached' = 'visible'): Promise<void> {
    if (!this.page) {
      throw new Error('Browser session not started');
    }

    try {
      await this.page.waitForSelector(selector, { timeout, state });
      logger.info(`Element found: ${selector}`, 'BrowserSession');
    } catch (error) {
      logger.error(`Failed to wait for element: ${selector}`, error as Error, 'BrowserSession');
      throw error;
    }
  }

  async waitForNavigation(timeout: number = 30000, waitUntil: 'load' | 'domcontentloaded' | 'networkidle' = 'domcontentloaded'): Promise<void> {
    if (!this.page) {
      throw new Error('Browser session not started');
    }

    try {
      await this.page.waitForLoadState(waitUntil, { timeout });
      logger.info('Navigation completed', 'BrowserSession');
    } catch (error) {
      logger.error('Failed to wait for navigation', error as Error, 'BrowserSession');
      throw error;
    }
  }

  async extractData(selector?: string, xpath?: string, attribute?: string, multiple: boolean = false): Promise<string | string[]> {
    if (!this.page) {
      throw new Error('Browser session not started');
    }

    try {
      let locator: any;
      if (xpath) {
        locator = this.page.locator(`xpath=${xpath}`);
      } else if (selector) {
        locator = this.page.locator(selector);
      } else {
        throw new Error('Either selector or xpath must be provided');
      }

      if (multiple) {
        const elements = await locator.all();
        const results: string[] = [];

        for (const element of elements) {
          if (attribute) {
            const value = await element.getAttribute(attribute);
            results.push(value || '');
          } else {
            const text = await element.textContent();
            results.push(text || '');
          }
        }

        logger.info(`Extracted ${results.length} values`, 'BrowserSession');
        return results;
      } else {
        let result: string;
        if (attribute) {
          result = await locator.getAttribute(attribute) || '';
        } else {
          result = await locator.textContent() || '';
        }

        logger.info(`Extracted data: ${result.substring(0, 50)}...`, 'BrowserSession');
        return result;
      }
    } catch (error) {
      logger.error('Failed to extract data', error as Error, 'BrowserSession');
      throw error;
    }
  }

  getTabCount(): number {
    return this.tabs.length;
  }

  getCurrentTabIndex(): number {
    return this.currentTabIndex;
  }

  private setupEventListeners(): void {
    if (!this.page) return;

    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        logger.debug(`Browser console error: ${msg.text()}`, 'BrowserSession');
      }
    });

    this.page.on('pageerror', error => {
      logger.debug(`Page error: ${error.message}`, 'BrowserSession');
    });

    this.page.on('requestfailed', request => {
      logger.debug(`Request failed: ${request.url()}`, 'BrowserSession');
    });
  }

  private async waitForPotentialNavigation(previousUrl: string, previousDOMHash?: string, timeout: number = 10000): Promise<boolean> {
    if (!this.page) return false;

    try {
      logger.info(`Checking for navigation from: ${previousUrl}`, 'BrowserSession');

      // Wait a short time to see if navigation starts
      await this.page.waitForTimeout(100);

      const currentUrl = this.page.url();
      logger.info(`Current URL after action: ${currentUrl}`, 'BrowserSession');

      // Check for URL change (traditional navigation)
      if (currentUrl !== previousUrl) {
        logger.info(`🔄 URL Navigation detected: ${previousUrl} → ${currentUrl}`, 'BrowserSession');

        try {
          // Wait for page to load completely
          await this.page.waitForLoadState('domcontentloaded', { timeout });
          logger.info('✅ URL Navigation completed successfully', 'BrowserSession');
          return true;
        } catch (error) {
          logger.warn(`⚠️ Navigation timeout or failed, continuing anyway: ${error}`, 'BrowserSession');
          return true; // Still consider it navigation even if timeout
        }
      }

      // Check for DOM structure change (SPA navigation)
      if (previousDOMHash) {
        try {
          // Wait a bit more for SPA content to load
          await this.page.waitForTimeout(1000);

          // Get current DOM hash to compare
          const currentDOMHash = await this.getDOMStructureHash();

          if (currentDOMHash !== previousDOMHash) {
            logger.info(`🔄 SPA Navigation detected: DOM structure changed`, 'BrowserSession');
            logger.info(`Previous DOM hash: ${previousDOMHash.substring(0, 10)}...`, 'BrowserSession');
            logger.info(`Current DOM hash: ${currentDOMHash.substring(0, 10)}...`, 'BrowserSession');

            // CRITICAL: Wait longer for SPA content to fully load
            logger.info('⏳ Waiting for SPA content to fully load...', 'BrowserSession');
            await this.page.waitForTimeout(2000);

            // Also wait for any network requests to complete
            try {
              await this.page.waitForLoadState('networkidle', { timeout: 5000 });
              logger.info('✅ Network idle achieved after SPA navigation', 'BrowserSession');
            } catch (networkError) {
              logger.warn(`⚠️ Network idle timeout, continuing anyway: ${networkError}`, 'BrowserSession');
            }

            return true;
          }
        } catch (error) {
          logger.warn(`Error checking DOM structure change: ${error}`, 'BrowserSession');
        }
      }

      logger.info('ℹ️ No navigation detected, waiting for dynamic content...', 'BrowserSession');
      // No navigation detected, just wait a bit for any dynamic content
      await this.page.waitForTimeout(500);
      return false;

    } catch (error) {
      logger.warn(`Error during navigation wait: ${error}`, 'BrowserSession');
      // Continue anyway, don't fail the entire action
      return false;
    }
  }

  /**
   * Get a hash of the current DOM structure to detect SPA navigation
   */
  private async getDOMStructureHash(): Promise<string> {
    try {
      const domStructure = await this.page.evaluate(() => {
        // Get a simplified representation of the DOM structure
        const getElementSignature = (element: Element): string => {
          const tag = element.tagName.toLowerCase();
          const id = element.id ? `#${element.id}` : '';
          const classes = element.className ? `.${element.className.split(' ').join('.')}` : '';
          const text = element.textContent?.trim().substring(0, 50) || '';
          return `${tag}${id}${classes}:${text}`;
        };

        // Get signatures of key elements that change during navigation
        const keyElements = document.querySelectorAll('main, [role="main"], .content, #content, .page, .container');
        const signatures = Array.from(keyElements).map(getElementSignature);

        // Also include page title and some meta info
        const title = document.title;
        const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

        return {
          title,
          metaDescription,
          keyElementSignatures: signatures,
          elementCount: document.querySelectorAll('*').length
        };
      });

      // Create a hash from the DOM structure
      const structureString = JSON.stringify(domStructure);
      return this.simpleHash(structureString);
    } catch (error) {
      logger.warn(`Error getting DOM structure hash: ${error}`, 'BrowserSession');
      return '';
    }
  }

  /**
   * Simple hash function for strings
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  /**
   * 🧠 获取所有标签页信息供AI决策使用
   */
  getAllTabsInfo(): any[] {
    if (this.masterController) {
      return this.masterController.getAllTabsInfo();
    }
    return [];
  }

  /**
   * 🧠 AI智能切换标签页
   */
  async aiSwitchTab(targetTabId: string): Promise<any> {
    if (this.masterController) {
      return await this.masterController.aiSwitchTab(targetTabId);
    }
    return null;
  }


}
