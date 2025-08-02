import { LoadedPlugin, PluginManager as IPluginManager, PluginExecutionContext, PluginExecutionResult } from './types';
import { FileSystemPluginLoader } from './loader';
import { logger } from '../utils/logger';
import * as path from 'path';

/**
 * 新的插件管理器
 * 负责插件的加载、注册、管理和执行
 */
export class PluginManager implements IPluginManager {
  private plugins: Map<string, LoadedPlugin> = new Map();
  private loader: FileSystemPluginLoader;

  constructor(pluginsDirectory?: string) {
    // 在编译后的环境中，需要从dist目录向上找到项目根目录的plugins文件夹
    const defaultPluginsDir = pluginsDirectory ||
      (process.env.NODE_ENV === 'production'
        ? path.join(process.cwd(), 'plugins')  // 生产环境：从当前工作目录找plugins
        : path.join(__dirname, '../../plugins')); // 开发环境：相对路径
    this.loader = new FileSystemPluginLoader(defaultPluginsDir);
  }

  /**
   * 初始化插件管理器，加载所有插件
   */
  async initialize(): Promise<void> {
    try {
      const plugins = await this.loader.loadAllPlugins();
      
      for (const plugin of plugins) {
        await this.register(plugin);
      }
      
      logger.info(`插件管理器初始化完成，共加载 ${plugins.length} 个插件`, 'PluginManager');
    } catch (error) {
      logger.error('插件管理器初始化失败', error as Error, 'PluginManager');
    }
  }

  /**
   * 注册插件
   */
  async register(plugin: LoadedPlugin): Promise<boolean> {
    try {
      // 检查插件ID是否已存在
      if (this.plugins.has(plugin.config.id)) {
        logger.warn(`插件ID已存在，将覆盖: ${plugin.config.id}`, 'PluginManager');
      }

      this.plugins.set(plugin.config.id, plugin);
      logger.info(`插件已注册: ${plugin.config.name} (${plugin.config.id})`, 'PluginManager');
      return true;
    } catch (error) {
      logger.error(`插件注册失败: ${plugin.config.id}`, error as Error, 'PluginManager');
      return false;
    }
  }

  /**
   * 注销插件
   */
  async unregister(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        logger.warn(`尝试注销不存在的插件: ${pluginId}`, 'PluginManager');
        return false;
      }

      // 执行清理
      if (plugin.cleanup) {
        await plugin.cleanup();
      }

      this.plugins.delete(pluginId);
      logger.info(`插件已注销: ${pluginId}`, 'PluginManager');
      return true;
    } catch (error) {
      logger.error(`插件注销失败: ${pluginId}`, error as Error, 'PluginManager');
      return false;
    }
  }

  /**
   * 执行插件
   */
  async execute(pluginId: string, context: PluginExecutionContext): Promise<PluginExecutionResult> {
    const plugin = this.getPlugin(pluginId);
    if (!plugin) {
      return {
        success: false,
        error: `插件未找到: ${pluginId}`
      };
    }

    try {
      logger.info(`开始执行插件: ${plugin.config.name} (${pluginId})`, 'PluginManager');
      const result = await plugin.execute(context);
      
      if (result.success) {
        logger.info(`插件执行成功: ${pluginId}`, 'PluginManager');
      } else {
        logger.warn(`插件执行失败: ${pluginId} - ${result.error}`, 'PluginManager');
      }
      
      return result;
    } catch (error) {
      logger.error(`插件执行异常: ${pluginId}`, error as Error, 'PluginManager');
      return {
        success: false,
        error: `插件执行异常: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * 获取插件
   */
  getPlugin(pluginId: string): LoadedPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * 获取所有插件
   */
  getAllPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 根据类别获取插件
   */
  getPluginsByCategory(category: string): LoadedPlugin[] {
    return this.getAllPlugins().filter(plugin => plugin.config.category === category);
  }

  /**
   * 根据标签获取插件
   */
  getPluginsByTag(tag: string): LoadedPlugin[] {
    return this.getAllPlugins().filter(plugin => 
      plugin.config.tags && plugin.config.tags.includes(tag)
    );
  }

  /**
   * 重新加载插件
   */
  async reloadPlugin(pluginId: string): Promise<boolean> {
    try {
      const existingPlugin = this.getPlugin(pluginId);
      if (!existingPlugin) {
        logger.warn(`尝试重新加载不存在的插件: ${pluginId}`, 'PluginManager');
        return false;
      }

      // 注销现有插件
      await this.unregister(pluginId);

      // 重新加载插件
      const pluginPath = path.basename(existingPlugin.folderPath);
      const newPlugin = await this.loader.loadPlugin(pluginPath);
      
      // 重新注册
      return await this.register(newPlugin);
    } catch (error) {
      logger.error(`插件重新加载失败: ${pluginId}`, error as Error, 'PluginManager');
      return false;
    }
  }

  /**
   * 获取插件信息用于AI推荐
   */
  getPluginInfoForAI(): string {
    const plugins = this.getAllPlugins();
    
    if (plugins.length === 0) {
      return '当前没有可用的插件。';
    }
    
    const pluginInfo = plugins.map(plugin => {
      const config = plugin.config;
      let info = `- ${config.name} (${config.id}): ${config.description}`;
      info += `\n  类别: ${config.category}`;
      info += `\n  标签: ${config.tags?.join(', ') || '无'}`;
      
      if (config.parameters && config.parameters.length > 0) {
        info += `\n  参数: ${config.parameters.map(p => `${p.name}(${p.type})`).join(', ')}`;
      }
      
      return info;
    }).join('\n\n');

    return `当前可用的插件 (${plugins.length}个):\n\n${pluginInfo}`;
  }
}
