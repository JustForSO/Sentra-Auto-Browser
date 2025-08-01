import { execSync, spawn } from 'child_process';
import { logger } from '../utils/logger';
import { Config } from '../config';
import * as net from 'net';

/**
 * 🔧 浏览器进程管理器
 * 
 * 1. 检测正在运行的调试实例，如果有就直接连接
 * 2. 如果有非调试实例，先关闭它们
 * 3. 启动新的调试实例
 */
export class BrowserProcessManager {
  private debugPort: number;
  private debugHost: string;
  private browserPath: string;
  private userDataDir?: string;

  constructor() {
    const config = Config.getBrowserConnectionConfig();
    const profile = Config.getBrowserProfile();
    
    this.debugPort = config.debugPort || 9222;
    this.debugHost = config.debugHost || 'localhost';
    this.browserPath = profile.executablePath || this.getDefaultBrowserPath();
    this.userDataDir = profile.userDataDir;
  }

  /**
   * 🔍 检测并准备浏览器连接
   */
  async prepareConnection(): Promise<{
    canConnect: boolean;
    debugUrl: string;
    action: 'connect' | 'start_debug' | 'kill_and_start';
    message: string;
  }> {
    logger.info('🔍 检测浏览器连接状态...', 'BrowserProcessManager');

    // 1. 检查调试端口是否可连接
    const debugAvailable = await this.checkDebugPortAvailable();
    if (debugAvailable) {
      logger.success('✅ 发现可连接的调试实例', 'BrowserProcessManager');
      return {
        canConnect: true,
        debugUrl: `http://${this.debugHost}:${this.debugPort}`,
        action: 'connect',
        message: '发现现有调试实例，直接连接'
      };
    }

    // 2. 检测正在运行的浏览器实例
    const runningInstances = this.detectRunningBrowserInstances();
    logger.info(`🔍 检测到 ${runningInstances.length} 个浏览器实例`, 'BrowserProcessManager');

    if (runningInstances.length === 0) {
      // 没有运行实例，可以直接启动调试实例
      return {
        canConnect: false,
        debugUrl: `http://${this.debugHost}:${this.debugPort}`,
        action: 'start_debug',
        message: '没有运行实例，启动新的调试实例'
      };
    } else {
      // 有运行实例但不是调试模式，需要先关闭
      return {
        canConnect: false,
        debugUrl: `http://${this.debugHost}:${this.debugPort}`,
        action: 'kill_and_start',
        message: `发现 ${runningInstances.length} 个非调试实例，需要先关闭它们`
      };
    }
  }

  /**
   * 🚀 执行连接准备操作
   */
  async executeConnectionPreparation(): Promise<boolean> {
    const preparation = await this.prepareConnection();
    
    logger.info(`📋 执行操作: ${preparation.action}`, 'BrowserProcessManager');
    logger.info(`📝 说明: ${preparation.message}`, 'BrowserProcessManager');

    switch (preparation.action) {
      case 'connect':
        // 直接连接，无需额外操作
        return true;

      case 'start_debug':
        // 启动调试实例
        return await this.startDebugBrowser();

      case 'kill_and_start':
        // 先关闭现有实例，再启动调试实例
        const killed = await this.killExistingBrowserInstances();
        if (killed) {
          // 等待进程完全关闭
          await this.sleep(2000);
          return await this.startDebugBrowser();
        }
        return false;

      default:
        logger.error('❌ 未知操作类型', new Error(preparation.action), 'BrowserProcessManager');
        return false;
    }
  }

  /**
   * 🔌 检查调试端口是否可用
   */
  private async checkDebugPortAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      
      socket.setTimeout(2000);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.connect(this.debugPort, this.debugHost);
    });
  }

  /**
   * 🔍 检测正在运行的浏览器实例
   */
  private detectRunningBrowserInstances(): Array<{pid: string, name: string}> {
    try {
      // 根据浏览器路径确定进程名
      let processName = 'msedge.exe';
      if (this.browserPath.toLowerCase().includes('chrome')) {
        processName = 'chrome.exe';
      }

      const command = `tasklist /FI "IMAGENAME eq ${processName}" /FO CSV`;
      const output = execSync(command, { encoding: 'utf8' });
      
      const lines = output.split('\n').filter(line => 
        line.includes(processName.replace('.exe', '')) && 
        !line.includes('映像名称') // 过滤标题行
      );

      const instances = lines.map(line => {
        const parts = line.split(',');
        if (parts.length >= 2) {
          return {
            pid: parts[1].replace(/"/g, '').trim(),
            name: parts[0].replace(/"/g, '').trim()
          };
        }
        return null;
      }).filter(Boolean) as Array<{pid: string, name: string}>;

      return instances;
    } catch (error) {
      logger.warn('⚠️ 检测浏览器实例失败: ' + (error as Error).message, 'BrowserProcessManager');
      return [];
    }
  }

  /**
   * 💀 关闭现有浏览器实例
   */
  private async killExistingBrowserInstances(): Promise<boolean> {
    try {
      const instances = this.detectRunningBrowserInstances();
      
      if (instances.length === 0) {
        logger.info('ℹ️ 没有需要关闭的浏览器实例', 'BrowserProcessManager');
        return true;
      }

      logger.info(`🔄 关闭 ${instances.length} 个浏览器实例...`, 'BrowserProcessManager');

      for (const instance of instances) {
        try {
          execSync(`taskkill /PID ${instance.pid} /F`, { stdio: 'ignore' });
          logger.info(`✅ 已关闭进程 ${instance.pid}`, 'BrowserProcessManager');
        } catch (error) {
          logger.warn(`⚠️ 无法关闭进程 ${instance.pid}: ${(error as Error).message}`, 'BrowserProcessManager');
        }
      }

      // 验证是否全部关闭
      await this.sleep(1000);
      const remainingInstances = this.detectRunningBrowserInstances();
      
      if (remainingInstances.length === 0) {
        logger.success('✅ 所有浏览器实例已关闭', 'BrowserProcessManager');
        return true;
      } else {
        logger.warn(`⚠️ 仍有 ${remainingInstances.length} 个实例未关闭`, 'BrowserProcessManager');
        return false;
      }

    } catch (error) {
      logger.error('❌ 关闭浏览器实例失败', error as Error, 'BrowserProcessManager');
      return false;
    }
  }

  /**
   * 🚀 启动调试浏览器
   */
  private async startDebugBrowser(): Promise<boolean> {
    try {
      logger.info('🚀 启动调试浏览器', 'BrowserProcessManager');

      // 只使用最基本和兼容的参数
      const args = [
        `--remote-debugging-port=${this.debugPort}`
      ];

      // 用户数据目录
      if (this.userDataDir) {
        args.push(`--user-data-dir="${this.userDataDir}"`);
      }

      const connectionConfig = Config.getBrowserConnectionConfig();

      // 反检测参数（默认关闭，按需启用）
      if (connectionConfig.stealthMode) {
        args.push(
          '--disable-blink-features=AutomationControlled',
          '--exclude-switches=enable-automation'
        );
        logger.info('🥷 已启用反检测模式', 'BrowserProcessManager');
      }

      // GPU加速（默认启用，提升性能）
      if (connectionConfig.enableGpu) {
        args.push('--enable-gpu');
        logger.info('🚀 已启用GPU加速', 'BrowserProcessManager');
      } else {
        args.push('--disable-gpu');
        logger.info('⚠️ 已禁用GPU加速', 'BrowserProcessManager');
      }

      // 窗口显示参数（确保全屏显示）
      if (connectionConfig.maximized) {
        args.push('--start-maximized');
        logger.info('🖥️ 已设置最大化窗口', 'BrowserProcessManager');
      }

      // 如果使用用户数据目录，强制全屏显示
      if (this.userDataDir) {
        args.push('--start-maximized');
        // 可选：添加全屏参数
        if (process.env.BROWSER_FULLSCREEN === 'true') {
          args.push('--start-fullscreen');
          logger.info('🖥️ 已设置全屏模式', 'BrowserProcessManager');
        }
        logger.info('🖥️ 用户数据模式：强制最大化显示', 'BrowserProcessManager');
      }

      // 自定义参数（高级用户使用）
      if (connectionConfig.customArgs && connectionConfig.customArgs.length > 0) {
        args.push(...connectionConfig.customArgs);
        logger.info(`🔧 自定义参数: ${connectionConfig.customArgs.join(' ')}`, 'BrowserProcessManager');
      }

      // 基本启动参数
      args.push(
        '--no-first-run',
        '--no-default-browser-check'
      );

      logger.info(`🔧 启动命令: "${this.browserPath}" ${args.join(' ')}`, 'BrowserProcessManager');

      const browserProcess = spawn(this.browserPath, args, {
        detached: true,
        stdio: 'ignore'
      });

      browserProcess.unref();

      logger.info('⏳ 等待浏览器启动...', 'BrowserProcessManager');

      for (let i = 0; i < 10; i++) {
        await this.sleep(1000);

        const debugAvailable = await this.checkDebugPortAvailable();
        if (debugAvailable) {
          logger.success('✅ 调试浏览器启动成功', 'BrowserProcessManager');
          return true;
        }

        logger.info(`⏳ 等待中... (${i + 1}/10)`, 'BrowserProcessManager');
      }

      logger.error('❌ 调试浏览器启动超时', new Error('启动超时'), 'BrowserProcessManager');
      return false;

    } catch (error) {
      logger.error('❌ 启动调试浏览器失败', error as Error, 'BrowserProcessManager');
      return false;
    }
  }

  /**
   * 🔧 获取默认浏览器路径
   */
  private getDefaultBrowserPath(): string {
    const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    
    // 优先使用Edge
    const fs = require('fs');
    if (fs.existsSync(edgePath)) {
      return edgePath;
    } else if (fs.existsSync(chromePath)) {
      return chromePath;
    }
    
    // 默认返回Edge路径
    return edgePath;
  }

  /**
   * 💤 睡眠函数
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 📊 获取连接信息
   */
  getConnectionInfo(): {
    debugPort: number;
    debugHost: string;
    debugUrl: string;
    browserPath: string;
    userDataDir?: string;
  } {
    return {
      debugPort: this.debugPort,
      debugHost: this.debugHost,
      debugUrl: `http://${this.debugHost}:${this.debugPort}`,
      browserPath: this.browserPath,
      userDataDir: this.userDataDir
    };
  }
}
