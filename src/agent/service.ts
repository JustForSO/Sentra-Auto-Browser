import { BrowserSession } from '../browser/session';
import { Controller } from '../controller/service';
import { BaseLLM } from '../llm/base';
import { AgentSettings, AgentStep, AgentHistory, Action, ActionResult, DOMState, PlanningResult, ReflectionResult, AgentState, AgentOutput } from '../types';
import { logger } from '../utils/logger';
import { MemoryService } from '../memory/service';
import { PlanningService } from '../planning/service';
import { ReflectionService } from '../reflection/service';
import { ErrorRecoveryService } from '../recovery/service';
import { PerformanceMonitoringService } from '../monitoring/service';
import { MessageManager } from '../message/manager';
import { PluginManager } from '../plugins/manager';
import { PluginRegistry } from '../plugins/registry';

/**
 * 智能代理服务 - 浏览器自动化的核心AI大脑
 *
 * 这个类就像一个聪明的机器人助手，能够理解你的任务需求，
 * 然后自动操作浏览器来完成各种复杂的网页操作。
 * 它会思考、规划、执行，还会从错误中学习，越用越聪明。
 */
export class Agent {
  private task: string;                    // 要执行的任务描述，就是你告诉它要做什么
  private llm: BaseLLM;                   // AI大脑，负责思考和决策
  private browserSession: BrowserSession; // 浏览器会话，它的工作环境
  private controller: Controller;          // 操作控制器，它的手和眼睛
  private settings: AgentSettings;         // 各种配置参数，控制行为方式
  private history: AgentStep[] = [];      // 执行历史记录，记住做过什么
  private state: AgentState;              // 当前状态信息
  private completed: boolean = false;      // 任务是否已完成
  private success: boolean = false;        // 任务是否成功完成

  // 高级功能模块 - 让AI更聪明的各种服务
  private memoryService?: MemoryService;                    // 记忆服务，帮助记住重要信息
  private planningService?: PlanningService;                // 规划服务，制定执行计划
  private reflectionService?: ReflectionService;            // 反思服务，从经验中学习
  private errorRecoveryService?: ErrorRecoveryService;      // 错误恢复服务，处理异常情况
  private performanceMonitoringService?: PerformanceMonitoringService; // 性能监控，优化执行效率
  private messageManager: MessageManager;                   // 消息管理器，处理与AI的对话
  private pluginManager?: PluginManager;                    // 插件管理器，扩展功能
  private pluginRegistry?: PluginRegistry;                  // 插件注册表，管理可用插件

  // 代理身份和状态信息
  private agentId: string;              // 代理的唯一标识
  private sessionId: string;            // 当前会话ID
  private currentPlan?: PlanningResult; // 当前执行计划
  private lastReflection?: ReflectionResult; // 最近的反思结果

  /**
   * 创建智能代理实例
   * 就像雇佣一个AI助手，告诉它要做什么，给它配置好工具和环境
   *
   * @param task 要执行的任务描述，用自然语言描述即可
   * @param llm 大语言模型实例，AI的大脑
   * @param browserSession 浏览器会话，工作环境
   * @param settings 配置选项，控制行为细节
   */
  constructor(
    task: string,
    llm: BaseLLM,
    browserSession: BrowserSession,
    settings: AgentSettings = {}
  ) {
    this.task = task;
    this.llm = llm;
    this.browserSession = browserSession;
    this.settings = {
      maxSteps: 100, // 增加最大步数，让AI有更多决策空间
      maxActionsPerStep: 3,
      useVision: true,
      retryFailedActions: true,
      maxRetries: 2, // 减少重试次数提升性能
      retryDelay: 500, // 减少重试延迟
      enableMemory: true,
      memorySize: 1000,
      enablePlanning: true,
      planningSteps: 10,
      enableReflection: true,
      reflectionInterval: 5,
      enableErrorRecovery: true,
      enablePerformanceMonitoring: true,
      enableScreenshotOnError: true,
      enableActionValidation: true,
      enableLoopDetection: true,
      maxConsecutiveFailures: 5,
      maxSimilarActions: 3,
      enablePlugins: true,
      ...settings,
    };

    // Generate unique IDs
    this.agentId = this.generateId('agent');
    this.sessionId = this.generateId('session');

    // Initialize agent state
    this.state = {
      agentId: this.agentId,
      sessionId: this.sessionId,
      stepNumber: 0,
      consecutiveFailures: 0,
      memory: [],
      paused: false,
      stopped: false,
      startTime: new Date(),
      similarActionCount: 0,
    };

    // Initialize message manager
    this.messageManager = new MessageManager(this.task);

    // 初始化基础Controller（不带插件系统）
    this.controller = new Controller(this.browserSession);

    // Initialize advanced services if enabled (async initialization will be done in run method)
    this.initializeServices();
  }

  /**
   * 开始执行任务 - 这是智能代理的主入口
   * @returns 执行历史记录
   */
  async run(): Promise<AgentHistory> {
    try {
      logger.info(`开始执行代理任务: ${this.task}`, 'Agent');
      this.state.startTime = new Date();

      // 确保浏览器已经准备好
      if (!this.browserSession.isStarted()) {
        await this.browserSession.start();
      }

      // 确保插件系统已初始化
      if (!this.pluginManager || !this.pluginRegistry) {
        await this.initializePluginSystem();
      }

      // 执行步骤直到完成或达到最大步数
      for (let stepNumber = 1; stepNumber <= this.settings.maxSteps!; stepNumber++) {
        this.state.stepNumber = stepNumber;

        try {
          // 获取当前 DOM 状态
          let domState = await this.controller.getCurrentState();

          const stepDescription = this.generateStepDescription(stepNumber, domState);
          logger.step(stepNumber, stepDescription);

          // 如果DOM状态为空，跳过此步骤
          if (!domState) {
            logger.warn(`Step ${stepNumber}: DOM state is null, skipping step`, 'Agent');
            continue;
          }

          // 如果启用了视觉功能，则截图
          let screenshot: string | undefined;
          logger.info(`🔍 检查视觉设置: useVision = ${this.settings.useVision}`, 'Agent');
          if (this.settings.useVision) {
            logger.info('📸 开始截图...', 'Agent');
            try {
              screenshot = await this.controller.takeScreenshot();
              const screenshotSize = screenshot ? screenshot.length : 0;
              logger.info(`📸 截图完成，大小: ${screenshotSize} 字符 (${Math.round(screenshotSize/1024)}KB)`, 'Agent');
            } catch (error: any) {
              logger.error(`📸 截图失败: ${error.message}`, error, 'Agent');
              screenshot = undefined;
            }
          } else {
            logger.info('📸 视觉功能已禁用，跳过截图', 'Agent');
          }

          // 生成历史记录字符串
          const agentHistory = this.messageManager.formatAgentHistory(this.history);

          // 获取所有标签页信息供AI决策
          const tabsInfo = this.browserSession.getAllTabsInfo ? this.browserSession.getAllTabsInfo() : [];

          // 获取可用插件信息
          const allPlugins = this.pluginRegistry ? this.pluginRegistry.getManager().getAllPlugins() : [];
          const availablePlugins = allPlugins.map(plugin => plugin.config);

          // 从 LLM 获取下一步操作（结构化输出）
          const agentOutput: AgentOutput = await this.llm.generateAction(this.task, domState, screenshot, agentHistory, tabsInfo, availablePlugins);

          // 🔍 添加详细日志：打印 AI 返回的原始数据
          logger.info('🔍 AI 返回的完整数据:', 'Agent');
          logger.info(`📊 agentOutput: ${JSON.stringify(agentOutput, null, 2)}`, 'Agent');

          if (agentOutput.action) {
            logger.info(`🎯 AI 选择的操作: ${agentOutput.action.type}`, 'Agent');
            if (agentOutput.action.type === 'type') {
              const typeAction = agentOutput.action as any; // 临时类型断言
              logger.info(`📝 输入操作详情:`, 'Agent');
              logger.info(`  - 目标元素索引: ${typeAction.index}`, 'Agent');
              logger.info(`  - 输入文本: "${typeAction.text}"`, 'Agent');

              // 查找对应的元素信息
              const targetElement = domState.elements.find((el: any) => el.index === typeAction.index);
              if (targetElement) {
                logger.info(`  - 目标元素信息:`, 'Agent');
                logger.info(`    * 标签: ${targetElement.tag}`, 'Agent');
                logger.info(`    * 文本: "${targetElement.text}"`, 'Agent');
                logger.info(`    * 属性: ${JSON.stringify(targetElement.attributes)}`, 'Agent');
                logger.info(`    * 交互类型: ${(targetElement as any).interactionType}`, 'Agent');
                logger.info(`    * 是否可输入: ${(targetElement as any).isInputElement}`, 'Agent');
                logger.info(`    * 是否仅可点击: ${(targetElement as any).isClickableOnly}`, 'Agent');
              } else {
                logger.warn(`⚠️ 未找到索引为 ${typeAction.index} 的元素`, 'Agent');
              }
            }
          }

          // 记录Agent的详细输出
          this.logAgentOutput(agentOutput);

          // 🧠 处理AI的标签页切换决策
          if (agentOutput.tab_decision && agentOutput.tab_decision.should_switch) {
            logger.info(`🧠 AI决策切换标签页: ${agentOutput.tab_decision.reason}`, 'Agent');
            logger.info(`🎯 目标标签页ID: ${agentOutput.tab_decision.target_tab_id}`, 'Agent');

            try {
              const switchResult = await this.browserSession.aiSwitchTab(agentOutput.tab_decision.target_tab_id!);
              if (switchResult) {
                logger.info('✅ 标签页切换成功', 'Agent');
                // 切换后需要重新获取DOM状态
                domState = await this.browserSession.getDOMState();
                screenshot = this.settings.useVision ? await this.browserSession.takeScreenshot() : undefined;
              } else {
                logger.warn('⚠️ 标签页切换失败', 'Agent');
              }
            } catch (error: any) {
              logger.error(`❌ 标签页切换异常: ${error.message}`, error, 'Agent');
            }
          } else if (agentOutput.tab_decision) {
            logger.info(`ℹ️ AI决策保持当前标签页: ${agentOutput.tab_decision.reason}`, 'Agent');
          }

          // 检查循环和重复操作
          if (this.detectLoop(agentOutput)) {
            logger.warn('Detected potential loop, attempting recovery', 'Agent');
            this.state.consecutiveFailures++;

            // Enhanced loop recovery: suggest done action if stuck too long
            if (this.state.consecutiveFailures >= (this.settings.maxConsecutiveFailures || 3)) {
              logger.warn('Too many consecutive failures, suggesting task completion', 'Agent');

              // Force a done action to prevent infinite loops
              const doneAction = {
                thinking: "Detected repeated failures and potential infinite loop. Terminating to prevent further issues.",
                evaluation_previous_goal: "Multiple consecutive failures detected",
                memory: `Attempted ${this.state.consecutiveFailures} times but encountered repeated failures`,
                next_goal: "Terminate task due to repeated failures",
                tab_decision: {
                  should_switch: false,
                  reason: "Task terminating due to failures, no tab switch needed"
                },
                action: {
                  type: 'done' as const,
                  message: `Task terminated after ${this.state.consecutiveFailures} consecutive failures. Partial progress may have been made.`,
                  success: false
                }
              };

              // Execute the forced done action
              const result = await this.controller.executeAction(doneAction.action);
              const step: AgentStep = {
                stepNumber,
                action: doneAction.action,
                result,
                domState,
                timestamp: new Date(),
                agentOutput: doneAction,
              };

              this.history.push(step);
              this.completed = true;
              this.success = false;
              logger.warn('Task forcibly completed due to repeated failures', 'Agent');
              break;
            }

            continue;
          }

          // 验证操作
          this.validateAction(agentOutput.action);

          // 执行操作
          const stepStartTime = Date.now();
          const result = await this.controller.executeAction(agentOutput.action);
          const stepDuration = (Date.now() - stepStartTime) / 1000;



          // Check if navigation was detected and refresh DOM state immediately
          if (result.navigationDetected) {
            logger.info('🔄 Navigation detected, refreshing DOM state for next step...', 'Agent');

            // CRITICAL: Wait a bit more for SPA content to fully load before getting DOM state
            await new Promise(resolve => setTimeout(resolve, 1500));



            // Get fresh DOM state immediately after navigation
            domState = await this.controller.getCurrentState();
            logger.info(`✅ Fresh DOM state obtained: ${domState.elements.length} elements found`, 'Agent');

            // Log first few elements to verify we got the new page content
            if (domState.elements.length > 0) {
              logger.info(`🔍 First element after navigation: ${domState.elements[0].tag} - "${domState.elements[0].text}"`, 'Agent');
              if (domState.elements.length > 1) {
                logger.info(`🔍 Second element after navigation: ${domState.elements[1].tag} - "${domState.elements[1].text}"`, 'Agent');
              }
            }
          }

          // Update state based on result
          this.updateState(agentOutput, result);

          // Create step record
          const step: AgentStep = {
            stepNumber,
            action: agentOutput.action,
            result,
            domState,
            timestamp: new Date(),
            agentOutput,
          };

          this.history.push(step);

          // Log detailed step completion
          this.logStepCompletion(stepNumber, agentOutput.action, result, stepDuration);

          // Check if task is complete
          if (agentOutput.action.type === 'done') {
            this.completed = true;
            this.success = (agentOutput.action as any).success || false;
            const message = (agentOutput.action as any).message || 'Task completed';

            if (this.success) {
              logger.success(`Task completed successfully: ${message}`, 'Agent');
            } else {
              logger.warn(`Task completed with issues: ${message}`, 'Agent');
            }
            break;
          }

          // Check if action failed
          if (!result.success) {
            logger.warn(`Action failed, continuing with next step`, 'Agent');
          }

          // 稍微等一下，让页面稳定
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          logger.error(`Step ${stepNumber} failed: ${error instanceof Error ? error.message : String(error)}`, error as Error, 'Agent');

          // 创建错误步骤记录
          const errorStep: AgentStep = {
            stepNumber,
            action: { type: 'done', message: 'Error occurred', success: false } as Action,
            result: {
              success: false,
              error: error instanceof Error ? error.message : String(error),
              message: `Step failed: ${error instanceof Error ? error.message : String(error)}`,
            },
            timestamp: new Date(),
          };

          this.history.push(errorStep);

          // Continue to next step unless it's a critical error
          if (this.isCriticalError(error)) {
            break;
          }
        }
      }

      // If we reached max steps without completion
      if (!this.completed) {
        logger.warn(`Reached maximum steps (${this.settings.maxSteps}) without completion`, 'Agent');
        this.completed = true;
        this.success = false;
      }



      const totalDuration = (new Date().getTime() - this.state.startTime.getTime()) / 1000;
      logger.info(`Agent finished. Steps: ${this.history.length}, Duration: ${totalDuration.toFixed(2)}s`, 'Agent');

      return this.getHistory();

    } catch (error) {
      logger.error('Agent execution failed', error as Error, 'Agent');
      this.completed = true;
      this.success = false;
      throw error;
    }
  }



  isCompleted(): boolean {
    return this.completed;
  }

  isSuccessful(): boolean {
    return this.success;
  }

  getStepCount(): number {
    return this.history.length;
  }

  async stop(): Promise<void> {
    logger.info('Stopping agent execution', 'Agent');
    this.completed = true;
    this.success = false;
  }

  // 高级智能体功能
  private async initializeServices(): Promise<void> {
    if (this.settings.enableMemory) {
      this.memoryService = new MemoryService(this.settings.memorySize);
    }

    if (this.settings.enablePlanning) {
      this.planningService = new PlanningService(this.llm, this.memoryService);
    }

    if (this.settings.enableReflection) {
      this.reflectionService = new ReflectionService(this.llm, this.memoryService);
    }

    if (this.settings.enableErrorRecovery) {
      this.errorRecoveryService = new ErrorRecoveryService(this.browserSession, this.controller);
    }

    if (this.settings.enablePerformanceMonitoring) {
      this.performanceMonitoringService = new PerformanceMonitoringService();
      this.performanceMonitoringService.startMonitoring();
    }

    // 初始化插件系统（异步，但不等待，在run方法中会确保初始化完成）
    this.initializePluginSystem();
  }

  /**
   * 初始化插件系统
   */
  private async initializePluginSystem(): Promise<void> {
    // 检查是否启用插件系统
    if (!this.settings.enablePlugins) {
      logger.info('插件系统已禁用，使用默认Controller', 'Agent');
      this.controller = new Controller(this.browserSession);
      return;
    }

    try {
      logger.info('初始化插件系统...', 'Agent');

      // 创建插件注册表（它会创建自己的PluginManager）
      this.pluginRegistry = new PluginRegistry();

      // 初始化插件系统
      await this.pluginRegistry.initialize();

      // 获取插件管理器实例（确保使用同一个实例）
      this.pluginManager = this.pluginRegistry.getManager();

      // 重新创建Controller，传入插件系统
      this.controller = new Controller(this.browserSession, this.pluginManager, this.pluginRegistry);

      logger.info('插件系统初始化完成', 'Agent');
    } catch (error) {
      logger.error('插件系统初始化失败', error as Error, 'Agent');
      // 如果插件系统初始化失败，使用默认Controller
      this.controller = new Controller(this.browserSession);
    }
  }

  private async createInitialPlan(domState: DOMState): Promise<void> {
    if (!this.planningService || !this.settings.enablePlanning) return;

    try {
      this.currentPlan = await this.planningService.createPlan(
        this.task,
        domState,
        this.settings.planningSteps
      );

      logger.info(`Created plan with ${this.currentPlan.plan.length} steps, confidence: ${this.currentPlan.confidence}`, 'Agent');
    } catch (error) {
      logger.warn('Failed to create initial plan, continuing without planning', 'Agent');
    }
  }

  private async updatePlan(stepNumber: number, domState: DOMState, lastResult?: ActionResult): Promise<void> {
    if (!this.planningService || !this.currentPlan) return;

    try {
      this.currentPlan = await this.planningService.updatePlan(
        this.currentPlan,
        stepNumber,
        domState,
        lastResult
      );
    } catch (error) {
      logger.warn('Failed to update plan', 'Agent');
    }
  }

  private async performReflection(stepNumber: number, domState: DOMState): Promise<void> {
    if (!this.reflectionService || !this.settings.enableReflection) return;

    if (stepNumber % this.settings.reflectionInterval! !== 0) return;

    try {
      const recentSteps = this.history.slice(-this.settings.reflectionInterval!);
      this.lastReflection = await this.reflectionService.reflect(
        this.task,
        recentSteps,
        domState,
        stepNumber
      );

      if (!this.lastReflection.shouldContinue) {
        logger.warn('Reflection suggests stopping execution', 'Agent');
        this.completed = true;
        this.success = false;
      }
    } catch (error) {
      logger.warn('Failed to perform reflection', 'Agent');
    }
  }

  private detectLoop(agentOutput: AgentOutput): boolean {
    if (!this.settings.enableLoopDetection) return false;

    const currentAction = agentOutput.action;
    const recentSteps = this.history.slice(-5); // Check last 5 steps for better pattern detection

    // Check for identical actions with same parameters
    let identicalCount = 0;
    let sameGoalCount = 0;

    for (const step of recentSteps) {
      // Count identical actions
      if (this.actionsAreIdentical(step.action, currentAction)) {
        identicalCount++;
      }

      // Count same goals
      if (step.agentOutput?.next_goal === agentOutput.next_goal) {
        sameGoalCount++;
      }
    }

    // If we've seen the same action too many times, it's likely a loop
    if (identicalCount >= (this.settings.maxSimilarActions || 2)) {
      logger.warn(`Detected action loop: ${currentAction.type} repeated ${identicalCount} times`, 'Agent');
      return true;
    }

    // Check for goal repetition with failures
    if (sameGoalCount >= 3 && this.state.consecutiveFailures > 1) {
      logger.warn(`Detected goal repetition with failures: "${agentOutput.next_goal}" (${sameGoalCount} times)`, 'Agent');
      return true;
    }

    // Check for wait action loops (common when stuck)
    if (currentAction.type === 'wait') {
      const recentWaits = recentSteps.filter(step => step.action.type === 'wait').length;
      if (recentWaits >= 2) {
        logger.warn(`Detected wait loop: ${recentWaits} wait actions in recent steps`, 'Agent');
        return true;
      }
    }

    // Check for evaluation repetition (indicates confusion)
    const recentEvaluations = recentSteps
      .map(step => step.agentOutput?.evaluation_previous_goal)
      .filter(evaluation => evaluation === agentOutput.evaluation_previous_goal);

    if (recentEvaluations.length >= 2) {
      logger.warn(`Detected evaluation repetition: "${agentOutput.evaluation_previous_goal}"`, 'Agent');
      return true;
    }

    return false;
  }

  // Helper method to check if two actions are identical
  private actionsAreIdentical(action1: Action, action2: Action): boolean {
    if (action1.type !== action2.type) return false;

    switch (action1.type) {
      case 'click':
        return (action1 as any).index === (action2 as any).index;
      case 'type':
        return (action1 as any).index === (action2 as any).index &&
               (action1 as any).text === (action2 as any).text;
      case 'navigate':
        return (action1 as any).url === (action2 as any).url;
      case 'scroll':
        return (action1 as any).direction === (action2 as any).direction;
      case 'wait':
        return (action1 as any).seconds === (action2 as any).seconds;
      default:
        return true; // For other actions, consider them identical if same type
    }
  }

  // Update agent state based on action result
  private updateState(agentOutput: AgentOutput, result: ActionResult): void {
    this.state.lastResult = result;
    this.state.lastGoal = this.state.currentGoal;
    this.state.currentGoal = agentOutput.next_goal;

    // Update memory
    this.state.memory.push(agentOutput.memory);
    if (this.state.memory.length > 10) {
      this.state.memory = this.state.memory.slice(-10); // Keep only last 10 memories
    }

    // Track failures
    if (!result.success) {
      this.state.consecutiveFailures++;
    } else {
      this.state.consecutiveFailures = 0; // Reset on success
    }

    // Update action tracking
    this.state.lastActionType = agentOutput.action.type;
    this.state.lastActionTarget = (agentOutput.action as any).index?.toString() || '';
  }

  private async handleActionError(
    error: Error,
    action: Action,
    stepNumber: number,
    domState: DOMState,
    retryCount: number
  ): Promise<ActionResult | null> {
    if (!this.errorRecoveryService || !this.settings.enableErrorRecovery) {
      return null;
    }

    try {
      const context = {
        stepNumber,
        previousActions: this.history.map(h => h.action),
        currentDOMState: domState,
        agentHistory: this.history,
        retryCount,
      };

      return await this.errorRecoveryService.handleError(error, context, action);
    } catch (recoveryError) {
      logger.error('Error recovery failed', recoveryError as Error, 'Agent');
      return null;
    }
  }

  private async recordPerformanceMetrics(action: Action, result: ActionResult, duration: number): Promise<void> {
    if (!this.performanceMonitoringService) return;

    this.performanceMonitoringService.recordActionEnd('', action, result.success, duration);

    if (!result.success) {
      this.performanceMonitoringService.recordError(new Error(result.error || 'Unknown error'), action);
    }
  }

  private async addToMemory(step: AgentStep): Promise<void> {
    if (!this.memoryService) return;

    try {
      await this.memoryService.addActionMemory(step);

      if (step.domState) {
        await this.memoryService.addObservationMemory(step.domState, step.stepNumber);
      }
    } catch (error) {
      logger.warn('Failed to add step to memory', 'Agent');
    }
  }

  private validateAction(action: any): void {
    if (!this.settings.enableActionValidation) return;

    if (!action || typeof action !== 'object') {
      throw new Error('Invalid action: must be an object');
    }

    if (!action.type) {
      throw new Error('Invalid action: missing type');
    }

    const validTypes = [
      'click', 'type', 'navigate', 'scroll', 'wait', 'done',
      'hover', 'drag_drop', 'key', 'key_press', 'select', 'upload_file',
      'take_screenshot', 'extract_data', 'execute_script',
      'switch_tab', 'new_tab', 'close_tab', 'go_back', 'go_forward',
      'refresh', 'set_cookie', 'wait_for_element', 'wait_for_navigation',
      'execute_plugin', 'create_page_effect', 'modify_page', 'wrap_page_iframe'
    ];

    if (!validTypes.includes(action.type)) {
      throw new Error(`Invalid action type: ${action.type}`);
    }

    // Type-specific validation
    switch (action.type) {
      case 'click':
      case 'hover':
        if (typeof action.index !== 'number') {
          throw new Error(`${action.type} action requires numeric index`);
        }
        break;
      case 'type':
        if (typeof action.index !== 'number' || typeof action.text !== 'string') {
          throw new Error('Type action requires numeric index and text string');
        }
        // 增强验证：检查目标元素是否适合输入操作
        // 注意：这里只做基本验证，详细验证在执行时进行
        break;
      case 'navigate':
        if (typeof action.url !== 'string') {
          throw new Error('Navigate action requires url string');
        }
        break;
      case 'scroll':
        if (!['up', 'down'].includes(action.direction)) {
          throw new Error('Scroll action requires direction "up" or "down"');
        }
        break;
      case 'wait':
        if (typeof action.seconds !== 'number' || action.seconds <= 0) {
          throw new Error('Wait action requires positive number of seconds');
        }
        break;
      case 'done':
        if (typeof action.message !== 'string' || typeof action.success !== 'boolean') {
          throw new Error('Done action requires message string and success boolean');
        }
        break;
    }
  }



  private isCriticalError(error: any): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);

    const criticalErrors = [
      'Browser session not started',
      'Browser crashed',
      'Network error',
      'Authentication failed',
    ];

    return criticalErrors.some(criticalError =>
      errorMessage.toLowerCase().includes(criticalError.toLowerCase())
    );
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateStepDescription(stepNumber: number, domState: DOMState | null): string {
    if (!domState) {
      return `Step ${stepNumber}: No DOM state available`;
    }

    const url = domState.url || 'unknown';
    const urlShort = url.length > 50 ? url.substring(0, 50) + '...' : url;
    const interactiveCount = domState.elements?.length || 0;

    return `Evaluating page with ${interactiveCount} interactive elements on: ${urlShort}`;
  }

  private logAgentOutput(agentOutput: AgentOutput): void {
    // Determine emoji based on evaluation
    let emoji = '❔';
    const evaluation = agentOutput.evaluation_previous_goal.toLowerCase();
    if (evaluation.includes('success')) {
      emoji = '👍';
    } else if (evaluation.includes('failure') || evaluation.includes('failed')) {
      emoji = '⚠️';
    }

    // Log thinking if present
    if (agentOutput.thinking) {
      logger.info(`💡 Thinking:\n${agentOutput.thinking}`, 'Agent');
    }

    // Log evaluation with emoji
    logger.info(`${emoji} Eval: ${agentOutput.evaluation_previous_goal}`, 'Agent');

    // Log memory
    logger.info(`🧠 Memory: ${agentOutput.memory}`, 'Agent');

    // Log next goal
    logger.info(`🎯 Next goal: ${agentOutput.next_goal}`, 'Agent');

    // Add empty line for readability
    console.log('');
  }
  
  private logStepCompletion(stepNumber: number, action: Action, result: ActionResult, duration: number): void {
    // Format success/failure indicators
    const successIndicator = result.success ? '✅ 1' : '';
    const failureIndicator = !result.success ? '❌ 1' : '';
    const statusParts = [successIndicator, failureIndicator].filter(part => part);
    const statusStr = statusParts.length > 0 ? statusParts.join(' | ') : '✅ 0';

    // Log step completion
    logger.info(`📍 Step ${stepNumber}: Ran 1 action in ${duration.toFixed(2)}s: ${statusStr}`, 'Agent');

    // Log action details
    const actionDetails = this.formatActionDetails(action);
    if (result.success) {
      logger.result(`${actionDetails}`, true);
    } else {
      logger.result(`${actionDetails} - ${result.error || 'Unknown error'}`, false);
    }
  }

  // Format action details for logging
  private formatActionDetails(action: Action): string {
    switch (action.type) {
      case 'navigate':
        return `Navigated to ${(action as any).url}`;
      case 'click':
        return `Clicked element at index ${(action as any).index}`;
      case 'type':
        return `Typed "${(action as any).text}" into element at index ${(action as any).index}`;
      case 'scroll':
        return `Scrolled ${(action as any).direction}`;
      case 'wait':
        return `Waited for ${(action as any).seconds} seconds`;
      case 'done':
        return `Task completed: ${(action as any).message}`;
      default:
        return `Executed ${action.type} action`;
    }
  }

  // Enhanced getHistory method
  getHistory(): AgentHistory {
    const totalDuration = (new Date().getTime() - this.state.startTime.getTime()) / 1000;
    const successfulSteps = this.history.filter(s => s.result.success);
    const failedSteps = this.history.filter(s => !s.result.success);

    return {
      task: this.task,
      steps: this.history,
      completed: this.completed,
      success: this.success,
      totalDuration,
      startTime: this.state.startTime,
      endTime: this.completed ? new Date() : undefined,
      metadata: {
        agentId: this.agentId,
        sessionId: this.sessionId,
        llmProvider: 'unknown', // Would need to be passed from config
        llmModel: 'unknown',
        browserProfile: {},
        agentSettings: this.settings,
        totalTokensUsed: 0, // Would need to track from LLM responses
        totalCost: 0,
        averageStepDuration: this.history.length > 0
          ? totalDuration / this.history.length
          : 0,
        successRate: this.history.length > 0
          ? successfulSteps.length / this.history.length
          : 0,
        errorCount: failedSteps.length,
        retryCount: 0, // Would need to track retries
        screenshotCount: this.history.filter(s => s.result.screenshot).length,
        finalUrl: this.browserSession.getCurrentUrl(),
        finalTitle: undefined, // Would need async call
      },
      planning: this.currentPlan,
      reflection: this.lastReflection ? [this.lastReflection] : [],
      performance: this.performanceMonitoringService?.getMetrics(this.history),
    };
  }

  // Additional utility methods
  async getMemoryStats(): Promise<any> {
    return this.memoryService?.getMemoryStats() || null;
  }

  async searchMemory(query: string): Promise<any> {
    if (!this.memoryService) return [];
    return this.memoryService.searchMemories({ query, limit: 10 });
  }

  getPerformanceReport(): string {
    if (!this.performanceMonitoringService) return 'Performance monitoring not enabled';
    return this.performanceMonitoringService.generateReport(this.history);
  }

  getCurrentPlan(): PlanningResult | undefined {
    return this.currentPlan;
  }

  getLastReflection(): ReflectionResult | undefined {
    return this.lastReflection;
  }
}
