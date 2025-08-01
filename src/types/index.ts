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

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  apiKey: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
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
  | WaitForNavigationAction;

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
