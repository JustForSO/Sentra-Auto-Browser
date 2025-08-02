import { PluginManager } from './manager';
import { logger } from '../utils/logger';

/**
 * 插件注册表
 * 负责初始化和管理新的插件系统
 */
export class PluginRegistry {
  private manager: PluginManager;

  constructor(pluginsDirectory?: string) {
    this.manager = new PluginManager(pluginsDirectory);
  }

  /**
   * 初始化插件系统
   */
  async initialize(): Promise<void> {
    logger.info('开始初始化插件系统', 'PluginRegistry');
    
    try {
      await this.manager.initialize();
      logger.info('插件系统初始化完成', 'PluginRegistry');
    } catch (error) {
      logger.error('插件系统初始化失败', error as Error, 'PluginRegistry');
    }
  }

  /**
   * 获取插件管理器
   */
  getManager(): PluginManager {
    return this.manager;
  }

  /**
   * 获取推荐插件
   */
  getRecommendedPlugins(keywords: string[]): string[] {
    const allPlugins = this.manager.getAllPlugins();
    const recommendations: Array<{ plugin: any; score: number }> = [];

    for (const plugin of allPlugins) {
      let score = 0;
      const config = plugin.config;
      
      // 检查关键词匹配
      for (const keyword of keywords) {
        const lowerKeyword = keyword.toLowerCase();
        
        // 检查名称匹配
        if (config.name.toLowerCase().includes(lowerKeyword)) {
          score += 10;
        }
        
        // 检查描述匹配
        if (config.description.toLowerCase().includes(lowerKeyword)) {
          score += 5;
        }
        
        // 检查标签匹配
        if (config.tags && config.tags.some((tag: string) => 
          tag.toLowerCase().includes(lowerKeyword)
        )) {
          score += 8;
        }
        
        // 检查类别匹配
        if (config.category.toLowerCase().includes(lowerKeyword)) {
          score += 6;
        }
      }
      
      if (score > 0) {
        recommendations.push({ plugin: config, score });
      }
    }

    // 按分数排序并返回插件ID
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 5) // 最多返回5个推荐
      .map(item => item.plugin.id);
  }

  /**
   * 获取插件信息用于AI推荐
   */
  getPluginInfoForAI(): string {
    return this.manager.getPluginInfoForAI();
  }
}
