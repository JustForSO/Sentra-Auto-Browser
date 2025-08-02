import * as fs from 'fs';
import * as path from 'path';
import { PluginConfig, LoadedPlugin, PluginLoader, PluginExecutionContext, PluginExecutionResult } from './types';
import { logger } from '../utils/logger';

/**
 * 插件加载器
 * 负责从文件系统加载插件
 */
export class FileSystemPluginLoader implements PluginLoader {
  private pluginsDirectory: string;

  constructor(pluginsDirectory: string) {
    this.pluginsDirectory = pluginsDirectory;
  }

  /**
   * 加载单个插件
   */
  async loadPlugin(pluginPath: string): Promise<LoadedPlugin> {
    const fullPath = path.resolve(this.pluginsDirectory, pluginPath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`插件路径不存在: ${fullPath}`);
    }

    const configPath = path.join(fullPath, 'plugin.json');
    const indexPath = path.join(fullPath, 'index.js');

    // 检查必需文件
    if (!fs.existsSync(configPath)) {
      throw new Error(`插件配置文件不存在: ${configPath}`);
    }

    if (!fs.existsSync(indexPath)) {
      throw new Error(`插件执行文件不存在: ${indexPath}`);
    }

    // 加载配置
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config: PluginConfig = JSON.parse(configContent);

    // 验证配置
    this.validateConfig(config);

    // 加载执行脚本
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    
    // 创建插件执行函数
    const execute = this.createExecuteFunction(indexContent, fullPath, config);

    const loadedPlugin: LoadedPlugin = {
      config,
      execute,
      folderPath: fullPath
    };

    logger.info(`插件加载成功: ${config.name} (${config.id})`, 'PluginLoader');
    return loadedPlugin;
  }

  /**
   * 加载所有插件
   */
  async loadAllPlugins(): Promise<LoadedPlugin[]> {
    const plugins: LoadedPlugin[] = [];
    
    if (!fs.existsSync(this.pluginsDirectory)) {
      logger.warn(`插件目录不存在: ${this.pluginsDirectory}`, 'PluginLoader');
      return plugins;
    }

    const entries = fs.readdirSync(this.pluginsDirectory, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        try {
          const plugin = await this.loadPlugin(entry.name);
          plugins.push(plugin);
        } catch (error) {
          logger.error(`加载插件失败: ${entry.name}`, error as Error, 'PluginLoader');
        }
      }
    }

    logger.info(`成功加载 ${plugins.length} 个插件`, 'PluginLoader');
    return plugins;
  }

  /**
   * 验证插件
   */
  async validatePlugin(pluginPath: string): Promise<boolean> {
    try {
      await this.loadPlugin(pluginPath);
      return true;
    } catch (error) {
      logger.error(`插件验证失败: ${pluginPath}`, error as Error, 'PluginLoader');
      return false;
    }
  }

  /**
   * 验证插件配置
   */
  private validateConfig(config: PluginConfig): void {
    const required = ['id', 'name', 'version', 'description', 'category'];
    
    for (const field of required) {
      if (!config[field as keyof PluginConfig]) {
        throw new Error(`插件配置缺少必需字段: ${field}`);
      }
    }

    // 验证类别
    const validCategories = ['visual-effects', 'decoration', 'interaction', 'utility', 'audio'];
    if (!validCategories.includes(config.category)) {
      throw new Error(`无效的插件类别: ${config.category}`);
    }

    // 验证版本格式
    const versionRegex = /^\d+\.\d+\.\d+$/;
    if (!versionRegex.test(config.version)) {
      throw new Error(`无效的版本格式: ${config.version}`);
    }
  }

  /**
   * 创建插件执行函数
   */
  private createExecuteFunction(
    scriptContent: string, 
    pluginPath: string, 
    config: PluginConfig
  ): (context: PluginExecutionContext) => Promise<PluginExecutionResult> {
    
    return async (context: PluginExecutionContext): Promise<PluginExecutionResult> => {
      try {
        // 创建安全的执行环境
        const sandbox = this.createSandbox(context, pluginPath, config);
        
        // 执行插件脚本
        const result = await this.executeInSandbox(scriptContent, sandbox);
        
        return {
          success: true,
          message: `插件 ${config.name} 执行成功`,
          data: result
        };
      } catch (error) {
        logger.error(`插件执行失败: ${config.name}`, error as Error, 'PluginLoader');
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    };
  }

  /**
   * 创建沙箱环境
   */
  private createSandbox(context: PluginExecutionContext, pluginPath: string, config: PluginConfig) {
    const fs = require('fs');
    const path = require('path');
    
    return {
      // 提供给插件的API
      page: context.page,
      parameters: context.parameters,
      pluginPath,
      config,
      
      // 工具函数
      console: {
        log: (...args: any[]) => logger.info(`[${config.name}] ${args.join(' ')}`, 'Plugin'),
        error: (...args: any[]) => logger.error(`[${config.name}] ${args.join(' ')}`, new Error(args.join(' ')), 'Plugin'),
        warn: (...args: any[]) => logger.warn(`[${config.name}] ${args.join(' ')}`, 'Plugin')
      },
      
      // 文件系统访问（限制在插件目录内）
      readFile: (filename: string) => {
        const filePath = path.join(pluginPath, filename);
        if (!filePath.startsWith(pluginPath)) {
          throw new Error('文件访问被限制在插件目录内');
        }
        return fs.readFileSync(filePath, 'utf-8');
      },
      
      // 样式注入
      injectCSS: async (css: string) => {
        await context.page.evaluate((cssContent: string) => {
          const style = document.createElement('style');
          style.id = `plugin-style-${Date.now()}`;
          style.textContent = cssContent;
          document.head.appendChild(style);
        }, css);
      },
      
      // 脚本注入
      injectJS: async (js: string) => {
        await context.page.evaluate((jsContent: string) => {
          const script = document.createElement('script');
          script.id = `plugin-script-${Date.now()}`;
          script.textContent = jsContent;
          document.head.appendChild(script);
        }, js);
      },
      
      // DOM操作
      querySelector: async (selector: string) => {
        return await context.page.$(selector);
      },
      
      querySelectorAll: async (selector: string) => {
        return await context.page.$$(selector);
      }
    };
  }

  /**
   * 在沙箱中执行脚本
   */
  private async executeInSandbox(scriptContent: string, sandbox: any): Promise<any> {
    // 创建函数并执行
    const func = new Function(
      ...Object.keys(sandbox),
      `
      return (async () => {
        ${scriptContent}
      })();
      `
    );
    
    return await func(...Object.values(sandbox));
  }
}
