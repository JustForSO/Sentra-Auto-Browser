import { LLMConfig, LLMEndpoint, LLMStrategy } from '../types';
import { MultiProviderLLMManager } from './manager';
import { OpenAILLM } from './openai';
import { GoogleLLM } from './google';
import { logger } from '../utils/logger';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: { url: string };
  }>;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * 🤖 增强版基础LLM类
 * 
 * 支持多供应商智能管理，包括：
 * - 自动端点选择和故障转移
 * - 负载均衡和健康检查
 * - 请求重试和错误恢复
 * - 性能监控和统计
 */
export class EnhancedBaseLLM {
  protected config: LLMConfig;
  protected manager: MultiProviderLLMManager;
  protected llmInstances: Map<string, any> = new Map();

  constructor(config: LLMConfig) {
    this.config = config;
    this.manager = new MultiProviderLLMManager(config);
    this.initializeLLMInstances();
  }

  /**
   * 🏭 初始化LLM实例
   */
  private initializeLLMInstances(): void {
    for (const endpoint of this.config.endpoints) {
      const instanceKey = `${endpoint.provider}-${endpoint.model}`;
      
      try {
        let llmInstance;
        
        switch (endpoint.provider) {
          case 'openai':
            llmInstance = new OpenAILLM({
              provider: endpoint.provider,
              model: endpoint.model,
              apiKey: endpoint.apiKey,
              baseURL: endpoint.baseURL,
              temperature: this.config.temperature,
              maxTokens: this.config.maxTokens,
              strategy: this.config.strategy,
              endpoints: [endpoint]
            });
            break;
            
          case 'google':
            llmInstance = new GoogleLLM({
              provider: endpoint.provider,
              model: endpoint.model,
              apiKey: endpoint.apiKey,
              baseURL: endpoint.baseURL,
              temperature: this.config.temperature,
              maxTokens: this.config.maxTokens,
              strategy: this.config.strategy,
              endpoints: [endpoint]
            });
            break;
            
          case 'anthropic':
            // TODO: 实现Anthropic LLM类
            logger.warn(`Anthropic LLM 暂未实现，跳过端点: ${endpoint.model}`, 'EnhancedBaseLLM');
            continue;
            
          default:
            logger.warn(`未知的LLM供应商: ${endpoint.provider}`, 'EnhancedBaseLLM');
            continue;
        }
        
        this.llmInstances.set(instanceKey, llmInstance);
        logger.debug(`已初始化LLM实例: ${instanceKey}`, 'EnhancedBaseLLM');
        
      } catch (error) {
        logger.error(`初始化LLM实例失败: ${instanceKey}`, error as Error, 'EnhancedBaseLLM');
      }
    }
    
    logger.info(`已初始化 ${this.llmInstances.size} 个LLM实例`, 'EnhancedBaseLLM');
  }

  /**
   * 🎯 生成响应（智能端点选择）
   */
  async generateResponse(messages: LLMMessage[], useStructuredOutput: boolean = false): Promise<LLMResponse> {
    const maxRetries = this.config.maxRetries || 3;
    const userControl = this.config.userControl || {};
    let lastError: Error | null = null;

    // 🔧 如果启用了“总是重试所有端点”模式，尝试所有端点
    if (userControl.alwaysRetryAll) {
      return this.tryAllEndpoints(messages, useStructuredOutput);
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // 选择最佳端点
        const selectedEndpoint = this.manager.selectEndpoint();
        
        if (!selectedEndpoint) {
          if (userControl.enableFallbackMode !== false) {
            logger.warn('没有可用的端点，尝试回退模式', 'EnhancedBaseLLM');
            return this.tryFallbackMode(messages, useStructuredOutput);
          }
          throw new Error('没有可用的LLM端点');
        }

        const instanceKey = `${selectedEndpoint.provider}-${selectedEndpoint.model}`;
        const llmInstance = this.llmInstances.get(instanceKey);
        
        if (!llmInstance) {
          throw new Error(`未找到LLM实例: ${instanceKey}`);
        }

        logger.debug(`使用端点: ${instanceKey} (尝试 ${attempt + 1}/${maxRetries})`, 'EnhancedBaseLLM');

        const startTime = Date.now();
        
        try {
          // 执行请求
          const response = await llmInstance.generateResponse(messages, useStructuredOutput);
          const responseTime = Date.now() - startTime;

          // 更新成功统计
          const endpointId = this.getEndpointId(selectedEndpoint);
          this.manager.updateEndpointHealth(endpointId, true, responseTime);

          logger.debug(`请求成功: ${instanceKey} (${responseTime}ms)`, 'EnhancedBaseLLM');
          return response;

        } catch (error) {
          const responseTime = Date.now() - startTime;
          const endpointId = this.getEndpointId(selectedEndpoint);
          
          // 更新失败统计
          this.manager.updateEndpointHealth(endpointId, false, responseTime);
          
          logger.warn(`端点请求失败: ${instanceKey} (${responseTime}ms)`, 'EnhancedBaseLLM');
          throw error;
        }

      } catch (error) {
        lastError = error as Error;
        logger.warn(`尝试 ${attempt + 1} 失败: ${lastError.message}`, 'EnhancedBaseLLM');

        // 如果不是最后一次尝试，等待后重试
        if (attempt < maxRetries - 1) {
          const retryDelay = this.config.retryDelay || 1000;
          await this.sleep(retryDelay * (attempt + 1)); // 指数退避
        }
      }
    }

    // 所有尝试都失败了
    const errorMessage = `所有LLM端点请求失败，最后错误: ${lastError?.message}`;
    logger.error(errorMessage, lastError!, 'EnhancedBaseLLM');
    throw new Error(errorMessage);
  }

  /**
   * 📊 获取统计信息
   */
  getStats() {
    return this.manager.getStats();
  }

  /**
   * 🔄 重置统计信息
   */
  resetStats(): void {
    this.manager.resetStats();
  }

  /**
   * 🏥 执行健康检查
   */
  async performHealthCheck(): Promise<void> {
    const endpoints = this.config.endpoints;
    const healthPromises = endpoints.map(endpoint => 
      this.manager.healthCheck(endpoint)
    );

    const results = await Promise.allSettled(healthPromises);
    
    results.forEach((result, index) => {
      const endpoint = endpoints[index];
      const status = result.status === 'fulfilled' && result.value ? '健康' : '不健康';
      logger.debug(`健康检查结果: ${endpoint.provider}/${endpoint.model} -> ${status}`, 'EnhancedBaseLLM');
    });
  }

  /**
   * 🆔 获取端点ID
   */
  private getEndpointId(endpoint: LLMEndpoint): string {
    const index = this.config.endpoints.indexOf(endpoint);
    return `${endpoint.provider}-${index}-${endpoint.model}`;
  }

  /**
   * 🔄 尝试所有端点（总是重试所有端点模式）
   */
  private async tryAllEndpoints(messages: LLMMessage[], useStructuredOutput: boolean): Promise<LLMResponse> {
    const availableEndpoints = this.manager.getAvailableEndpoints();
    
    if (availableEndpoints.length === 0) {
      throw new Error('没有可用的端点');
    }

    let lastError: Error | null = null;
    
    // 依次尝试每个端点
    for (const endpoint of availableEndpoints) {
      try {
        const instanceKey = `${endpoint.provider}-${endpoint.model}`;
        const llmInstance = this.llmInstances.get(instanceKey);
        
        if (!llmInstance) {
          logger.warn(`未找到LLM实例: ${instanceKey}`, 'EnhancedBaseLLM');
          continue;
        }

        logger.info(`尝试端点: ${instanceKey}`, 'EnhancedBaseLLM');
        const startTime = Date.now();
        
        const response = await llmInstance.generateResponse(messages, useStructuredOutput);
        const responseTime = Date.now() - startTime;

        // 更新成功统计
        const endpointId = this.getEndpointId(endpoint);
        this.manager.updateEndpointHealth(endpointId, true, responseTime);

        logger.info(`端点成功: ${instanceKey} (${responseTime}ms)`, 'EnhancedBaseLLM');
        return response;

      } catch (error) {
        lastError = error as Error;
        const endpointId = this.getEndpointId(endpoint);
        this.manager.updateEndpointHealth(endpointId, false);
        
        logger.warn(`端点失败: ${endpoint.provider}/${endpoint.model} - ${lastError.message}`, 'EnhancedBaseLLM');
      }
    }

    throw new Error(`所有端点都失败了，最后错误: ${lastError?.message}`);
  }

  /**
   * 🚫 回退模式（强制使用不健康的端点）
   */
  private async tryFallbackMode(messages: LLMMessage[], useStructuredOutput: boolean): Promise<LLMResponse> {
    logger.warn('进入回退模式，尝试使用所有端点（包括不健康的）', 'EnhancedBaseLLM');
    
    const allEndpoints = this.config.endpoints;
    let lastError: Error | null = null;
    
    for (const endpoint of allEndpoints) {
      try {
        const instanceKey = `${endpoint.provider}-${endpoint.model}`;
        const llmInstance = this.llmInstances.get(instanceKey);
        
        if (!llmInstance) {
          continue;
        }

        logger.warn(`回退模式尝试: ${instanceKey}`, 'EnhancedBaseLLM');
        const response = await llmInstance.generateResponse(messages, useStructuredOutput);
        
        logger.info(`回退模式成功: ${instanceKey}`, 'EnhancedBaseLLM');
        return response;

      } catch (error) {
        lastError = error as Error;
        logger.warn(`回退模式失败: ${endpoint.provider}/${endpoint.model}`, 'EnhancedBaseLLM');
      }
    }

    throw new Error(`回退模式也失败了，最后错误: ${lastError?.message}`);
  }

  /**
   * ⏱️ 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 🛑 销毁实例
   */
  destroy(): void {
    this.manager.destroy();
    this.llmInstances.clear();
    logger.info('EnhancedBaseLLM实例已销毁', 'EnhancedBaseLLM');
  }
}

/**
 * 🏭 工厂函数：创建增强版LLM实例
 */
export function createEnhancedLLM(config: LLMConfig): EnhancedBaseLLM {
  return new EnhancedBaseLLM(config);
}
