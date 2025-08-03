import { config } from 'dotenv';
import { LLMConfig, BrowserProfile, AgentSettings } from '../types';

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
   * 获取AI模型配置
   * 会自动检测可用的API密钥并选择对应的模型
   */
  static getLLMConfig(): LLMConfig {
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const googleKey = process.env.GOOGLE_API_KEY;

    // 优先使用OpenAI，因为它通常效果最好
    if (openaiKey) {
      return {
        provider: 'openai',
        model: process.env.OPENAI_MODEL || 'gpt-4o',  // 默认使用最新的GPT-4o
        apiKey: openaiKey,
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        temperature: parseFloat(process.env.LLM_TEMPERATURE || '0'),  // 0表示更确定性的输出
        maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4000'),    // 足够的token数量
      };
    } else if (anthropicKey) {
      return {
        provider: 'anthropic',
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4',  // 最新的Claude模型
        apiKey: anthropicKey,
        temperature: parseFloat(process.env.LLM_TEMPERATURE || '0'),
        maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4000'),
      };
    } else if (googleKey) {
      return {
        provider: 'google',
        model: process.env.GOOGLE_MODEL || 'gemini-2.5-flash',  // 快速响应的Gemini模型
        apiKey: googleKey,
        baseURL: process.env.GOOGLE_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/',
        temperature: parseFloat(process.env.LLM_TEMPERATURE || '0'),
        maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4000'),
      };
    }

    // 如果没有找到任何API密钥，抛出友好的错误信息
    throw new Error(
      '未找到AI模型API密钥。请在.env文件中设置 OPENAI_API_KEY、ANTHROPIC_API_KEY 或 GOOGLE_API_KEY'
    );
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
