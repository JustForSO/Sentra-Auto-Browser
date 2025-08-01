import Anthropic from '@anthropic-ai/sdk';
import { BaseLLM, LLMMessage, LLMResponse } from './base';
import { LLMConfig } from '../types';
import { logger } from '../utils/logger';

// Anthropic tool schema for Agent response
const ANTHROPIC_AGENT_TOOL = {
  name: 'agent_response',
  description: 'Provide structured agent response with thinking, evaluation, memory, goal and action',
  input_schema: {
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
    required: ['thinking', 'evaluation_previous_goal', 'memory', 'next_goal', 'action'],
    additionalProperties: false
  }
};

export class AnthropicLLM extends BaseLLM {
  private client: Anthropic;

  constructor(config: LLMConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  async generateResponse(messages: LLMMessage[], useStructuredOutput: boolean = false): Promise<LLMResponse> {
    try {
      logger.debug(`Sending request to Anthropic with model: ${this.config.model}`, 'AnthropicLLM');

      // Separate system message from other messages
      const systemMessage = messages.find(msg => msg.role === 'system');
      const otherMessages = messages.filter(msg => msg.role !== 'system');

      // Prepare request parameters
      const requestParams: any = {
        model: this.config.model,
        // 🎯 使用配置中的maxTokens，支持特殊值-1表示不限制，Anthropic需要max_tokens参数
        max_tokens: this.config.maxTokens && this.config.maxTokens !== -1 ? this.config.maxTokens : 4000,
        temperature: this.config.temperature || 0,
        system: systemMessage?.content as string || '',
        messages: otherMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: this.formatContent(msg.content)
        })),
      };

      // Add tool use for structured output
      if (useStructuredOutput) {
        requestParams.tools = [ANTHROPIC_AGENT_TOOL];
        requestParams.tool_choice = { type: 'tool', name: 'agent_response' };

        logger.debug('Using structured output with tool use', 'AnthropicLLM');
      }

      const response = await this.client.messages.create(requestParams);

      if (!response.content || response.content.length === 0) {
        throw new Error('Invalid response from Anthropic');
      }

      let content: string;

      // Handle tool use response
      if (useStructuredOutput) {
        const toolUse = response.content.find(block => block.type === 'tool_use');
        if (toolUse && 'input' in toolUse && toolUse.name === 'agent_response') {
          content = JSON.stringify(toolUse.input);
          logger.debug('Received structured tool use response', 'AnthropicLLM');
        } else {
          throw new Error('Expected tool use response but got different content');
        }
      } else {
        const textContent = response.content.find(block => block.type === 'text');
        if (!textContent || !('text' in textContent)) {
          throw new Error('No text content in Anthropic response');
        }
        content = textContent.text;
      }

      const usage = response.usage ? {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      } : undefined;

      logger.debug(`Anthropic response received, tokens: ${usage?.totalTokens || 'unknown'}`, 'AnthropicLLM');

      return {
        content,
        usage,
      };
    } catch (error) {
      logger.error('Anthropic API request failed', error as Error, 'AnthropicLLM');
      throw error;
    }
  }

  private formatContent(content: string | Array<any>): any {
    if (typeof content === 'string') {
      return content;
    }

    // Handle array content (text + images)
    return content.map(item => {
      if (item.type === 'text') {
        return {
          type: 'text',
          text: item.text
        };
      } else if (item.type === 'image_url') {
        // Convert OpenAI format to Anthropic format
        const base64Data = item.image_url.url.replace('data:image/png;base64,', '');
        return {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: base64Data
          }
        };
      }
      return item;
    });
  }
}
