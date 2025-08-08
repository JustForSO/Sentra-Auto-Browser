// Core types for the browser-use-nodejs project

export interface BrowserProfile {
  headless?: boolean;
  viewport?: { width: number; height: number };
  userDataDir?: string;
  executablePath?: string;
  timeout?: number;
  slowMo?: number;
  devtools?: boolean;
  args?: string[];
  ignoreHTTPSErrors?: boolean;
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
  locale?: string;
  timezone?: string;
  geolocation?: { latitude: number; longitude: number };
  permissions?: string[];
  extraHTTPHeaders?: Record<string, string>;
  userAgent?: string;
  colorScheme?: 'light' | 'dark' | 'no-preference';
  reducedMotion?: 'reduce' | 'no-preference';
  forcedColors?: 'active' | 'none';
  autoInstall?: boolean;
  // 下载配置
  acceptDownloads?: boolean;
  downloadsPath?: string;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  extractedContent?: string;
  screenshot?: string;
  navigationDetected?: boolean; // Flag to indicate navigation occurred during action
  metadata?: {
    duration: number;
    timestamp: Date;
    url: string;
    title: string;
    elementCount?: number;
    retryCount?: number;
  };
}

export interface AgentSettings {
  maxSteps?: number;
  maxActionsPerStep?: number;
  useVision?: boolean;
  temperature?: number;
  retryFailedActions?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  enableMemory?: boolean;
  memorySize?: number;
  enablePlanning?: boolean;
  planningSteps?: number;
  enableReflection?: boolean;
  reflectionInterval?: number;
  enableErrorRecovery?: boolean;
  errorRecoveryStrategies?: ErrorRecoveryStrategy[];
  enablePerformanceMonitoring?: boolean;
  enableScreenshotOnError?: boolean;
  enableActionValidation?: boolean;
  enableLoopDetection?: boolean;
  maxConsecutiveFailures?: number;
  maxSimilarActions?: number;
  enablePlugins?: boolean;
  customPrompts?: {
    systemPrompt?: string;
    planningPrompt?: string;
    reflectionPrompt?: string;
    errorRecoveryPrompt?: string;
  };
}

// Enhanced agent state for better tracking
export interface AgentState {
  agentId: string;
  sessionId: string;
  stepNumber: number;
  consecutiveFailures: number;
  lastResult?: ActionResult;
  lastGoal?: string;
  currentGoal?: string;
  memory: string[];
  paused: boolean;
  stopped: boolean;
  startTime: Date;
  lastActionType?: string;
  lastActionTarget?: string;
  similarActionCount: number;
}

// ===========================================
// 🤖 多供应商LLM配置类型定义
// ===========================================

/**
 * LLM使用策略枚举
 */
export type LLMStrategy = 
  | 'round_robin'   // 轮询使用所有可用的API
  | 'priority'      // 按优先级顺序使用（第一个可用的）
  | 'load_balance'  // 基于响应时间的负载均衡
  | 'failover'      // 故障转移，主API失败时切换到备用
  | 'random';       // 随机选择可用的API

/**
 * 单个API端点配置
 */
export interface LLMEndpoint {
  provider: 'openai' | 'anthropic' | 'google';
  apiKey: string;
  baseURL?: string;
  model: string;
  priority?: number;    // 优先级，数字越小优先级越高
  weight?: number;      // 权重，用于负载均衡
  enabled?: boolean;    // 是否启用
  maxRetries?: number;  // 最大重试次数
  timeout?: number;     // 请求超时时间
  rateLimit?: {
    requests: number;   // 每分钟请求数限制
    tokens: number;     // 每分钟token数限制
  };
  healthCheck?: {
    lastCheck?: Date;   // 上次健康检查时间
    status: 'healthy' | 'unhealthy' | 'unknown'; // 健康状态
    responseTime?: number; // 平均响应时间
    errorCount?: number;   // 错误计数
  };
}

/**
 * 用户控制选项
 */
export interface LLMUserControl {
  disableHealthCheck?: boolean;    // 禁用健康检查
  alwaysRetryAll?: boolean;        // 总是重试所有端点
  enableFallbackMode?: boolean;    // 启用回退模式
  strictMode?: boolean;            // 严格模式（遇到错误立即停止）
  debugMode?: boolean;             // 调试模式（输出详细日志）
  neverDisableEndpoints?: boolean; // 从不禁用端点
  roundRobinResetInterval?: number; // 轮询重置间隔
}

/**
 * 多供应商LLM配置
 */
export interface LLMConfig {
  // 使用策略
  strategy: LLMStrategy;
  
  // 所有可用的API端点
  endpoints: LLMEndpoint[];
  
  // 全局配置
  temperature?: number;
  maxTokens?: number;
  
  // 重试配置
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  
  // 负载均衡配置
  loadBalance?: {
    window: number;           // 统计窗口大小
    healthCheckInterval: number; // 健康检查间隔
    failureThreshold: number;    // 失败阈值
    recoveryThreshold: number;   // 恢复阈值
  };
  
  // 🔧 用户控制选项
  userControl?: LLMUserControl;
  
  // 向后兼容的单一配置
  provider?: 'openai' | 'anthropic' | 'google';
  model?: string;
  apiKey?: string;
  baseURL?: string;
}

/**
 * LLM请求统计信息
 */
export interface LLMStats {
  endpointId: string;
  provider: string;
  requestCount: number;
  successCount: number;
  errorCount: number;
  totalResponseTime: number;
  averageResponseTime: number;
  lastUsed: Date;
  tokensUsed: number;
}

/**
 * LLM管理器接口
 */
export interface LLMManager {
  // 获取可用的端点
  getAvailableEndpoints(): LLMEndpoint[];
  
  // 根据策略选择端点
  selectEndpoint(strategy?: LLMStrategy): LLMEndpoint | null;
  
  // 健康检查
  healthCheck(endpoint: LLMEndpoint): Promise<boolean>;
  
  // 更新端点状态
  updateEndpointHealth(endpointId: string, isHealthy: boolean, responseTime?: number): void;
  
  // 获取统计信息
  getStats(): LLMStats[];
  
  // 重置统计信息
  resetStats(): void;
}

export interface DOMElement {
  index: number;
  tag: string;
  text?: string;
  attributes: Record<string, string>;
  xpath: string;
  isClickable: boolean;
  isVisible: boolean;
}

export interface DOMState {
  elements: DOMElement[];
  url: string;
  title: string;
  screenshot?: string;
}

// Action types
export interface ClickAction {
  type: 'click';
  index: number;
  xpath?: string;
}

export interface TypeAction {
  type: 'type';
  index: number;
  text: string;
  xpath?: string;
}

export interface NavigateAction {
  type: 'navigate';
  url: string;
}

export interface ScrollAction {
  type: 'scroll';
  direction: 'up' | 'down';
  amount?: number;
}

export interface WaitAction {
  type: 'wait';
  seconds: number;
}

export interface DoneAction {
  type: 'done';
  message: string;
  success: boolean;
}

// Extended action types
export interface HoverAction {
  type: 'hover';
  index: number;
  xpath?: string;
}

export interface DragDropAction {
  type: 'drag_drop';
  sourceIndex: number;
  targetIndex: number;
  sourceXpath?: string;
  targetXpath?: string;
}

export interface KeyAction {
  type: 'key';
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
}

export interface KeyPressAction {
  type: 'key_press';
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
}

export interface SelectAction {
  type: 'select';
  index: number;
  value: string | string[];
  xpath?: string;
}

export interface UploadFileAction {
  type: 'upload_file';
  index: number;
  filePath: string;
  xpath?: string;
}

export interface TakeScreenshotAction {
  type: 'take_screenshot';
  fullPage?: boolean;
  element?: number;
}

export interface ExtractDataAction {
  type: 'extract_data';
  selector?: string;
  xpath?: string;
  attribute?: string;
  multiple?: boolean;
}

export interface ExecuteScriptAction {
  type: 'execute_script';
  script: string;
  args?: any[];
}

export interface SwitchTabAction {
  type: 'switch_tab';
  tabIndex?: number;
  url?: string;
}

export interface NewTabAction {
  type: 'new_tab';
  url?: string;
}

export interface CloseTabAction {
  type: 'close_tab';
  tabIndex?: number;
}

export interface GoBackAction {
  type: 'go_back';
}

export interface GoForwardAction {
  type: 'go_forward';
}

export interface RefreshAction {
  type: 'refresh';
}

export interface SetCookieAction {
  type: 'set_cookie';
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
}

export interface WaitForElementAction {
  type: 'wait_for_element';
  selector?: string;
  xpath?: string;
  timeout?: number;
  state?: 'visible' | 'hidden' | 'attached' | 'detached';
}

export interface WaitForNavigationAction {
  type: 'wait_for_navigation';
  timeout?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
}

// 插件相关动作类型
export interface ExecutePluginAction {
  type: 'execute_plugin';
  pluginId: string;
  parameters?: Record<string, any>;
  description?: string;
}

export interface CreatePageEffectAction {
  type: 'create_page_effect';
  effectType: 'snowfall' | 'rain' | 'fireworks' | 'particles' | 'custom';
  parameters?: {
    intensity?: number;
    color?: string;
    duration?: number;
    customCode?: string;
  };
  description?: string;
}

export interface ModifyPageAction {
  type: 'modify_page';
  modifications: DOMModification[];
  preserveOriginal?: boolean;
  description?: string;
}

export interface WrapPageInIframeAction {
  type: 'wrap_page_iframe';
  iframeOptions?: {
    width?: string;
    height?: string;
    border?: string;
    sandbox?: string;
  };
  description?: string;
}

export type Action =
  | ClickAction
  | TypeAction
  | NavigateAction
  | ScrollAction
  | WaitAction
  | DoneAction
  | HoverAction
  | DragDropAction
  | KeyAction
  | KeyPressAction
  | SelectAction
  | UploadFileAction
  | TakeScreenshotAction
  | ExtractDataAction
  | ExecuteScriptAction
  | SwitchTabAction
  | NewTabAction
  | CloseTabAction
  | GoBackAction
  | GoForwardAction
  | RefreshAction
  | SetCookieAction
  | WaitForElementAction
  | WaitForNavigationAction
  | ExecutePluginAction
  | CreatePageEffectAction
  | ModifyPageAction
  | WrapPageInIframeAction;

// Tab decision interface for intelligent tab switching
export interface TabDecision {
  should_switch: boolean;
  target_tab_id?: string;
  reason: string;
}

export interface AgentBrain {
  thinking?: string;
  evaluation_previous_goal: string;
  memory: string;
  next_goal: string;
}

export interface AgentOutput extends AgentBrain {
  tab_decision: TabDecision;
  action: Action;
}

// DoneAction is already defined above at line 150

export interface AgentStep {
  stepNumber: number;
  action: Action;
  result: ActionResult;
  domState?: DOMState;
  timestamp: Date;
  agentOutput?: AgentOutput;
}

export interface AgentHistory {
  task: string;
  steps: AgentStep[];
  completed: boolean;
  success: boolean;
  totalDuration: number;
  startTime: Date;
  endTime?: Date;
  metadata: {
    agentId: string;
    sessionId: string;
    llmProvider: string;
    llmModel: string;
    browserProfile: Partial<BrowserProfile>;
    agentSettings: Partial<AgentSettings>;
    totalTokensUsed?: number;
    totalCost?: number;
    averageStepDuration: number;
    successRate: number;
    errorCount: number;
    retryCount: number;
    screenshotCount: number;
    finalUrl?: string;
    finalTitle?: string;
  };
  planning?: PlanningResult;
  reflection?: ReflectionResult[];
  performance?: PerformanceMetrics;
}

// New advanced types
export interface ErrorRecoveryStrategy {
  type: 'retry' | 'alternative_action' | 'skip' | 'restart_browser' | 'custom';
  maxAttempts: number;
  delay: number;
  condition?: (error: Error, context: ActionContext) => boolean;
  customHandler?: (error: Error, context: ActionContext) => Promise<ActionResult>;
}

export interface ActionContext {
  stepNumber: number;
  previousActions: Action[];
  currentDOMState: DOMState;
  agentHistory: AgentStep[];
  retryCount: number;
}

export interface PlanningResult {
  plan: PlannedStep[];
  confidence: number;
  estimatedDuration: number;
  riskAssessment: RiskAssessment;
  alternatives?: PlannedStep[][];
}

export interface PlannedStep {
  stepNumber: number;
  action: Action;
  description: string;
  expectedOutcome: string;
  confidence: number;
  dependencies?: number[];
  alternatives?: Action[];
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  risks: Risk[];
  mitigations: string[];
}

export interface Risk {
  type: 'element_not_found' | 'network_error' | 'timeout' | 'permission_denied' | 'rate_limit' | 'custom';
  probability: number;
  impact: 'low' | 'medium' | 'high';
  description: string;
  mitigation?: string;
}

export interface ReflectionResult {
  stepNumber: number;
  analysis: string;
  improvements: string[];
  confidence: number;
  shouldContinue: boolean;
  suggestedActions?: Action[];
}

export interface PerformanceMetrics {
  totalExecutionTime: number;
  averageActionTime: number;
  slowestAction: { action: Action; duration: number };
  fastestAction: { action: Action; duration: number };
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
  };
  networkRequests: number;
  screenshotsTaken: number;
  errorsEncountered: number;
  retriesPerformed: number;
}

// ============================================================================
// 插件系统类型定义
// ============================================================================

/**
 * 插件基础接口
 */
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  category: PluginCategory;
  tags?: string[];

  // 插件生命周期方法
  initialize?(context: PluginContext): Promise<void>;
  execute(params: PluginExecuteParams): Promise<PluginResult>;
  cleanup?(): Promise<void>;

  // 插件配置
  config?: PluginConfig;
  dependencies?: string[];
  permissions?: PluginPermission[];
}

/**
 * 插件类别
 */
export type PluginCategory =
  | 'visual-effects'    // 视觉特效
  | 'page-modification' // 页面修改
  | 'interaction'       // 交互增强
  | 'data-extraction'   // 数据提取
  | 'automation'        // 自动化工具
  | 'utility';          // 实用工具

/**
 * 插件权限
 */
export type PluginPermission =
  | 'dom-read'          // 读取DOM
  | 'dom-write'         // 修改DOM
  | 'iframe-create'     // 创建iframe
  | 'script-inject'     // 注入脚本
  | 'style-inject'      // 注入样式
  | 'network-request'   // 网络请求
  | 'storage-access'    // 存储访问
  | 'clipboard-access'; // 剪贴板访问

/**
 * 插件配置
 */
export interface PluginConfig {
  enabled: boolean;
  autoLoad?: boolean;
  priority?: number;
  settings?: Record<string, any>;
  constraints?: {
    maxExecutionTime?: number;
    maxMemoryUsage?: number;
    allowedDomains?: string[];
    blockedDomains?: string[];
  };
}

/**
 * 插件上下文
 */
export interface PluginContext {
  pluginId: string;
  browserSession: any; // BrowserSession实例
  page: any;           // Playwright页面实例
  domService: any;     // DOM服务实例
  logger: any;         // 日志服务实例
  config: PluginConfig;
  metadata: {
    currentUrl: string;
    pageTitle: string;
    timestamp: Date;
    sessionId: string;
  };
}

/**
 * 插件执行参数
 */
export interface PluginExecuteParams {
  context: PluginContext;
  parameters?: Record<string, any>;
  aiRequest?: {
    description: string;
    intent: string;
    confidence: number;
  };
}

/**
 * 插件执行结果
 */
export interface PluginResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
  metadata?: {
    executionTime: number;
    memoryUsed?: number;
    domChanges?: number;
    screenshot?: string;
  };
  cleanup?: () => Promise<void>;
}

/**
 * 页面修改插件特定接口
 */
export interface PageModificationPlugin extends Plugin {
  category: PluginCategory;

  // 页面修改特定方法
  createIframe?(originalContent: string): Promise<string>;
  injectStyles?(styles: string): Promise<void>;
  injectScripts?(scripts: string): Promise<void>;
  modifyDOM?(modifications: DOMModification[]): Promise<void>;
}

/**
 * DOM修改操作
 */
export interface DOMModification {
  type: 'create' | 'modify' | 'delete' | 'move';
  target?: string;        // CSS选择器或XPath
  element?: {
    tag: string;
    attributes?: Record<string, string>;
    content?: string;
    styles?: Record<string, string>;
  };
  position?: 'before' | 'after' | 'inside' | 'replace';
}

/**
 * 插件管理器接口
 */
export interface PluginManager {
  // 插件注册和管理
  register(plugin: Plugin): Promise<boolean>;
  unregister(pluginId: string): Promise<boolean>;
  getPlugin(pluginId: string): Plugin | null;
  getAllPlugins(): Plugin[];
  getPluginsByCategory(category: PluginCategory): Plugin[];

  // 插件执行
  execute(pluginId: string, params: PluginExecuteParams): Promise<PluginResult>;
  executeByCategory(category: PluginCategory, params: PluginExecuteParams): Promise<PluginResult[]>;

  // 插件状态管理
  enable(pluginId: string): Promise<boolean>;
  disable(pluginId: string): Promise<boolean>;
  isEnabled(pluginId: string): boolean;

  // 生命周期管理
  initializeAll(): Promise<void>;
  cleanupAll(): Promise<void>;
}
