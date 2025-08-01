import { Action, LLMConfig, BrowserProfile, AgentSettings } from '../types';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class Validator {
  static validateAction(action: any): action is Action {
    if (!action || typeof action !== 'object') {
      throw new ValidationError('Action must be an object');
    }

    if (!action.type || typeof action.type !== 'string') {
      throw new ValidationError('Action must have a type string');
    }

    const validTypes = ['click', 'type', 'navigate', 'scroll', 'wait', 'done'];
    if (!validTypes.includes(action.type)) {
      throw new ValidationError(`Invalid action type: ${action.type}. Valid types: ${validTypes.join(', ')}`);
    }

    switch (action.type) {
      case 'click':
        if (typeof action.index !== 'number' || action.index < 0) {
          throw new ValidationError('Click action requires a non-negative numeric index');
        }
        if (action.xpath && typeof action.xpath !== 'string') {
          throw new ValidationError('Click action xpath must be a string if provided');
        }
        break;

      case 'type':
        if (typeof action.index !== 'number' || action.index < 0) {
          throw new ValidationError('Type action requires a non-negative numeric index');
        }
        if (typeof action.text !== 'string') {
          throw new ValidationError('Type action requires a text string');
        }
        if (action.xpath && typeof action.xpath !== 'string') {
          throw new ValidationError('Type action xpath must be a string if provided');
        }
        break;

      case 'navigate':
        if (typeof action.url !== 'string') {
          throw new ValidationError('Navigate action requires a url string');
        }
        if (!this.isValidUrl(action.url)) {
          throw new ValidationError('Navigate action requires a valid URL');
        }
        break;

      case 'scroll':
        if (!['up', 'down'].includes(action.direction)) {
          throw new ValidationError('Scroll action requires direction "up" or "down"');
        }
        if (action.amount !== undefined && (typeof action.amount !== 'number' || action.amount <= 0)) {
          throw new ValidationError('Scroll action amount must be a positive number if provided');
        }
        break;

      case 'wait':
        if (typeof action.seconds !== 'number' || action.seconds <= 0) {
          throw new ValidationError('Wait action requires a positive number of seconds');
        }
        if (action.seconds > 60) {
          throw new ValidationError('Wait action cannot exceed 60 seconds');
        }
        break;

      case 'done':
        if (typeof action.message !== 'string') {
          throw new ValidationError('Done action requires a message string');
        }
        if (typeof action.success !== 'boolean') {
          throw new ValidationError('Done action requires a success boolean');
        }
        break;
    }

    return true;
  }

  static validateLLMConfig(config: LLMConfig): void {
    if (!config.provider) {
      throw new ValidationError('LLM provider is required');
    }

    const validProviders = ['openai', 'anthropic', 'google'];
    if (!validProviders.includes(config.provider)) {
      throw new ValidationError(`Invalid LLM provider: ${config.provider}. Valid providers: ${validProviders.join(', ')}`);
    }

    if (!config.model || typeof config.model !== 'string') {
      throw new ValidationError('LLM model is required and must be a string');
    }

    if (!config.apiKey || typeof config.apiKey !== 'string') {
      throw new ValidationError('LLM API key is required and must be a string');
    }

    if (config.temperature !== undefined) {
      if (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2) {
        throw new ValidationError('LLM temperature must be a number between 0 and 2');
      }
    }
  }

  static validateBrowserProfile(profile: BrowserProfile): void {
    if (profile.headless !== undefined && typeof profile.headless !== 'boolean') {
      throw new ValidationError('Browser headless setting must be a boolean');
    }

    if (profile.viewport) {
      if (typeof profile.viewport !== 'object') {
        throw new ValidationError('Browser viewport must be an object');
      }
      if (typeof profile.viewport.width !== 'number' || profile.viewport.width <= 0) {
        throw new ValidationError('Browser viewport width must be a positive number');
      }
      if (typeof profile.viewport.height !== 'number' || profile.viewport.height <= 0) {
        throw new ValidationError('Browser viewport height must be a positive number');
      }
    }

    if (profile.userDataDir !== undefined && typeof profile.userDataDir !== 'string') {
      throw new ValidationError('Browser userDataDir must be a string');
    }

    if (profile.executablePath !== undefined && typeof profile.executablePath !== 'string') {
      throw new ValidationError('Browser executablePath must be a string');
    }

    if (profile.timeout !== undefined) {
      if (typeof profile.timeout !== 'number' || profile.timeout <= 0) {
        throw new ValidationError('Browser timeout must be a positive number');
      }
    }
  }

  static validateAgentSettings(settings: AgentSettings): void {
    if (settings.maxSteps !== undefined) {
      if (typeof settings.maxSteps !== 'number' || settings.maxSteps <= 0) {
        throw new ValidationError('Agent maxSteps must be a positive number');
      }
      if (settings.maxSteps > 1000) {
        throw new ValidationError('Agent maxSteps cannot exceed 1000');
      }
    }

    if (settings.maxActionsPerStep !== undefined) {
      if (typeof settings.maxActionsPerStep !== 'number' || settings.maxActionsPerStep <= 0) {
        throw new ValidationError('Agent maxActionsPerStep must be a positive number');
      }
      if (settings.maxActionsPerStep > 10) {
        throw new ValidationError('Agent maxActionsPerStep cannot exceed 10');
      }
    }

    if (settings.useVision !== undefined && typeof settings.useVision !== 'boolean') {
      throw new ValidationError('Agent useVision setting must be a boolean');
    }

    if (settings.temperature !== undefined) {
      if (typeof settings.temperature !== 'number' || settings.temperature < 0 || settings.temperature > 2) {
        throw new ValidationError('Agent temperature must be a number between 0 and 2');
      }
    }
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static sanitizeText(text: string): string {
    // Remove potentially dangerous characters
    return text.replace(/[<>\"'&]/g, '');
  }

  static validateElementIndex(index: number, maxIndex: number): void {
    if (typeof index !== 'number' || index < 0) {
      throw new ValidationError('Element index must be a non-negative number');
    }
    if (index >= maxIndex) {
      throw new ValidationError(`Element index ${index} is out of range (max: ${maxIndex - 1})`);
    }
  }
}
