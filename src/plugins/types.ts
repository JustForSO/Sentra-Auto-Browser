/**
 * 新的插件系统类型定义
 */

export interface PluginConfig {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  category: 'visual-effects' | 'decoration' | 'interaction' | 'utility' | 'audio';
  tags: string[];
  permissions: string[];
  parameters?: PluginParameter[];
  enabled?: boolean;
  autoLoad?: boolean;
  priority?: number;
}

export interface PluginParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  default?: any;
  required?: boolean;
  options?: any[]; // 对于枚举类型
  min?: number;    // 对于数字类型
  max?: number;    // 对于数字类型
}

export interface PluginExecutionContext {
  page: any; // Playwright Page对象
  parameters: Record<string, any>;
  pluginPath: string;
}

export interface PluginExecutionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

export interface LoadedPlugin {
  config: PluginConfig;
  execute: (context: PluginExecutionContext) => Promise<PluginExecutionResult>;
  cleanup?: () => Promise<void>;
  folderPath: string;
}

export interface PluginLoader {
  loadPlugin(pluginPath: string): Promise<LoadedPlugin>;
  loadAllPlugins(): Promise<LoadedPlugin[]>;
  validatePlugin(pluginPath: string): Promise<boolean>;
}

export interface PluginManager {
  register(plugin: LoadedPlugin): Promise<boolean>;
  unregister(pluginId: string): Promise<boolean>;
  execute(pluginId: string, context: PluginExecutionContext): Promise<PluginExecutionResult>;
  getPlugin(pluginId: string): LoadedPlugin | undefined;
  getAllPlugins(): LoadedPlugin[];
  getPluginsByCategory(category: string): LoadedPlugin[];
  getPluginsByTag(tag: string): LoadedPlugin[];
}
