import OpenAI from 'openai';
import { BaseLLM, LLMMessage, LLMResponse } from './base';
import { LLMConfig } from '../types';
import { logger } from '../utils/logger';

// Function schema for Agent response to ensure structured JSON output
const AGENT_RESPONSE_FUNCTION = {
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
            enum: ['click', 'type', 'key', 'scroll', 'navigate', 'wait', 'done', 'key_press'],
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

export class OpenAILLM extends BaseLLM {
  private client: OpenAI;

  constructor(config: LLMConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL || 'https://api.openai.com/v1',
    });

    // Log the base URL for debugging
    if (config.baseURL && config.baseURL !== 'https://api.openai.com/v1') {
      logger.info(`Using custom OpenAI-compatible API: ${config.baseURL}`, 'OpenAILLM');
    }
  }

  async generateResponse(messages: LLMMessage[], useStructuredOutput: boolean = false): Promise<LLMResponse> {
    try {
      logger.debug(`Sending request to OpenAI with model: ${this.config.model}`, 'OpenAILLM');

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

      // Add function calling for structured output
      if (useStructuredOutput) {
        requestParams.tools = [{
          type: 'function',
          function: AGENT_RESPONSE_FUNCTION
        }];
        requestParams.tool_choice = {
          type: 'function',
          function: { name: 'agent_response' }
        };

        logger.debug('Using structured output with function calling', 'OpenAILLM');
      }

      const response = await this.client.chat.completions.create(requestParams);

      const choice = response.choices[0];
      if (!choice || !choice.message) {
        throw new Error('Invalid response from OpenAI');
      }

      let content: string;

      // Handle function call response
      if (useStructuredOutput && choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        const toolCall = choice.message.tool_calls[0];
        if (toolCall.function && toolCall.function.name === 'agent_response') {
          content = toolCall.function.arguments;
          logger.debug('Received structured function call response', 'OpenAILLM');
        } else {
          throw new Error('Unexpected function call in response');
        }
      } else if (choice.message.content) {
        content = choice.message.content;
      } else {
        throw new Error('No content in OpenAI response');
      }

      const usage = response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined;

      logger.debug(`OpenAI response received, tokens: ${usage?.totalTokens || 'unknown'}`, 'OpenAILLM');

      return {
        content,
        usage,
      };
    } catch (error) {
      logger.error('OpenAI API request failed', error as Error, 'OpenAILLM');
      throw error;
    }
  }
}
