import { LLMConfig, LLMEndpoint } from '../types';
import { BaseLLM } from './base';
import { OpenAILLM } from './openai';
import { AnthropicLLM } from './anthropic';
import { GoogleLLM } from './google';
import { EnhancedBaseLLM, createEnhancedLLM } from './enhanced-base';
import { MultiProviderLLMManager } from './manager';
import { logger } from '../utils/logger';

/**
 * 🏭 增强版LLM工厂类
 * 
 * 支持两种模式：
 * 1. 传统单一供应商模式（向后兼容）
 * 2. 新的多供应商智能管理模式
 */
export class LLMFactory {
  /**
   * 🤖 创建LLM实例（智能检测配置类型）
   */
  static createLLM(config: LLMConfig): BaseLLM | EnhancedBaseLLM {
    // 检测是否为新的多供应商配置
    if (config.endpoints && config.endpoints.length > 0) {
      logger.info(`创建增强版多供应商LLM实例，包含 ${config.endpoints.length} 个端点，策略: ${config.strategy}`, 'LLMFactory');
      return createEnhancedLLM(config);
    }
    
    // 检测是否为传统单一供应商配置
    if (config.provider && config.apiKey && config.model) {
      logger.info(`创建传统单一供应商LLM实例: ${config.provider} - ${config.model}`, 'LLMFactory');
      return this.createLegacyLLM(config);
    }
    
    throw new Error('无效的LLM配置：既不是多供应商配置也不是单一供应商配置');
  }
  
  /**
   * 🔄 创建传统单一供应商LLM实例（向后兼容）
   */
  private static createLegacyLLM(config: LLMConfig): BaseLLM {
    if (!config.provider) {
      throw new Error('传统配置模式下provider是必需的');
    }
    
    switch (config.provider) {
      case 'openai':
        return new OpenAILLM(config);
      case 'anthropic':
        return new AnthropicLLM(config);
      case 'google':
        return new GoogleLLM(config);
      default:
        throw new Error(`不支持的 LLM 提供商: ${config.provider}`);
    }
  }

  /**
   * ✅ 验证LLM配置（支持多供应商和单一供应商）
   */
  static validateConfig(config: LLMConfig): void {
    // 验证多供应商配置
    if (config.endpoints && config.endpoints.length > 0) {
      this.validateMultiProviderConfig(config);
      return;
    }
    
    // 验证传统单一供应商配置
    if (config.provider) {
      this.validateLegacyConfig(config);
      return;
    }
    
    throw new Error('无效的LLM配置：必须提供endpoints或provider配置');
  }
  
  /**
   * ✅ 验证多供应商配置
   */
  private static validateMultiProviderConfig(config: LLMConfig): void {
    if (!config.strategy) {
      throw new Error('多供应商配置必须指定strategy');
    }
    
    if (!config.endpoints || config.endpoints.length === 0) {
      throw new Error('多供应商配置必须包含至少一个endpoint');
    }
    
    // 验证每个端点
    config.endpoints.forEach((endpoint, index) => {
      this.validateEndpoint(endpoint, index);
    });
    
    logger.debug(`多供应商LLM配置验证通过，包含 ${config.endpoints.length} 个端点`, 'LLMFactory');
  }
  
  /**
   * ✅ 验证单个端点配置
   */
  private static validateEndpoint(endpoint: LLMEndpoint, index: number): void {
    if (!endpoint.apiKey) {
      throw new Error(`端点 ${index} 缺少API密钥`);
    }
    
    if (!endpoint.model) {
      throw new Error(`端点 ${index} 缺少模型名称`);
    }
    
    if (!endpoint.provider) {
      throw new Error(`端点 ${index} 缺少供应商信息`);
    }
    
    // 验证供应商特定的模型名称
    this.validateModelName(endpoint.provider, endpoint.model, index);
  }
  
  /**
   * ✅ 验证传统单一供应商配置
   */
  private static validateLegacyConfig(config: LLMConfig): void {
    if (!config.apiKey) {
      throw new Error(`API key is required for ${config.provider}`);
    }

    if (!config.model) {
      throw new Error(`Model is required for ${config.provider}`);
    }

    if (!config.provider) {
      throw new Error('Provider is required for legacy config');
    }
    
    this.validateModelName(config.provider, config.model);
    logger.debug(`传统LLM配置验证通过: ${config.provider}`, 'LLMFactory');
  }
  
  /**
   * ✅ 验证模型名称
   */
  private static validateModelName(provider: string, model: string, endpointIndex?: number): void {
    const prefix = endpointIndex !== undefined ? `端点 ${endpointIndex} ` : '';
    
    switch (provider) {
      case 'openai':
        if (!model.startsWith('gpt-') && !model.includes('turbo') && !model.includes('davinci')) {
          logger.warn(`${prefix}可能的OpenAI模型名称异常: ${model}`, 'LLMFactory');
        }
        break;
      case 'anthropic':
        if (!model.startsWith('claude-')) {
          logger.warn(`${prefix}可能的Anthropic模型名称异常: ${model}`, 'LLMFactory');
        }
        break;
      case 'google':
        if (!model.startsWith('gemini-')) {
          logger.warn(`${prefix}可能的Google模型名称异常: ${model}`, 'LLMFactory');
        }
        break;
      default:
        logger.warn(`${prefix}未知的供应商: ${provider}`, 'LLMFactory');
    }
  }
  
  /**
   * 📊 获取支持的供应商列表
   */
  static getSupportedProviders(): string[] {
    return ['openai', 'anthropic', 'google'];
  }
  
  /**
   * 📊 获取支持的策略列表
   */
  static getSupportedStrategies(): string[] {
    return ['round_robin', 'priority', 'load_balance', 'failover', 'random'];
  }
}

export { BaseLLM } from './base';
export { OpenAILLM } from './openai';
export { AnthropicLLM } from './anthropic';
export { GoogleLLM } from './google';
