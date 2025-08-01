import { BrowserSession } from '../browser/session';
import { Controller } from '../controller/service';
import { ErrorRecoveryStrategy, ActionContext, ActionResult, Action } from '../types';
import { logger } from '../utils/logger';
import { Helpers } from '../utils/helpers';

export class ErrorRecoveryService {
  private browserSession: BrowserSession;
  private controller: Controller;
  private strategies: ErrorRecoveryStrategy[];

  constructor(browserSession: BrowserSession, controller: Controller) {
    this.browserSession = browserSession;
    this.controller = controller;
    this.strategies = this.getDefaultStrategies();
  }

  async handleError(
    error: Error,
    context: ActionContext,
    originalAction: Action
  ): Promise<ActionResult> {
    logger.warn(`Handling error: ${error.message}`, 'ErrorRecoveryService');

    // Find applicable strategies
    const applicableStrategies = this.strategies.filter(strategy => 
      !strategy.condition || strategy.condition(error, context)
    );

    if (applicableStrategies.length === 0) {
      logger.error('No applicable recovery strategies found', undefined, 'ErrorRecoveryService');
      return {
        success: false,
        error: `No recovery strategy available for: ${error.message}`,
        message: 'Error recovery failed - no applicable strategies',
      };
    }

    // Try strategies in order
    for (const strategy of applicableStrategies) {
      if (context.retryCount >= strategy.maxAttempts) {
        logger.debug(`Strategy ${strategy.type} exhausted (${context.retryCount}/${strategy.maxAttempts})`, 'ErrorRecoveryService');
        continue;
      }

      try {
        logger.info(`Attempting recovery strategy: ${strategy.type}`, 'ErrorRecoveryService');
        
        const result = await this.executeStrategy(strategy, error, context, originalAction);
        
        if (result.success) {
          logger.success(`Recovery strategy ${strategy.type} succeeded`, 'ErrorRecoveryService');
          return result;
        } else {
          logger.warn(`Recovery strategy ${strategy.type} failed: ${result.error}`, 'ErrorRecoveryService');
        }
      } catch (strategyError) {
        logger.error(`Recovery strategy ${strategy.type} threw error`, strategyError as Error, 'ErrorRecoveryService');
      }

      // Wait before trying next strategy
      if (strategy.delay > 0) {
        await Helpers.sleep(strategy.delay);
      }
    }

    return {
      success: false,
      error: `All recovery strategies failed for: ${error.message}`,
      message: 'Error recovery exhausted all strategies',
    };
  }

  addStrategy(strategy: ErrorRecoveryStrategy): void {
    this.strategies.push(strategy);
    logger.debug(`Added custom recovery strategy: ${strategy.type}`, 'ErrorRecoveryService');
  }

  removeStrategy(type: string): void {
    this.strategies = this.strategies.filter(s => s.type !== type);
    logger.debug(`Removed recovery strategy: ${type}`, 'ErrorRecoveryService');
  }

  private async executeStrategy(
    strategy: ErrorRecoveryStrategy,
    error: Error,
    context: ActionContext,
    originalAction: Action
  ): Promise<ActionResult> {
    switch (strategy.type) {
      case 'retry':
        return this.retryAction(originalAction, context);
      
      case 'alternative_action':
        return this.tryAlternativeAction(originalAction, context);
      
      case 'skip':
        return this.skipAction(originalAction, context);
      
      case 'restart_browser':
        return this.restartBrowser(originalAction, context);
      
      case 'custom':
        if (strategy.customHandler) {
          return strategy.customHandler(error, context);
        }
        throw new Error('Custom strategy missing handler');
      
      default:
        throw new Error(`Unknown recovery strategy: ${strategy.type}`);
    }
  }

  private async retryAction(action: Action, context: ActionContext): Promise<ActionResult> {
    logger.info(`Retrying action: ${action.type}`, 'ErrorRecoveryService');
    
    // Wait a bit before retry
    await Helpers.sleep(1000);
    
    // Refresh DOM state
    const currentState = await this.controller.getCurrentState();
    
    // Try the action again
    return this.controller.executeAction(action);
  }

  private async tryAlternativeAction(action: Action, context: ActionContext): Promise<ActionResult> {
    logger.info(`Trying alternative for action: ${action.type}`, 'ErrorRecoveryService');
    
    const alternative = await this.generateAlternativeAction(action, context);
    
    if (!alternative) {
      return {
        success: false,
        error: 'No alternative action available',
        message: 'Could not generate alternative action',
      };
    }

    logger.info(`Executing alternative action: ${alternative.type}`, 'ErrorRecoveryService');
    return this.controller.executeAction(alternative);
  }

  private async skipAction(action: Action, context: ActionContext): Promise<ActionResult> {
    logger.info(`Skipping action: ${action.type}`, 'ErrorRecoveryService');
    
    return {
      success: true,
      message: `Skipped ${action.type} action due to error`,
      extractedContent: `Action ${action.type} was skipped`,
    };
  }

  private async restartBrowser(action: Action, context: ActionContext): Promise<ActionResult> {
    logger.warn('Restarting browser for error recovery', 'ErrorRecoveryService');
    
    try {
      // Close current browser
      await this.browserSession.close();
      
      // Wait a bit
      await Helpers.sleep(2000);
      
      // Start new browser session
      await this.browserSession.start();
      
      // Navigate back to the last known URL if available
      if (context.currentDOMState.url) {
        await this.browserSession.navigate(context.currentDOMState.url);
      }
      
      // Try the original action
      return this.controller.executeAction(action);
    } catch (error) {
      return {
        success: false,
        error: `Browser restart failed: ${error instanceof Error ? error.message : String(error)}`,
        message: 'Failed to restart browser',
      };
    }
  }

  private async generateAlternativeAction(action: Action, context: ActionContext): Promise<Action | null> {
    switch (action.type) {
      case 'click':
        // Try using xpath instead of index
        if ('index' in action) {
          const element = context.currentDOMState.elements[action.index as number];
          if (element && element.xpath) {
            return {
              type: 'click',
              index: action.index as number,
              xpath: element.xpath,
            };
          }
        }
        
        // Try key press alternative
        return {
          type: 'key_press',
          key: 'Enter',
        };
      
      case 'type':
        // Try using xpath instead of index
        if ('index' in action && 'text' in action) {
          const element = context.currentDOMState.elements[action.index as number];
          if (element && element.xpath) {
            return {
              type: 'type',
              index: action.index as number,
              text: action.text as string,
              xpath: element.xpath,
            };
          }
        }
        break;
      
      case 'navigate':
        // Try refreshing current page instead
        return {
          type: 'refresh',
        };
      
      case 'scroll':
        // Try opposite direction
        if ('direction' in action) {
          return {
            type: 'scroll',
            direction: action.direction === 'up' ? 'down' : 'up',
          };
        }
        break;
    }
    
    return null;
  }

  private getDefaultStrategies(): ErrorRecoveryStrategy[] {
    return [
      // Retry strategy for temporary failures
      {
        type: 'retry',
        maxAttempts: 3,
        delay: 1000,
        condition: (error) => {
          const message = error.message.toLowerCase();
          return message.includes('timeout') || 
                 message.includes('network') || 
                 message.includes('temporary');
        },
      },
      
      // Alternative action for element not found
      {
        type: 'alternative_action',
        maxAttempts: 2,
        delay: 500,
        condition: (error) => {
          const message = error.message.toLowerCase();
          return message.includes('element') && 
                 (message.includes('not found') || message.includes('not visible'));
        },
      },
      
      // Skip for non-critical failures
      {
        type: 'skip',
        maxAttempts: 1,
        delay: 0,
        condition: (error, context) => {
          const message = error.message.toLowerCase();
          const isNonCritical = message.includes('optional') || 
                               message.includes('advertisement') ||
                               message.includes('popup');
          
          // Only skip if we're not in the first few steps
          return isNonCritical && context.stepNumber > 3;
        },
      },
      
      // Browser restart for critical failures
      {
        type: 'restart_browser',
        maxAttempts: 1,
        delay: 2000,
        condition: (error) => {
          const message = error.message.toLowerCase();
          return message.includes('browser') && 
                 (message.includes('crashed') || 
                  message.includes('disconnected') || 
                  message.includes('closed'));
        },
      },
      
      // General retry as last resort
      {
        type: 'retry',
        maxAttempts: 1,
        delay: 2000,
        condition: () => true, // Catch-all
      },
    ];
  }
}
