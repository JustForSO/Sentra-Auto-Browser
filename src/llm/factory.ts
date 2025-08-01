import { LLMConfig } from '../types';
import { BaseLLM } from './base';
import { OpenAILLM } from './openai';
import { AnthropicLLM } from './anthropic';
import { GoogleLLM } from './google';
import { logger } from '../utils/logger';

// LLM 工厂类 - 负责创建不同的语言模型实例
export class LLMFactory {
  static createLLM(config: LLMConfig): BaseLLM {
    logger.info(`正在创建 LLM 实例: ${config.provider} - ${config.model}`, 'LLMFactory');

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

  static validateConfig(config: LLMConfig): void {
    if (!config.apiKey) {
      throw new Error(`API key is required for ${config.provider}`);
    }

    if (!config.model) {
      throw new Error(`Model is required for ${config.provider}`);
    }

    // Validate model names for each provider
    switch (config.provider) {
      case 'openai':
        if (!config.model.startsWith('gpt-')) {
          logger.warn(`Unusual OpenAI model name: ${config.model}`, 'LLMFactory');
        }
        break;
      case 'anthropic':
        if (!config.model.startsWith('claude-')) {
          logger.warn(`Unusual Anthropic model name: ${config.model}`, 'LLMFactory');
        }
        break;
      case 'google':
        if (!config.model.startsWith('gemini-')) {
          logger.warn(`Unusual Google model name: ${config.model}`, 'LLMFactory');
        }
        break;
    }

    logger.debug(`LLM config validated for ${config.provider}`, 'LLMFactory');
  }
}

export { BaseLLM } from './base';
export { OpenAILLM } from './openai';
export { AnthropicLLM } from './anthropic';
export { GoogleLLM } from './google';
