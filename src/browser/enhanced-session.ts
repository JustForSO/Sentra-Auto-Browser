import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { BrowserProfile } from '../types';
import { logger } from '../utils/logger';
import { Config } from '../config';
import { SmartConnectionManager } from './smart-connection-manager';

/**
 * 🌟 增强浏览器会话管理器
 * 
 * 支持多种连接模式：
 * 1. connect - 连接现有浏览器实例（无自动化痕迹）
 * 2. persistent - 启动持久化浏览器（保持用户数据）
 * 3. launch - 启动新浏览器实例（隐私模式）
 * 4. auto_debug - 自动启动调试浏览器然后连接
 */
export class EnhancedBrowserSession {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private profile: BrowserProfile;
  private connectionMode: string;
  private debugProcess: any = null;
  private smartManager: SmartConnectionManager;
  private connectionStrategy: string = '';

  constructor(profile?: BrowserProfile) {
    this.profile = profile || Config.getBrowserProfile();
    this.connectionMode = process.env.BROWSER_CONNECTION_MODE || 'smart';
    this.smartManager = new SmartConnectionManager();
  }

  /**
   * 🚀 启动浏览器会话
   */
  async start(): Promise<void> {
    try {
      logger.info('🌟 启动增强浏览器会话...', 'EnhancedBrowserSession');

      const connectionConfig = Config.getBrowserConnectionConfig();
      logger.info(`🔧 连接模式: ${connectionConfig.connectToUserBrowser ? '用户浏览器' : 'Playwright'}`, 'EnhancedBrowserSession');

      if (connectionConfig.connectToUserBrowser) {
        // 连接用户自己的浏览器
        logger.info('🔗 连接用户浏览器（无自动化痕迹）...', 'EnhancedBrowserSession');
        const result = await this.smartManager.smartConnect();
        this.browser = result.browser;
        this.context = result.context;
        this.page = result.page;
        this.connectionStrategy = result.strategy;

        logger.info(`🧠 智能连接策略: ${this.connectionStrategy}`, 'EnhancedBrowserSession');
      } else {
        // 使用Playwright标准方式
        logger.info('🚀 使用Playwright启动浏览器...', 'EnhancedBrowserSession');

        switch (this.connectionMode) {
          case 'connect':
            await this.connectToExistingBrowser();
            break;
          case 'persistent':
            await this.startPersistentBrowser();
            break;
          case 'launch':
            await this.launchNewBrowser();
            break;
          case 'auto_debug':
            await this.autoDebugMode();
            break;
          default:
            logger.info(`🚀 使用默认启动模式: launch`, 'EnhancedBrowserSession');
            await this.launchNewBrowser();
        }

        // 创建页面（如果需要）
        if (!this.page) {
          this.page = await this.context!.newPage();
        }
      }

      // 配置页面
      await this.configurePage();

      // 应用反检测措施（按需启用）
      if (connectionConfig.stealthMode) {
        await this.applyStealthMode();
        logger.info('🥷 已启用反检测模式', 'EnhancedBrowserSession');
      } else {
        logger.info('🔓 反检测模式已关闭（默认）', 'EnhancedBrowserSession');
      }

      logger.success('✅ 增强浏览器会话启动成功', 'EnhancedBrowserSession');
    } catch (error) {
      logger.error('❌ 增强浏览器会话启动失败', error as Error, 'EnhancedBrowserSession');
      throw error;
    }
  }

  /**
   * 🔗 连接到现有浏览器实例
   */
  private async connectToExistingBrowser(): Promise<void> {
    const debugPort = process.env.BROWSER_DEBUG_PORT || '9222';
    const debugHost = process.env.BROWSER_DEBUG_HOST || 'localhost';
    const wsEndpoint = `ws://${debugHost}:${debugPort}`;

    logger.info(`🔗 连接到现有浏览器: ${wsEndpoint}`, 'EnhancedBrowserSession');

    try {
      // 检查调试端口是否可用
      await this.checkDebugPort(debugHost, parseInt(debugPort));

      // 连接到浏览器
      this.browser = await chromium.connectOverCDP(wsEndpoint);
      
      // 获取现有上下文或创建新上下文
      const contexts = this.browser.contexts();
      if (contexts.length > 0) {
        this.context = contexts[0];
        logger.info('📋 使用现有浏览器上下文', 'EnhancedBrowserSession');
      } else {
        this.context = await this.browser.newContext(this.getContextOptions());
        logger.info('🆕 创建新浏览器上下文', 'EnhancedBrowserSession');
      }

      // 获取现有页面或创建新页面
      const pages = this.context.pages();
      if (pages.length > 0) {
        this.page = pages[0];
        logger.info('📄 使用现有页面', 'EnhancedBrowserSession');
      }

      logger.success('✅ 成功连接到现有浏览器', 'EnhancedBrowserSession');
    } catch (error: any) {
      logger.error('❌ 连接现有浏览器失败', error, 'EnhancedBrowserSession');
      
      // 提供帮助信息
      logger.info('💡 请先手动启动调试模式浏览器：', 'EnhancedBrowserSession');
      logger.info(`   Edge: "${this.profile.executablePath}" --remote-debugging-port=${debugPort} --user-data-dir="${this.profile.userDataDir}"`, 'EnhancedBrowserSession');
      logger.info(`   Chrome: "chrome.exe" --remote-debugging-port=${debugPort} --user-data-dir="${this.profile.userDataDir}"`, 'EnhancedBrowserSession');
      
      throw new Error(`无法连接到浏览器调试端口 ${wsEndpoint}。请确保浏览器已启动调试模式。`);
    }
  }

  /**
   * 🏠 启动持久化浏览器
   */
  private async startPersistentBrowser(): Promise<void> {
    if (!this.profile.userDataDir) {
      throw new Error('持久化模式需要设置 userDataDir');
    }

    logger.info(`🏠 启动持久化浏览器: ${this.profile.userDataDir}`, 'EnhancedBrowserSession');

    // 确保用户数据目录存在
    await this.ensureUserDataDir();

    const launchOptions = {
      ...this.getLaunchOptions(),
      userDataDir: this.profile.userDataDir,
      ...this.getContextOptions()
    };

    try {
      this.context = await chromium.launchPersistentContext(
        this.profile.userDataDir,
        launchOptions
      );
      
      this.browser = this.context.browser();
      logger.success('✅ 持久化浏览器启动成功', 'EnhancedBrowserSession');
    } catch (error: any) {
      if (error.message.includes("Executable doesn't exist") && this.profile.autoInstall !== false) {
        await this.installBrowser();
        // 重试，但不使用自定义可执行路径
        const retryOptions = { ...launchOptions };
        delete retryOptions.executablePath;
        this.context = await chromium.launchPersistentContext(
          this.profile.userDataDir,
          retryOptions
        );
        this.browser = this.context.browser();
      } else {
        throw error;
      }
    }
  }

  /**
   * 🚀 启动新浏览器实例
   */
  private async launchNewBrowser(): Promise<void> {
    logger.info('🚀 启动新浏览器实例', 'EnhancedBrowserSession');

    try {
      this.browser = await chromium.launch(this.getLaunchOptions());
      this.context = await this.browser.newContext(this.getContextOptions());
      logger.success('✅ 新浏览器实例启动成功', 'EnhancedBrowserSession');
    } catch (error: any) {
      if (error.message.includes("Executable doesn't exist") && this.profile.autoInstall !== false) {
        await this.installBrowser();
        // 重试，但不使用自定义可执行路径
        const retryOptions = this.getLaunchOptions();
        delete retryOptions.executablePath;
        this.browser = await chromium.launch(retryOptions);
        this.context = await this.browser.newContext(this.getContextOptions());
      } else {
        throw error;
      }
    }
  }

  /**
   * 🔧 自动调试模式
   */
  private async autoDebugMode(): Promise<void> {
    logger.info('🔧 启动自动调试模式', 'EnhancedBrowserSession');

    const debugPort = process.env.BROWSER_DEBUG_PORT || '9222';
    
    try {
      // 先尝试连接现有实例
      await this.connectToExistingBrowser();
    } catch (error) {
      // 如果连接失败，启动调试浏览器
      logger.info('🚀 启动调试浏览器实例', 'EnhancedBrowserSession');
      await this.startDebugBrowser(debugPort);
      
      // 等待浏览器启动
      await this.sleep(3000);
      
      // 重新尝试连接
      await this.connectToExistingBrowser();
    }
  }

  /**
   * 🛠️ 启动调试浏览器
   */
  private async startDebugBrowser(debugPort: string): Promise<void> {
    const { spawn } = require('child_process');
    
    const args = [
      `--remote-debugging-port=${debugPort}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ];

    if (this.profile.userDataDir) {
      args.push(`--user-data-dir=${this.profile.userDataDir}`);
    }

    // 添加反检测参数
    if (process.env.BROWSER_STEALTH_MODE === 'true') {
      args.push(
        '--disable-blink-features=AutomationControlled',
        '--exclude-switches=enable-automation',
        '--disable-extensions-except',
        '--disable-plugins-discovery'
      );
    }

    logger.info(`🚀 启动调试浏览器: ${this.profile.executablePath} ${args.join(' ')}`, 'EnhancedBrowserSession');

    this.debugProcess = spawn(this.profile.executablePath!, args, {
      detached: true,
      stdio: 'ignore'
    });

    this.debugProcess.unref();
  }

  /**
   * 📄 配置页面
   */
  private async configurePage(): Promise<void> {
    if (!this.page) return;

    // 设置视口
    const viewport = this.getViewportConfig();
    await this.page.setViewportSize(viewport);

    // 设置超时
    this.page.setDefaultTimeout(parseInt(process.env.BROWSER_PAGE_LOAD_TIMEOUT || '30000'));
    this.page.setDefaultNavigationTimeout(parseInt(process.env.BROWSER_NAVIGATION_TIMEOUT || '30000'));

    logger.info(`📄 页面配置完成: ${viewport.width}x${viewport.height}`, 'EnhancedBrowserSession');
  }

  /**
   * 🥷 应用反检测措施
   */
  private async applyStealthMode(): Promise<void> {
    if (process.env.BROWSER_STEALTH_MODE !== 'true' || !this.page) return;

    logger.info('🥷 应用反检测措施', 'EnhancedBrowserSession');

    await this.page.addInitScript(() => {
      // 移除 webdriver 属性
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // 修改 plugins 长度
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // 修改 languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['zh-CN', 'zh', 'en'],
      });

      // 移除自动化控制标识
      delete (window as any).chrome.runtime.onConnect;
    });
  }

  /**
   * 🔍 检查调试端口是否可用
   */
  private async checkDebugPort(host: string, port: number): Promise<void> {
    const net = require('net');

    return new Promise((resolve, reject) => {
      const socket = new net.Socket();

      socket.setTimeout(3000);

      socket.on('connect', () => {
        socket.destroy();
        resolve();
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error(`调试端口 ${host}:${port} 连接超时`));
      });

      socket.on('error', (error: any) => {
        socket.destroy();
        reject(new Error(`调试端口 ${host}:${port} 不可用: ${error.message}`));
      });

      socket.connect(port, host);
    });
  }

  /**
   * 📁 确保用户数据目录存在
   */
  private async ensureUserDataDir(): Promise<void> {
    if (!this.profile.userDataDir) return;

    const fs = require('fs');
    const path = require('path');

    try {
      if (!fs.existsSync(this.profile.userDataDir)) {
        fs.mkdirSync(this.profile.userDataDir, { recursive: true });
        logger.info(`📁 创建用户数据目录: ${this.profile.userDataDir}`, 'EnhancedBrowserSession');
      }
    } catch (error: any) {
      logger.warn(`⚠️ 无法创建用户数据目录: ${error.message}`, 'EnhancedBrowserSession');
    }
  }

  /**
   * 📦 安装浏览器
   */
  private async installBrowser(): Promise<void> {
    logger.info('📦 自动安装浏览器...', 'EnhancedBrowserSession');

    const { execSync } = require('child_process');
    execSync('npx playwright install chromium', { stdio: 'inherit' });

    logger.success('✅ 浏览器安装完成', 'EnhancedBrowserSession');
  }

  /**
   * 🚀 获取启动选项
   */
  private getLaunchOptions(): any {
    const options: any = {
      headless: this.profile.headless,
      timeout: this.profile.timeout,
      slowMo: this.profile.slowMo,
      devtools: this.profile.devtools
    };

    // 可执行文件路径
    if (this.profile.executablePath) {
      options.executablePath = this.profile.executablePath;
    }

    // 启动参数
    const args = this.getBrowserArgs();
    if (args.length > 0) {
      options.args = args;
    }

    return options;
  }

  /**
   * 🌐 获取上下文选项
   */
  private getContextOptions(): any {
    const options: any = {
      viewport: this.getViewportConfig(),
      userAgent: this.profile.userAgent || process.env.BROWSER_USER_AGENT,
      ignoreHTTPSErrors: this.profile.ignoreHTTPSErrors,
      locale: this.profile.locale || process.env.BROWSER_LOCALE,
      timezoneId: this.profile.timezone || process.env.BROWSER_TIMEZONE
    };

    // 代理设置
    if (this.profile.proxy) {
      options.proxy = this.profile.proxy;
    }

    // 其他设置
    if (this.profile.geolocation) options.geolocation = this.profile.geolocation;
    if (this.profile.permissions) options.permissions = this.profile.permissions;
    if (this.profile.extraHTTPHeaders) options.extraHTTPHeaders = this.profile.extraHTTPHeaders;
    if (this.profile.colorScheme) options.colorScheme = this.profile.colorScheme;
    if (this.profile.reducedMotion) options.reducedMotion = this.profile.reducedMotion;
    if (this.profile.forcedColors) options.forcedColors = this.profile.forcedColors;

    return options;
  }

  /**
   * 📐 获取视口配置
   */
  private getViewportConfig(): { width: number; height: number } {
    return {
      width: parseInt(process.env.BROWSER_WIDTH || this.profile.viewport?.width?.toString() || '1920'),
      height: parseInt(process.env.BROWSER_HEIGHT || this.profile.viewport?.height?.toString() || '1080')
    };
  }

  /**
   * 🔧 获取浏览器启动参数
   */
  private getBrowserArgs(): string[] {
    const args: string[] = [];

    // 基础参数
    if (this.profile.args) {
      args.push(...this.profile.args);
    }

    // 环境变量参数
    const envArgs = process.env.BROWSER_ARGS;
    if (envArgs) {
      args.push(...envArgs.split(',').map(arg => arg.trim()));
    }

    // 反检测参数
    if (process.env.BROWSER_STEALTH_MODE === 'true') {
      args.push(
        '--disable-blink-features=AutomationControlled',
        '--exclude-switches=enable-automation',
        '--disable-extensions-except',
        '--disable-plugins-discovery',
        '--no-first-run',
        '--no-service-autorun',
        '--password-store=basic'
      );
    }

    // 窗口配置
    if (process.env.BROWSER_FULLSCREEN === 'true') {
      args.push('--start-fullscreen');
    } else if (process.env.BROWSER_MAXIMIZED === 'true') {
      args.push('--start-maximized');
    } else if (process.env.BROWSER_KIOSK_MODE === 'true') {
      args.push('--kiosk');
    }

    // 窗口位置和大小
    const windowX = process.env.BROWSER_WINDOW_X;
    const windowY = process.env.BROWSER_WINDOW_Y;
    const windowWidth = process.env.BROWSER_WINDOW_WIDTH;
    const windowHeight = process.env.BROWSER_WINDOW_HEIGHT;

    if (windowX && windowY && windowWidth && windowHeight) {
      args.push(`--window-position=${windowX},${windowY}`);
      args.push(`--window-size=${windowWidth},${windowHeight}`);
    }

    return args;
  }

  /**
   * 💤 睡眠函数
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 🔄 导航到URL
   */
  async navigate(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('浏览器会话未启动');
    }

    logger.info(`🔄 导航到: ${url}`, 'EnhancedBrowserSession');
    await this.page.goto(url);
    logger.success(`✅ 成功导航到: ${url}`, 'EnhancedBrowserSession');
  }

  /**
   * 📄 获取当前页面
   */
  getCurrentPage(): Page | null {
    return this.page;
  }

  /**
   * 🌐 获取浏览器上下文
   */
  getContext(): BrowserContext | null {
    return this.context;
  }

  /**
   * 🖥️ 获取浏览器实例
   */
  getBrowser(): Browser | null {
    return this.browser;
  }

  /**
   * ✅ 检查是否已启动
   */
  isStarted(): boolean {
    return this.context !== null && this.page !== null;
  }

  /**
   * 🔒 关闭浏览器会话
   */
  async close(): Promise<void> {
    try {
      logger.info('🔒 关闭增强浏览器会话...', 'EnhancedBrowserSession');

      const connectionConfig = Config.getBrowserConnectionConfig();

      // 根据连接方式决定是否关闭浏览器
      const shouldCloseBrowser = connectionConfig.autoClose &&
                                 !connectionConfig.connectToUserBrowser;

      if (shouldCloseBrowser) {
        if (this.browser) {
          await this.browser.close();
          logger.info('🔒 浏览器已关闭', 'EnhancedBrowserSession');
        }
      } else {
        const reason = connectionConfig.connectToUserBrowser ? '连接用户浏览器' : '配置要求保持运行';
        logger.info(`🔗 保持浏览器运行（${reason}）`, 'EnhancedBrowserSession');
      }

      // 清理调试进程
      if (this.debugProcess) {
        this.debugProcess.kill();
        this.debugProcess = null;
      }

      this.browser = null;
      this.context = null;
      this.page = null;

      logger.success('✅ 增强浏览器会话已关闭', 'EnhancedBrowserSession');
    } catch (error) {
      logger.error('❌ 关闭浏览器会话失败', error as Error, 'EnhancedBrowserSession');
    }
  }

  /**
   * 📊 获取连接信息
   */
  getConnectionInfo(): {
    mode: string;
    strategy: string;
    isConnected: boolean;
    browserType: string;
  } {
    return {
      mode: this.connectionMode,
      strategy: this.connectionStrategy,
      isConnected: this.isStarted(),
      browserType: this.profile.executablePath?.includes('edge') ? 'edge' : 'chrome'
    };
  }
}
