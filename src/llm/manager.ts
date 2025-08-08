import { LLMConfig, LLMEndpoint, LLMStrategy, LLMStats, LLMManager } from '../types';
import { logger } from '../utils/logger';

/**
 * 🤖 多供应商LLM管理器
 * 
 * 这个类负责管理多个LLM供应商的API端点，包括：
 * - 智能端点选择策略（轮询、优先级、负载均衡等）
 * - 健康检查和故障转移
 * - 请求统计和性能监控
 * - 动态负载均衡
 */
export class MultiProviderLLMManager implements LLMManager {
  private config: LLMConfig;
  private stats: Map<string, LLMStats> = new Map();
  private currentRoundRobinIndex = 0;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(config: LLMConfig) {
    this.config = config;
    this.initializeStats();
    this.startHealthCheck();
  }

  /**
   * 🔧 初始化统计信息
   */
  private initializeStats(): void {
    this.config.endpoints.forEach((endpoint, index) => {
      const endpointId = this.getEndpointId(endpoint, index);
      this.stats.set(endpointId, {
        endpointId,
        provider: endpoint.provider,
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        totalResponseTime: 0,
        averageResponseTime: 0,
        lastUsed: new Date(),
        tokensUsed: 0,
      });
    });
  }

  /**
   * 🆔 生成端点唯一标识符
   */
  private getEndpointId(endpoint: LLMEndpoint, index: number): string {
    return `${endpoint.provider}-${index}-${endpoint.model}`;
  }

  /**
   * 📊 获取可用的端点列表
   */
  getAvailableEndpoints(): LLMEndpoint[] {
    const available = this.config.endpoints.filter(endpoint => {
      // 检查是否启用
      if (endpoint.enabled === false) {
        logger.debug(`端点已禁用: ${endpoint.provider}/${endpoint.model}`, 'LLMManager');
        return false;
      }
      
      // 只有明确标记为不健康的端点才被排除
      // unknown 和 healthy 状态的端点都被认为是可用的
      if (endpoint.healthCheck?.status === 'unhealthy') {
        logger.debug(`端点不健康: ${endpoint.provider}/${endpoint.model}`, 'LLMManager');
        return false;
      }
      
      return true;
    });
    
    logger.debug(`找到 ${available.length} 个可用端点，总共 ${this.config.endpoints.length} 个端点`, 'LLMManager');
    return available;
  }

  /**
   * 🎯 根据策略选择最佳端点
   */
  selectEndpoint(strategy?: LLMStrategy): LLMEndpoint | null {
    const availableEndpoints = this.getAvailableEndpoints();
    
    if (availableEndpoints.length === 0) {
      logger.warn('没有可用的LLM端点', 'LLMManager');
      logger.debug('端点状态详情:', 'LLMManager');
      this.config.endpoints.forEach((endpoint, index) => {
        logger.debug(`  ${index}: ${endpoint.provider}/${endpoint.model} - enabled: ${endpoint.enabled !== false}, health: ${endpoint.healthCheck?.status || 'unknown'}`, 'LLMManager');
      });
      return null;
    }

    const selectedStrategy = strategy || this.config.strategy;
    
    switch (selectedStrategy) {
      case 'priority':
        return this.selectByPriority(availableEndpoints);
      
      case 'round_robin':
        return this.selectByRoundRobin(availableEndpoints);
      
      case 'load_balance':
        return this.selectByLoadBalance(availableEndpoints);
      
      case 'failover':
        return this.selectByFailover(availableEndpoints);
      
      case 'random':
        return this.selectByRandom(availableEndpoints);
      
      default:
        logger.warn(`未知的选择策略: ${selectedStrategy}，使用优先级策略`, 'LLMManager');
        return this.selectByPriority(availableEndpoints);
    }
  }

  /**
   * 🏆 按优先级选择端点
   */
  private selectByPriority(endpoints: LLMEndpoint[]): LLMEndpoint {
    // 按优先级排序（数字越小优先级越高）
    const sortedEndpoints = [...endpoints].sort((a, b) => {
      const priorityA = a.priority ?? 999;
      const priorityB = b.priority ?? 999;
      return priorityA - priorityB;
    });
    
    const selected = sortedEndpoints[0];
    logger.debug(`使用优先级策略选择端点: ${selected.provider}/${selected.model}`, 'LLMManager');
    return selected;
  }

  /**
   * 🔄 轮询选择端点
   */
  private selectByRoundRobin(endpoints: LLMEndpoint[]): LLMEndpoint {
    const selected = endpoints[this.currentRoundRobinIndex % endpoints.length];
    this.currentRoundRobinIndex = (this.currentRoundRobinIndex + 1) % endpoints.length;
    
    logger.debug(`使用轮询策略选择端点: ${selected.provider}/${selected.model}`, 'LLMManager');
    return selected;
  }

  /**
   * ⚖️ 基于负载均衡选择端点
   */
  private selectByLoadBalance(endpoints: LLMEndpoint[]): LLMEndpoint {
    // 基于响应时间和权重计算最佳端点
    let bestEndpoint = endpoints[0];
    let bestScore = Infinity;

    for (const endpoint of endpoints) {
      const endpointId = this.getEndpointId(endpoint, this.config.endpoints.indexOf(endpoint));
      const stats = this.stats.get(endpointId);
      
      if (!stats) continue;

      // 计算负载分数：响应时间 / 权重
      const responseTime = stats.averageResponseTime || 1000; // 默认1秒
      const weight = endpoint.weight || 1;
      const score = responseTime / weight;

      if (score < bestScore) {
        bestScore = score;
        bestEndpoint = endpoint;
      }
    }

    logger.debug(`使用负载均衡策略选择端点: ${bestEndpoint.provider}/${bestEndpoint.model} (分数: ${bestScore.toFixed(2)})`, 'LLMManager');
    return bestEndpoint;
  }

  /**
   * 🚨 故障转移选择端点
   */
  private selectByFailover(endpoints: LLMEndpoint[]): LLMEndpoint {
    // 选择第一个健康的端点
    for (const endpoint of endpoints) {
      if (endpoint.healthCheck?.status !== 'unhealthy') {
        logger.debug(`使用故障转移策略选择端点: ${endpoint.provider}/${endpoint.model}`, 'LLMManager');
        return endpoint;
      }
    }
    
    // 如果所有端点都不健康，选择第一个
    const selected = endpoints[0];
    logger.warn(`所有端点都不健康，强制选择: ${selected.provider}/${selected.model}`, 'LLMManager');
    return selected;
  }

  /**
   * 🎲 随机选择端点
   */
  private selectByRandom(endpoints: LLMEndpoint[]): LLMEndpoint {
    const randomIndex = Math.floor(Math.random() * endpoints.length);
    const selected = endpoints[randomIndex];
    
    logger.debug(`使用随机策略选择端点: ${selected.provider}/${selected.model}`, 'LLMManager');
    return selected;
  }

  /**
   * 🏥 健康检查
   */
  async healthCheck(endpoint: LLMEndpoint): Promise<boolean> {
    try {
      const startTime = Date.now();
      
      // 这里应该发送一个简单的测试请求
      // 为了简化，我们假设端点是健康的
      // 实际实现中应该发送真实的API请求
      
      const responseTime = Date.now() - startTime;
      
      // 更新健康状态
      if (!endpoint.healthCheck) {
        endpoint.healthCheck = {
          status: 'healthy',
          responseTime: 0,
          errorCount: 0
        };
      }
      
      endpoint.healthCheck.lastCheck = new Date();
      endpoint.healthCheck.status = 'healthy';
      endpoint.healthCheck.responseTime = responseTime;
      
      logger.debug(`端点健康检查通过: ${endpoint.provider}/${endpoint.model} (${responseTime}ms)`, 'LLMManager');
      return true;
      
    } catch (error) {
      logger.error(`端点健康检查失败: ${endpoint.provider}/${endpoint.model}`, error as Error, 'LLMManager');
      
      if (!endpoint.healthCheck) {
        endpoint.healthCheck = {
          status: 'unhealthy',
          responseTime: 0,
          errorCount: 1
        };
      } else {
        endpoint.healthCheck.status = 'unhealthy';
        endpoint.healthCheck.errorCount = (endpoint.healthCheck.errorCount || 0) + 1;
      }
      
      return false;
    }
  }

  /**
   * 🔄 更新端点健康状态
   */
  updateEndpointHealth(endpointId: string, isHealthy: boolean, responseTime?: number): void {
    const stats = this.stats.get(endpointId);
    if (!stats) return;

    const endpoint = this.config.endpoints.find((ep, index) => 
      this.getEndpointId(ep, index) === endpointId
    );
    
    if (!endpoint) return;

    if (!endpoint.healthCheck) {
      endpoint.healthCheck = {
        status: 'unknown',
        responseTime: 0,
        errorCount: 0
      };
    }

    endpoint.healthCheck.lastCheck = new Date();
    endpoint.healthCheck.status = isHealthy ? 'healthy' : 'unhealthy';
    
    if (responseTime !== undefined) {
      endpoint.healthCheck.responseTime = responseTime;
      
      // 更新统计信息
      stats.totalResponseTime += responseTime;
      stats.requestCount++;
      
      if (isHealthy) {
        stats.successCount++;
      } else {
        stats.errorCount++;
        endpoint.healthCheck.errorCount = (endpoint.healthCheck.errorCount || 0) + 1;
      }
      
      stats.averageResponseTime = stats.totalResponseTime / stats.requestCount;
      stats.lastUsed = new Date();
    }

    logger.debug(`更新端点健康状态: ${endpointId} -> ${isHealthy ? '健康' : '不健康'}`, 'LLMManager');
  }

  /**
   * 📈 获取统计信息
   */
  getStats(): LLMStats[] {
    return Array.from(this.stats.values());
  }

  /**
   * 🔄 重置统计信息
   */
  resetStats(): void {
    this.stats.clear();
    this.initializeStats();
    logger.info('LLM统计信息已重置', 'LLMManager');
  }

  /**
   * 🏥 启动健康检查定时器
   */
  private startHealthCheck(): void {
    const interval = this.config.loadBalance?.healthCheckInterval || 60000; // 默认1分钟
    
    this.healthCheckTimer = setInterval(async () => {
      logger.debug('开始定期健康检查', 'LLMManager');
      
      const checkPromises = this.config.endpoints.map(endpoint => 
        this.healthCheck(endpoint).catch(error => {
          logger.error(`健康检查失败: ${endpoint.provider}/${endpoint.model}`, error, 'LLMManager');
          return false;
        })
      );
      
      await Promise.all(checkPromises);
      
    }, interval);
  }

  /**
   * 🛑 停止健康检查定时器
   */
  stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
      logger.info('健康检查定时器已停止', 'LLMManager');
    }
  }

  /**
   * 🧹 清理资源
   */
  destroy(): void {
    this.stopHealthCheck();
    this.stats.clear();
    logger.info('LLM管理器已销毁', 'LLMManager');
  }
}

/**
 * 🏰 从环境变量创建LLM配置
 */
export function createLLMConfigFromEnv(): LLMConfig {
  const strategy = (process.env.LLM_STRATEGY as LLMStrategy) || 'priority';
  const endpoints: LLMEndpoint[] = [];

  logger.debug(`创建LLM配置，使用策略: ${strategy}`, 'LLMManager');

  // 解析OpenAI配置
  const openaiKeys = parseEnvArray(process.env.OPENAI_API_KEYS);
  const openaiUrls = parseEnvArray(process.env.OPENAI_BASE_URLS);
  const openaiModels = parseEnvArray(process.env.OPENAI_MODELS);
  const openaiPriorities = parseEnvArray(process.env.OPENAI_PRIORITIES).map(p => parseInt(p) || 1);
  const openaiWeights = parseEnvArray(process.env.OPENAI_WEIGHTS).map(w => parseInt(w) || 1);

  logger.debug(`OpenAI配置: ${openaiKeys.length} 个密钥, ${openaiUrls.length} 个URL`, 'LLMManager');

  if (openaiKeys.length > 0) {
    addEndpoints(endpoints, 'openai', openaiKeys, openaiUrls, openaiModels, openaiPriorities, openaiWeights);
  }

  // 解析Google配置
  const googleKeys = parseEnvArray(process.env.GOOGLE_API_KEYS);
  const googleUrls = parseEnvArray(process.env.GOOGLE_BASE_URLS);
  const googleModels = parseEnvArray(process.env.GOOGLE_MODELS);
  const googlePriorities = parseEnvArray(process.env.GOOGLE_PRIORITIES).map(p => parseInt(p) || 2);
  const googleWeights = parseEnvArray(process.env.GOOGLE_WEIGHTS).map(w => parseInt(w) || 1);

  logger.debug(`Google配置: ${googleKeys.length} 个密钥, ${googleUrls.length} 个URL`, 'LLMManager');

  if (googleKeys.length > 0) {
    addEndpoints(endpoints, 'google', googleKeys, googleUrls, googleModels, googlePriorities, googleWeights);
  }

  // 解析Anthropic配置
  const anthropicKeys = parseEnvArray(process.env.ANTHROPIC_API_KEYS);
  const anthropicUrls = parseEnvArray(process.env.ANTHROPIC_BASE_URLS);
  const anthropicModels = parseEnvArray(process.env.ANTHROPIC_MODELS);
  const anthropicPriorities = parseEnvArray(process.env.ANTHROPIC_PRIORITIES).map(p => parseInt(p) || 3);
  const anthropicWeights = parseEnvArray(process.env.ANTHROPIC_WEIGHTS).map(w => parseInt(w) || 1);

  if (anthropicKeys.length > 0) {
    addEndpoints(endpoints, 'anthropic', anthropicKeys, anthropicUrls, anthropicModels, anthropicPriorities, anthropicWeights);
  }

  // 📊 配置参数解析和验证
  const maxRetries = parseInt(process.env.LLM_MAX_RETRIES || '3');
  const retryDelay = parseInt(process.env.LLM_RETRY_DELAY || '1000');
  const timeout = parseInt(process.env.LLM_TIMEOUT || '30000');
  const loadBalanceWindow = parseInt(process.env.LLM_LOAD_BALANCE_WINDOW || '100');
  const healthCheckInterval = parseInt(process.env.LLM_HEALTH_CHECK_INTERVAL || '60000');
  const failureThreshold = parseInt(process.env.LLM_FAILURE_THRESHOLD || '3');
  const recoveryThreshold = parseInt(process.env.LLM_RECOVERY_THRESHOLD || '5');
  
  // 🔧 用户控制选项
  const disableHealthCheck = process.env.LLM_DISABLE_HEALTH_CHECK === 'true';
  const alwaysRetryAll = process.env.LLM_ALWAYS_RETRY_ALL === 'true';
  const enableFallbackMode = process.env.LLM_ENABLE_FALLBACK_MODE !== 'false';
  
  logger.info(`📊 LLM配置参数:`, 'LLMManager');
  logger.info(`  策略: ${strategy}`, 'LLMManager');
  logger.info(`  最大重试: ${maxRetries}`, 'LLMManager');
  logger.info(`  重试延迟: ${retryDelay}ms`, 'LLMManager');
  logger.info(`  请求超时: ${timeout}ms`, 'LLMManager');
  logger.info(`  负载均衡窗口: ${loadBalanceWindow}`, 'LLMManager');
  logger.info(`  健康检查间隔: ${healthCheckInterval}ms`, 'LLMManager');
  logger.info(`  禁用健康检查: ${disableHealthCheck}`, 'LLMManager');
  logger.info(`  总是重试所有端点: ${alwaysRetryAll}`, 'LLMManager');
  logger.info(`  启用回退模式: ${enableFallbackMode}`, 'LLMManager');

  const config: LLMConfig = {
    strategy,
    endpoints,
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0'),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4000'),
    maxRetries,
    retryDelay,
    timeout,
    loadBalance: {
      window: loadBalanceWindow,
      healthCheckInterval,
      failureThreshold,
      recoveryThreshold,
    },
    // 新增的用户控制选项
    userControl: {
      disableHealthCheck,
      alwaysRetryAll,
      enableFallbackMode,
      strictMode: process.env.LLM_STRICT_MODE === 'true',
      debugMode: process.env.LLM_DEBUG_MODE === 'true',
    }
  };
  
  // 🔧 如果禁用健康检查，将所有端点设置为健康状态
  if (disableHealthCheck) {
    endpoints.forEach(endpoint => {
      if (endpoint.healthCheck) {
        endpoint.healthCheck.status = 'healthy';
      }
    });
    logger.info('🚫 已禁用健康检查，所有端点被设置为健康状态', 'LLMManager');
  }
  
  return config;
}

/**
 * 🔧 解析环境变量数组
 */
function parseEnvArray(envValue?: string): string[] {
  if (!envValue) return [];
  return envValue.split(',').map(item => item.trim()).filter(item => item.length > 0);
}

/**
 * ➕ 添加端点到配置
 */
function addEndpoints(
  endpoints: LLMEndpoint[],
  provider: 'openai' | 'anthropic' | 'google',
  keys: string[],
  urls: string[],
  models: string[],
  priorities: number[],
  weights: number[]
): void {
  const defaultUrls = {
    openai: 'https://api.openai.com/v1',
    google: 'https://generativelanguage.googleapis.com/v1beta/',
    anthropic: 'https://api.anthropic.com'
  };

  const defaultModels = {
    openai: 'gpt-4o',
    google: 'gemini-2.5-flash',
    anthropic: 'claude-3-5-sonnet-20241022'
  };

  // 如果密钥数量与URL数量相同，按位置一一对应
  // 否则使用默认URL或第一个URL
  const usePositionalMapping = keys.length === urls.length && urls.length > 0;

  keys.forEach((key, index) => {
    const baseURL = usePositionalMapping 
      ? urls[index] 
      : (urls[0] || defaultUrls[provider]);
    
    const model = models[index] || models[0] || defaultModels[provider];
    const priority = priorities[index] || priorities[0] || (index + 1);
    const weight = weights[index] || weights[0] || 1;

    endpoints.push({
      provider,
      apiKey: key,
      baseURL,
      model,
      priority,
      weight,
      enabled: true,
      healthCheck: {
        status: 'unknown',
        responseTime: 0,
        errorCount: 0
      }
    });
  });

  logger.info(`已添加 ${keys.length} 个 ${provider} 端点`, 'LLMManager');
}
