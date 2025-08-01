import OpenAI from 'openai';
import { BaseLLM, LLMMessage, LLMResponse } from './base';
import { LLMConfig } from '../types';
import { logger } from '../utils/logger';

// Google Gemini function schema for Agent response (OpenAI compatible)
const GOOGLE_AGENT_FUNCTION = {
  name: 'agent_response',
  description: 'Provide structured agent response with thinking, evaluation, memory, goal, tab decision and action',
  parameters: {
    type: 'object',
    properties: {
      thinking: {
        type: 'string',
        description: 'Agent\'s internal reasoning and thought process about the current situation'
      },
      evaluation_previous_goal: {
        type: 'string',
        description: 'Evaluation of the previous step/goal - whether it was successful, failed, or partially completed'
      },
      memory: {
        type: 'string',
        description: 'Important information to remember for future steps'
      },
      next_goal: {
        type: 'string',
        description: 'Clear description of what the agent plans to do next'
      },
      tab_decision: {
        type: 'object',
        properties: {
          should_switch: {
            type: 'boolean',
            description: 'Whether to switch to a different tab before performing the action'
          },
          target_tab_id: {
            type: 'string',
            description: 'ID of the tab to switch to (if should_switch is true)'
          },
          reason: {
            type: 'string',
            description: 'Reason for tab switching decision'
          }
        },
        required: ['should_switch', 'reason'],
        description: 'Decision about tab switching based on available tabs and current task'
      },
      action: {
        type: 'object',
        description: 'The specific action to execute',
        properties: {
          type: {
            type: 'string',
            enum: ['click', 'type', 'key', 'scroll', 'navigate', 'wait', 'done'],
            description: 'Type of action to perform'
          },
          index: {
            type: 'integer',
            description: 'Element index for click/type actions'
          },
          text: {
            type: 'string',
            description: 'Text to type for type actions'
          },
          key: {
            type: 'string',
            description: 'Key to press for key actions (e.g., "Enter", "Tab", "Escape")'
          },
          coordinate: {
            type: 'array',
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2,
            description: 'X,Y coordinates for scroll actions'
          },
          direction: {
            type: 'string',
            enum: ['up', 'down', 'left', 'right'],
            description: 'Direction for scroll actions'
          },
          url: {
            type: 'string',
            description: 'URL for navigate actions'
          },
          seconds: {
            type: 'number',
            description: 'Number of seconds to wait for wait actions'
          },
          success: {
            type: 'boolean',
            description: 'Whether the task was completed successfully for done actions'
          },
          message: {
            type: 'string',
            description: 'Completion message for done actions'
          }
        },
        required: ['type'],
        additionalProperties: false
      }
    },
    required: ['thinking', 'evaluation_previous_goal', 'memory', 'next_goal', 'tab_decision', 'action'],
    additionalProperties: false
  }
};

export class GoogleLLM extends BaseLLM {
  private client: OpenAI;

  constructor(config: LLMConfig) {
    super(config);

    // Use Google's OpenAI-compatible endpoint
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    });

    logger.info(`Using Google Gemini via OpenAI-compatible API`, 'GoogleLLM');
  }

  async generateResponse(messages: LLMMessage[], useStructuredOutput: boolean = false): Promise<LLMResponse> {
    try {
      logger.debug(`Sending request to Google Gemini with model: ${this.config.model}`, 'GoogleLLM');

      const openaiMessages = messages.map(msg => {
        if (msg.role === 'system') {
          return {
            role: 'system' as const,
            content: msg.content as string
          };
        } else if (msg.role === 'user') {
          if (typeof msg.content === 'string') {
            return {
              role: 'user' as const,
              content: msg.content
            };
          } else {
            // Handle array content (text + images)
            return {
              role: 'user' as const,
              content: msg.content.map(item => {
                if (item.type === 'text') {
                  return { type: 'text' as const, text: item.text || '' };
                } else {
                  return {
                    type: 'image_url' as const,
                    image_url: { url: item.image_url?.url || '' }
                  };
                }
              })
            };
          }
        } else {
          return {
            role: 'assistant' as const,
            content: msg.content as string
          };
        }
      });

      // Prepare request parameters
      const requestParams: any = {
        model: this.config.model,
        messages: openaiMessages,
        temperature: this.config.temperature || 0,
        // 🎯 使用配置中的maxTokens，支持特殊值-1表示不限制
        ...(this.config.maxTokens && this.config.maxTokens !== -1 && { max_tokens: this.config.maxTokens }),
      };

      // 🔍 记录token限制设置
      const tokenLimit = this.config.maxTokens === -1 ? '无限制' : (this.config.maxTokens || '默认');
      logger.info(`🎯 Token限制设置: ${tokenLimit}`, 'GoogleLLM');

      // Add function calling for structured output
      if (useStructuredOutput) {
        requestParams.tools = [{
          type: 'function',
          function: GOOGLE_AGENT_FUNCTION
        }];
        requestParams.tool_choice = {
          type: 'function',
          function: { name: 'agent_response' }
        };

        logger.debug('Using structured output with function calling', 'GoogleLLM');
      }

      const response = await this.client.chat.completions.create(requestParams);

      // 🔍 添加详细的API响应日志
      logger.info('📡 Google Gemini API完整响应:', 'GoogleLLM');
      logger.info(`📊 响应状态: ${JSON.stringify({
        choices_count: response.choices?.length || 0,
        usage: response.usage,
        model: response.model
      }, null, 2)}`, 'GoogleLLM');

      const choice = response.choices[0];
      if (!choice || !choice.message) {
        logger.error('❌ 无效的Google Gemini响应结构', new Error('Invalid response structure'), 'GoogleLLM');
        logger.info(`📋 完整响应数据: ${JSON.stringify(response, null, 2)}`, 'GoogleLLM');
        throw new Error('Invalid response from Google Gemini');
      }

      // 🔍 详细记录choice.message的结构
      logger.info('📝 Choice message结构:', 'GoogleLLM');
      logger.info(`📋 Message内容: ${JSON.stringify({
        role: choice.message.role,
        content: choice.message.content ? `${choice.message.content.substring(0, 200)}...` : null,
        tool_calls: choice.message.tool_calls ? choice.message.tool_calls.length : 0,
        tool_calls_detail: choice.message.tool_calls
      }, null, 2)}`, 'GoogleLLM');

      let content: string;

      // Handle function call response
      if (useStructuredOutput && choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        const toolCall = choice.message.tool_calls[0];

        // 🔍 详细记录tool_call的完整信息
        logger.info('🔧 Tool Call详细信息:', 'GoogleLLM');
        logger.info(`📋 Tool Call结构: ${JSON.stringify({
          id: toolCall.id,
          type: toolCall.type,
          function_name: toolCall.function?.name,
          arguments_length: toolCall.function?.arguments?.length || 0,
          arguments_preview: toolCall.function?.arguments?.substring(0, 500) || 'null'
        }, null, 2)}`, 'GoogleLLM');

        if (toolCall.function && toolCall.function.name === 'agent_response') {
          content = toolCall.function.arguments;
          logger.info(`✅ 提取到function arguments，长度: ${content.length}`, 'GoogleLLM');
          logger.info(`📝 Arguments完整内容: ${content}`, 'GoogleLLM');
        } else {
          logger.error(`❌ 意外的function call: ${toolCall.function?.name}`, new Error('Unexpected function call'), 'GoogleLLM');
          throw new Error('Unexpected function call in response');
        }
      } else if (choice.message.content) {
        content = choice.message.content;
        logger.info('📝 使用常规content响应', 'GoogleLLM');
      } else {
        logger.error('❌ Google Gemini响应中没有内容', new Error('No content in response'), 'GoogleLLM');
        throw new Error('No content in Google Gemini response');
      }

      const usage = response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined;

      logger.debug(`Google Gemini response received, tokens: ${usage?.totalTokens || 'unknown'}`, 'GoogleLLM');

      return {
        content,
        usage,
      };
    } catch (error) {
      logger.error('Google Gemini API request failed', error as Error, 'GoogleLLM');
      throw error;
    }
  }

}
