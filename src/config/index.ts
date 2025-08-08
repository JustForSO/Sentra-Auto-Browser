import { config } from 'dotenv';
import { LLMConfig, BrowserProfile, AgentSettings, LLMEndpoint } from '../types';
import { createLLMConfigFromEnv, MultiProviderLLMManager } from '../llm/manager';
import { logger } from '../utils/logger';

// 加载环境变量配置
config();

/**
 * 配置管理器 - 系统配置的中央管理中心
 *
 * 这个类负责管理整个系统的配置，包括：
 * - AI模型配置（OpenAI、Google、Anthropic）
 * - 浏览器配置（启动参数、视窗大小等）
 * - 代理配置（行为参数、功能开关等）
 */
export class Config {

  /**
   * 🤖 获取多供应商AI模型配置
   * 支持多个API密钥、多个端点和智能选择策略
   */
  static getLLMConfig(): LLMConfig {
    try {
      // 使用新的多供应商配置系统
      const multiProviderConfig = createLLMConfigFromEnv();
      
      if (multiProviderConfig.endpoints.length > 0) {
        logger.info(`已加载 ${multiProviderConfig.endpoints.length} 个LLM端点，使用策略: ${multiProviderConfig.strategy}`, 'Config');
        return multiProviderConfig;
      }
      
      throw new Error('未找到任何LLM配置，请检查环境变量配置');
      
    } catch (error) {
      logger.error('加载LLM配置失败', error as Error, 'Config');
      throw error;
    }
  }



  // Browser Configuration
  static getBrowserProfile(): BrowserProfile {
    const executablePath = process.env.BROWSER_EXECUTABLE_PATH;

    // Validate custom browser path if provided
    if (executablePath) {
      const fs = require('fs');
      if (!fs.existsSync(executablePath)) {
        console.warn(`Warning: Custom browser path not found: ${executablePath}`);
        console.warn('Falling back to default Playwright browser...');
      }
    }

    return {
      headless: process.env.BROWSER_HEADLESS === 'true',
      viewport: {
        width: parseInt(process.env.BROWSER_VIEWPORT_WIDTH || process.env.BROWSER_WIDTH || '1920'),
        height: parseInt(process.env.BROWSER_VIEWPORT_HEIGHT || process.env.BROWSER_HEIGHT || '1080'),
      },
      userDataDir: process.env.BROWSER_USER_DATA_DIR,
      executablePath: executablePath && require('fs').existsSync(executablePath) ? executablePath : undefined,
      timeout: parseInt(process.env.BROWSER_TIMEOUT || '30000'),
      autoInstall: process.env.BROWSER_AUTO_INSTALL !== 'false',
      // 新增配置选项
      slowMo: parseInt(process.env.BROWSER_SLOW_MO || '0'),
      devtools: process.env.BROWSER_DEVTOOLS === 'true',
      args: process.env.BROWSER_ARGS?.split(',').map(arg => arg.trim()),
      userAgent: process.env.BROWSER_USER_AGENT,
      ignoreHTTPSErrors: process.env.BROWSER_IGNORE_HTTPS_ERRORS === 'true',
      locale: process.env.BROWSER_LOCALE,
      timezone: process.env.BROWSER_TIMEZONE,
      proxy: process.env.BROWSER_PROXY_SERVER ? {
        server: process.env.BROWSER_PROXY_SERVER,
        username: process.env.BROWSER_PROXY_USERNAME,
        password: process.env.BROWSER_PROXY_PASSWORD,
      } : undefined,
      geolocation: process.env.BROWSER_GEOLOCATION ? JSON.parse(process.env.BROWSER_GEOLOCATION) : undefined,
      permissions: process.env.BROWSER_PERMISSIONS?.split(',').map(p => p.trim()),
      extraHTTPHeaders: process.env.BROWSER_EXTRA_HEADERS ? JSON.parse(process.env.BROWSER_EXTRA_HEADERS) : undefined,
      colorScheme: process.env.BROWSER_COLOR_SCHEME as 'light' | 'dark' | 'no-preference' | undefined,
      reducedMotion: process.env.BROWSER_REDUCED_MOTION as 'reduce' | 'no-preference' | undefined,
      forcedColors: process.env.BROWSER_FORCED_COLORS as 'active' | 'none' | undefined,
      // 下载配置
      acceptDownloads: process.env.BROWSER_ACCEPT_DOWNLOADS !== 'false',
      downloadsPath: process.env.BROWSER_DOWNLOADS_PATH || this.getDefaultDownloadsPath(),
    };
  }

  /**
   * 🔧 获取默认下载路径
   */
  static getDefaultDownloadsPath(): string {
    const path = require('path');
    // 使用项目根目录下的downloads文件夹
    return path.join(process.cwd(), 'downloads');
  }

  /**
   * 🔧 获取浏览器连接配置
   */
  static getBrowserConnectionConfig() {
    return {
      connectToUserBrowser: process.env.BROWSER_CONNECT_TO_USER_BROWSER === 'true',
      connectionMode: process.env.BROWSER_CONNECTION_MODE || 'smart',
      debugPort: parseInt(process.env.BROWSER_DEBUG_PORT || '9222'),
      debugHost: process.env.BROWSER_DEBUG_HOST || 'localhost',
      stealthMode: process.env.BROWSER_STEALTH_MODE === 'true',
      autoClose: process.env.BROWSER_AUTO_CLOSE !== 'false',
      maximized: process.env.BROWSER_MAXIMIZED === 'true',
      fullscreen: process.env.BROWSER_FULLSCREEN === 'true',
      enableGpu: process.env.BROWSER_ENABLE_GPU !== 'false',
      customArgs: process.env.BROWSER_ARGS ? process.env.BROWSER_ARGS.split(',').map(arg => arg.trim()) : [],
      kioskMode: process.env.BROWSER_KIOSK_MODE === 'true',
      windowPosition: {
        x: parseInt(process.env.BROWSER_WINDOW_X || '0'),
        y: parseInt(process.env.BROWSER_WINDOW_Y || '0'),
      },
      windowSize: {
        width: parseInt(process.env.BROWSER_WINDOW_WIDTH || '1920'),
        height: parseInt(process.env.BROWSER_WINDOW_HEIGHT || '1080'),
      },
      deviceScaleFactor: parseFloat(process.env.BROWSER_DEVICE_SCALE_FACTOR || '1'),
      pageLoadTimeout: parseInt(process.env.BROWSER_PAGE_LOAD_TIMEOUT || '30000'),
      navigationTimeout: parseInt(process.env.BROWSER_NAVIGATION_TIMEOUT || '30000'),
    };
  }

  // Agent Configuration
  static getAgentSettings(): AgentSettings {
    return {
      maxSteps: parseInt(process.env.AGENT_MAX_STEPS || '50'),
      maxActionsPerStep: parseInt(process.env.AGENT_MAX_ACTIONS_PER_STEP || '3'),
      useVision: process.env.AGENT_USE_VISION !== 'false',
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0'),
      enablePlugins: process.env.ENABLE_PLUGINS !== 'false', // 默认启用插件系统
    };
  }

  // Logging Configuration
  static getLogLevel(): string {
    return process.env.LOG_LEVEL || 'info';
  }

  // Debug mode
  static isDebugMode(): boolean {
    return process.env.DEBUG === 'true';
  }
}

export default Config;
