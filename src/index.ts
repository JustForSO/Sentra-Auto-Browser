// Main exports for the browser-use-nodejs library

export { Agent } from './agent/service';
export { BrowserSession } from './browser/session';
export { Controller } from './controller/service';
export { DOMService } from './dom/service';

// Enhanced browser components
export { MasterController } from './browser/master-controller';
export { PageStateMonitor } from './browser/page-state-monitor';
export { SmartTabManager } from './browser/smart-tab-manager';
export { EnhancedDOMDetector } from './browser/enhanced-dom-detector';
export { EnhancedKeyHandler } from './browser/enhanced-key-handler';

export { LLMFactory, BaseLLM, OpenAILLM, AnthropicLLM, GoogleLLM } from './llm/factory';

export { MemoryService } from './memory/service';
export { PlanningService } from './planning/service';
export { ReflectionService } from './reflection/service';
export { ErrorRecoveryService } from './recovery/service';
export { PerformanceMonitoringService } from './monitoring/service';

export { logger } from './utils/logger';
export { Validator } from './utils/validation';
export { Helpers } from './utils/helpers';
export { default as Config } from './config';

export * from './types';

// Re-export for convenience
export {
  BrowserProfile,
  ActionResult,
  AgentSettings,
  LLMConfig,
  DOMElement,
  DOMState,
  Action,
  ClickAction,
  TypeAction,
  NavigateAction,
  ScrollAction,
  WaitAction,
  DoneAction,
  AgentStep,
  AgentHistory,
} from './types';
