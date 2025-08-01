import { LLMConfig } from '../types';
import { logger } from '../utils/logger';
import { ElementSemanticAnalyzer } from '../dom/element-semantic-analyzer';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * 大语言模型基类 - AI智能的核心接口
 *
 * 这个抽象类为所有AI模型提供统一的接口，就像一个翻译官，
 * 把我们的需求翻译成不同AI模型能理解的语言。
 * 无论是OpenAI、Google还是Anthropic，都通过这个接口来交流。
 */
export abstract class BaseLLM {
  protected config: LLMConfig;                      // AI模型的配置信息
  protected semanticAnalyzer: ElementSemanticAnalyzer; // 语义分析器，帮助理解页面元素

  constructor(config: LLMConfig) {
    this.config = config;
    this.semanticAnalyzer = new ElementSemanticAnalyzer();
  }

  // 抽象方法：每个具体的AI模型都要实现这个方法
  abstract generateResponse(messages: LLMMessage[], useStructuredOutput?: boolean): Promise<LLMResponse>;

  /**
   * 格式化DOM元素供AI理解
   * 把页面上的元素转换成AI能理解的文本描述，
   * 就像给盲人描述一个房间里有什么东西一样详细
   */
  protected formatElementsForLLM(elements: any[], context?: { url: string; pageType?: string }): string {

    const formattedElements = elements.map((el: any, i: number) => {
      // 使用元素的实际索引，如果没有就用循环索引
      const elementIndex = el.index !== undefined ? el.index : i;

      // 进行语义分析，理解这个元素的作用和重要性
      const analysisContext = context || { url: 'unknown' };
      const semanticAnalysis = this.semanticAnalyzer.analyzeElement(el, analysisContext);

      // 提取元素的核心信息
      const text = (el.text || '').trim();
      const semanticInfo = this.formatSemanticInfo(semanticAnalysis);

      // 🎨 构建详细但清晰的元素描述
      let elementDesc = `[${elementIndex}]`;

      // 添加语义标识（如果有）
      if (semanticInfo) {
        elementDesc += ` ${semanticInfo}`;
      }

      // 添加标签和重要属性
      elementDesc += ` <${el.tag}`;

      // 添加重要属性 - 恢复详细信息但保持整洁
      const importantAttrs = this.getImportantAttributes(el);
      if (importantAttrs.length > 0) {
        elementDesc += ` ${importantAttrs.join(' ')}`;
      }

      // 添加文本内容
      if (text) {
        // 🎯 为视频内容大幅增加文本长度，确保AI能看到完整标题
        let maxLength = 30; // 默认长度
        if (semanticAnalysis.semanticType === 'video_content') {
          maxLength = 120; // 视频内容显示更多文本，足够显示完整中文标题
        } else if (semanticAnalysis.semanticType === 'navigation_link') {
          maxLength = 60; // 导航链接也需要更多文本
        }

        const displayText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
        elementDesc += `>${displayText}`;
      }

      elementDesc += ' />';

      // 添加语义描述和操作提示
      if (semanticAnalysis.description && semanticAnalysis.description !== `${el.tag}元素: ${text}`) {
        elementDesc += ` 📝 ${semanticAnalysis.description}`;
      }

      return elementDesc;
    });

    return formattedElements.join('\n');
  }

  /**
   * 格式化语义分析信息 - 简洁版本
   */
  protected formatSemanticInfo(analysis: any): string {
    const parts: string[] = [];

    // 核心语义标识 - 简洁emoji + 类型
    const typeEmoji = this.getSemanticTypeEmoji(analysis.semanticType);
    const typeLabel = this.getSimpleTypeLabel(analysis.semanticType);
    parts.push(`${typeEmoji}${typeLabel}`);

    // 优先级指示 - 仅显示关键级别
    if (analysis.priority >= 4) {
      parts.push(`⭐`);
    } else if (analysis.priority <= 2) {
      parts.push(`⚠️`);
    }

    // 特殊标记 - 仅关键信息
    if (analysis.semanticType === 'advertisement') {
      parts.push(`SKIP`);
    }

    return parts.join('');
  }

  /**
   * 获取简化的类型标签
   */
  protected getSimpleTypeLabel(semanticType: string): string {
    const labelMap: { [key: string]: string } = {
      'video_content': 'VIDEO',
      'play_button': 'PLAY',
      'search_input': 'SEARCH',
      'advertisement': 'AD',
      'navigation_link': 'NAV',
      'submit_button': 'SUBMIT',
      'download_button': 'DOWNLOAD',
      'unknown': ''
    };

    return labelMap[semanticType] || '';
  }

  /**
   * 获取重要属性 - 提供足够的上下文信息
   */
  protected getImportantAttributes(el: any): string[] {
    const attrs: string[] = [];

    // 核心属性列表
    const coreAttributes = ['type', 'name', 'role', 'aria-label', 'placeholder', 'title', 'value'];

    // 添加核心属性
    for (const attr of coreAttributes) {
      if (el.attributes && el.attributes[attr]) {
        attrs.push(`${attr}="${el.attributes[attr]}"`);
      }
    }

    // 添加class信息（简化）
    if (el.attributes?.class) {
      const classValue = el.attributes.class;
      // 只显示关键的class信息
      const keyClasses = classValue.split(' ').filter((cls: string) =>
        cls.includes('video') || cls.includes('play') || cls.includes('search') ||
        cls.includes('btn') || cls.includes('link') || cls.includes('nav') ||
        cls.includes('ad') || cls.includes('banner')
      );
      if (keyClasses.length > 0) {
        attrs.push(`class="${keyClasses.join(' ')}"`);
      }
    }

    // 添加href信息（截断）
    if (el.attributes?.href && el.tag === 'a') {
      const href = el.attributes.href;
      const shortHref = href.length > 40 ? href.substring(0, 40) + '...' : href;
      attrs.push(`href="${shortHref}"`);
    }

    return attrs;
  }

  /**
   * 获取语义类型对应的emoji
   */
  protected getSemanticTypeEmoji(semanticType: string): string {
    const emojiMap: { [key: string]: string } = {
      'video_content': '🎬',
      'play_button': '▶️',
      'search_input': '🔍',
      'advertisement': '📢',
      'navigation_link': '🧭',
      'submit_button': '✅',
      'download_button': '⬇️',
      'audio_content': '🎵',
      'image_content': '🖼️',
      'like_button': '👍',
      'share_button': '📤',
      'unknown': '❓'
    };

    return emojiMap[semanticType] || '🔹';
  }

  protected getElementTypeHint(el: any): string {
    const tag = el.tag.toLowerCase();
    const type = el.attributes?.type?.toLowerCase();

    if (tag === 'input') {
      if (type === 'submit' || type === 'button') {
        return '[BUTTON]';
      } else if (type === 'checkbox') {
        return '[CHECKBOX]';
      } else if (type === 'radio') {
        return '[RADIO]';
      } else if (type === 'file') {
        return '[FILE_INPUT]';
      } else {
        return '[INPUT_FIELD]';
      }
    } else if (tag === 'textarea') {
      return '[INPUT_FIELD]';
    } else if (tag === 'button') {
      return '[BUTTON]';
    } else if (tag === 'a') {
      return '[LINK]';
    } else if (tag === 'select') {
      return '[DROPDOWN]';
    } else if (tag === 'img') {
      return '[IMAGE]';
    } else if (tag === 'video') {
      return '[VIDEO]';
    } else if (tag === 'audio') {
      return '[AUDIO]';
    } else if (el.attributes?.role === 'button') {
      return '[BUTTON]';
    } else if (el.attributes?.role === 'link') {
      return '[LINK]';
    } else if (el.attributes?.role === 'textbox') {
      return '[INPUT_FIELD]';
    }

    return '';
  }

  protected formatSystemPrompt(): string {
    return `You are an AI agent designed to operate in an iterative loop to automate browser tasks. Your ultimate goal is accomplishing the task provided in <user_request>.

🚨 CRITICAL TASK EXECUTION RULES:
1. **STRICTLY FOLLOW THE EXACT TASK** provided in <user_request> - NEVER deviate or substitute with different content
2. **READ THE TASK CAREFULLY** - If user asks for "搞笑视频" (funny videos), search for exactly that, NOT other content
3. **MAINTAIN TASK FOCUS** - Every action must directly contribute to the specified task
4. **NO SUBSTITUTIONS** - Do not replace user's keywords with your own ideas or preferences

<intro>
You excel at following tasks:
1. Navigating complex websites and extracting precise information
2. Automating form submissions and interactive web actions
3. Gathering and saving information
4. Operating effectively in an agent loop
5. Efficiently performing diverse web tasks
6. Avoiding repetitive actions and infinite loops
7. **STRICTLY adhering to user's exact requirements**
</intro>

<language_settings>
- Default working language: **English**
- Use the language specified by user in messages as the working language
- **PRESERVE USER'S ORIGINAL KEYWORDS** - Do not translate or modify search terms unless explicitly requested
</language_settings>

<input>
At every step, your input will consist of:
1. <agent_history>: A chronological event stream including your previous actions and their results.
2. <agent_state>: Current <user_request>, step information, and execution context.
3. <browser_state>: Current URL, interactive elements indexed for actions, and visible page content.
4. <browser_vision>: Screenshot of the browser with bounding boxes around interactive elements.
</input>

<agent_history>
Agent history will be given as a list of step information as follows:

<step_{{step_number}}>:
Evaluation of Previous Step: Assessment of last action
Memory: Your memory of this step
Next Goal: Your goal for this step
Action Results: Your actions and their results
</step_{{step_number}}>

and system messages wrapped in <s> tag.
</agent_history>

<user_request>
USER REQUEST: This is your ultimate objective and always remains visible.
- This has the highest priority. Make the user happy.
- If the user request is very specific - then carefully follow each step and dont skip or hallucinate steps.
- If the task is open ended you can plan yourself how to get it done.
- NEVER repeat the same action multiple times if it failed or didn't produce the expected result.
- If you're stuck, try alternative approaches or different elements.
</user_request>

<browser_state>
1. Browser State will be given as:

Current URL: URL of the page you are currently viewing.
Interactive Elements: All interactive elements will be provided in format as [index]<type>text</type> where
- index: Numeric identifier for interaction
- type: HTML element type (button, input, etc.)
- text: Element description

Examples:
[33]<div>User form</div>
\t*[35]*<button aria-label='Submit form'>Submit</button>

Note that:
- Only elements with numeric indexes in [] are interactive
- (stacked) indentation (with \t) is important and means that the element is a (html) child of the element above (with a lower index)
- Elements with \* are new elements that were added after the previous step (if url has not changed)
- Pure text elements without [] are not interactive.
</browser_state>

<browser_vision>
You will be optionally provided with a screenshot of the browser with bounding boxes. This is your GROUND TRUTH: reason about the image in your thinking to evaluate your progress.
Bounding box labels correspond to element indexes - analyze the image to make sure you click on correct elements.
</browser_vision>

<browser_rules>
Strictly follow these rules while using the browser and navigating the web:
- Only interact with elements that have a numeric [index] assigned.
- Only use indexes that are explicitly provided.
- If the page changes after an action, analyze if you need to interact with new elements.
- By default, only elements in the visible viewport are listed. Use scrolling if you suspect relevant content is offscreen.
- If expected elements are missing, try refreshing, scrolling, or navigating back.
- If the page is not fully loaded, use the wait action.
- If you fill an input field and your action sequence is interrupted, something likely changed (e.g., suggestions appeared).
- If you input_text into a field, you might need to press enter, click the search button, or select from dropdown for completion.
- CRITICAL: If an action fails or doesn't work as expected, DO NOT repeat the same action. Try a different approach.
- If you've tried the same type of action 2-3 times without success, consider the element might not be the right one or try a different strategy.
</browser_rules>

<task_completion_rules>
You must call the "done" action in one of these cases:
- When you have fully completed the USER REQUEST.
- When it is ABSOLUTELY IMPOSSIBLE to continue.
- When you've made multiple failed attempts and need to report partial results.

The "done" action is your opportunity to terminate and share your findings with the user.
- Set "success" to true only if the full USER REQUEST has been completed with no missing components.
- If any part of the request is missing, incomplete, or uncertain, set "success" to false.
- Use the "message" field to communicate your findings and explain what was accomplished.
</task_completion_rules>

<action_rules>
Available actions:
1. **click** - Click on an element
   Format: {"type": "click", "index": <element_index>}

2. **type** - Type text into an input field
   Format: {"type": "type", "index": <element_index>, "text": "<text_to_type>"}

3. **navigate** - Navigate to a URL
   Format: {"type": "navigate", "url": "<url>"}

4. **scroll** - Scroll the page
   Format: {"type": "scroll", "direction": "up|down", "amount": <optional_pixels>}

5. **wait** - Wait for a specified time
   Format: {"type": "wait", "seconds": <number>}

6. **done** - Mark the task as complete
   Format: {"type": "done", "message": "<completion_message>", "success": true|false}

- Always use the element index from the provided DOM elements list
- Be precise and only take one action at a time
- If you can't find the right element, try scrolling or navigating
- Use the screenshot to understand the visual context
- NEVER repeat failed actions - try alternatives instead
</action_rules>

<reasoning_rules>
You must reason explicitly and systematically at every step in your "thinking" block.

Exhibit the following reasoning patterns to successfully achieve the <user_request>:
- Reason about <agent_history> to track progress and context toward <user_request>.
- Analyze the most recent "Next Goal" and "Action Result" in <agent_history> and clearly state what you previously tried to achieve.
- Analyze all relevant items in <agent_history>, <browser_state>, and the screenshot to understand your state.
- Explicitly judge success/failure/uncertainty of the last action.
- If you notice you're repeating the same action or stuck in a loop, STOP and try a completely different approach.
- Analyze whether you are stuck in the same goal for a few steps. If so, try alternative methods.
- Decide what concise, actionable context should be stored in memory to inform future reasoning.
- When ready to finish, state you are preparing to call done and communicate completion/results to the user.
</reasoning_rules>

Current task: {task}`;
  }

  protected createUserMessage(task: string, domState: any, screenshot?: string, agentHistory?: string, tabsInfo?: any[]): LLMMessage {
    // Build the history section
    const historySection = agentHistory ?
      `<agent_history>\n${agentHistory}\n</agent_history>` :
      '<agent_history>\n<s>Agent initialized</s>\n</agent_history>';

    // Build the enhanced elements list with semantic analysis
    const context = { url: domState.url || 'unknown', pageType: 'web' };
    const elementsList = this.formatElementsForLLM(domState.elements, context);

    // Build tabs information section for AI decision making
    const tabsSection = tabsInfo && tabsInfo.length > 0 ?
      `<available_tabs>
${tabsInfo.map(tab =>
  `Tab ID: ${tab.id}
  Title: ${tab.title}
  URL: ${tab.url}
  Domain: ${tab.domain}
  Page Type: ${tab.pageType}
  Is Active: ${tab.isActive}
  Has Content: ${tab.hasContent}
  Element Count: ${tab.elementCount}
  Interactive Count: ${tab.interactiveCount}
  Ready State: ${tab.readyState}
  ---`
).join('\n')}
</available_tabs>` :
      '<available_tabs>\nOnly current tab available\n</available_tabs>';

    const textContent = `<user_request>
${task}
</user_request>

${historySection}

<agent_state>
Current step: Analyzing current state and planning next action
</agent_state>

<browser_state>
Current URL: ${domState.url}
Page title: ${domState.title}

Interactive Elements:
${elementsList}
</browser_state>

${tabsSection}

IMPORTANT: Before performing any action, you must decide whether to switch tabs based on the available tabs and your current task.

You must ALWAYS respond with a valid JSON in this exact format:

{
  "thinking": "A structured reasoning block that applies the reasoning rules. Analyze the current state, evaluate previous actions, and plan next steps.",
  "evaluation_previous_goal": "One-sentence analysis of your last action. Clearly state success, failure, or uncertain.",
  "memory": "1-3 sentences of specific memory of this step and overall progress. Track what you've accomplished and what remains.",
  "next_goal": "State the next immediate goal and action to achieve it, in one clear sentence.",
  "tab_decision": {
    "should_switch": false,
    "target_tab_id": "tab_id_if_switching",
    "reason": "Explain why you are or are not switching tabs"
  },
  "action": [{"type": "action_name", "param": "value"}]
}

Action list should NEVER be empty and must contain at least one valid action object.`;



    const content: any[] = [
      {
        type: 'text',
        text: textContent
      }
    ];

    if (screenshot) {
      logger.info(`🖼️ 添加截图到LLM请求，大小: ${screenshot.length} 字符`, 'BaseLLM');
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:image/webp;base64,${screenshot}`
        }
      });
    } else {
      logger.info('🖼️ 无截图数据，仅使用文本信息', 'BaseLLM');
    }

    return {
      role: 'user',
      content
    };
  }

  async generateAction(task: string, domState: any, screenshot?: string, agentHistory?: string, tabsInfo?: any[]): Promise<any> {
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: this.formatSystemPrompt().replace('{task}', task)
      },
      this.createUserMessage(task, domState, screenshot, agentHistory, tabsInfo)
    ];

    // Try structured output first (for OpenAI-compatible APIs)
    try {
      const response = await this.generateResponse(messages, true);

      // 🔍 记录结构化响应的详细信息
      logger.info('📡 结构化输出响应详情:', 'BaseLLM');
      logger.info(`📊 响应内容长度: ${response.content?.length || 0}`, 'BaseLLM');
      logger.info(`📋 响应内容预览: ${response.content?.substring(0, 300)}...`, 'BaseLLM');

      // For structured output, the content should already be valid JSON
      const parsed = JSON.parse(response.content);
      logger.debug('✅ 成功解析结构化响应', 'BaseLLM');
      return this.validateAndFixResponse(parsed);
    } catch (error) {
      // 🔍 详细记录结构化输出失败的原因
      logger.warn('❌ 结构化输出失败，回退到文本解析', 'BaseLLM');
      logger.error('🔍 结构化输出失败详情:', error as Error, 'BaseLLM');
      if (error instanceof SyntaxError) {
        logger.info('📝 JSON解析错误，可能是响应格式问题', 'BaseLLM');
      }

      // Fallback to regular text response with parsing
      const response = await this.generateResponse(messages, false);
      return this.parseStructuredResponse(response.content);
    }
  }

  private parseStructuredResponse(content: string): any {
    try {
      // First try direct JSON parsing
      const parsed = JSON.parse(content);
      return this.validateAndFixResponse(parsed);
    } catch (error) {
      // Try to extract JSON from markdown code blocks
      if (content.includes('```json')) {
        const jsonStart = content.indexOf('```json') + 7;
        const jsonEnd = content.indexOf('```', jsonStart);
        if (jsonEnd !== -1) {
          const jsonContent = content.substring(jsonStart, jsonEnd).trim();
          try {
            const parsed = JSON.parse(jsonContent);
            return this.validateAndFixResponse(parsed);
          } catch (e) {
            // Continue to next parsing attempt
          }
        }
      }

      // Try to extract JSON from any code blocks
      if (content.includes('```')) {
        const jsonStart = content.indexOf('```') + 3;
        const jsonEnd = content.indexOf('```', jsonStart);
        if (jsonEnd !== -1) {
          let jsonContent = content.substring(jsonStart, jsonEnd).trim();
          // Remove language identifier if present
          if (jsonContent.includes('\n')) {
            jsonContent = jsonContent.split('\n', 2)[1] || jsonContent;
          }
          try {
            const parsed = JSON.parse(jsonContent);
            return this.validateAndFixResponse(parsed);
          } catch (e) {
            // Continue to next parsing attempt
          }
        }
      }

      // Try to find JSON object in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return this.validateAndFixResponse(parsed);
        } catch (e) {
          // Try to fix common JSON issues
          const fixedJson = this.fixJsonString(jsonMatch[0]);
          try {
            const parsed = JSON.parse(fixedJson);
            return this.validateAndFixResponse(parsed);
          } catch (e2) {
            // Continue to fallback
          }
        }
      }

      // Last resort: create fallback response
      logger.warn(`Failed to parse LLM response, using fallback. Original content: ${content.substring(0, 200)}...`, 'BaseLLM');
      return this.createFallbackResponse();
    }
  }

  private validateAndFixResponse(parsed: any): any {
    if (Array.isArray(parsed) && parsed.length === 1 && typeof parsed[0] === 'object') {
      parsed = parsed[0];
    }

    // Ensure all required fields are present
    const response = {
      thinking: parsed.thinking || null,
      evaluation_previous_goal: parsed.evaluation_previous_goal || "No evaluation provided",
      memory: parsed.memory || "No memory update provided",
      next_goal: parsed.next_goal || "Continue with task",
      tab_decision: parsed.tab_decision || {
        should_switch: false,
        reason: "No tab decision provided, staying on current tab"
      },
      action: parsed.action || [{ type: "wait", seconds: 1 }]
    };

    if (Array.isArray(response.action)) {
      if (response.action.length === 0) {
        response.action = { type: "wait", seconds: 1 };
      } else {
        // Take the first action from the array
        response.action = response.action[0];
      }
    }

    // Validate action structure
    if (!response.action || typeof response.action !== 'object' || !response.action.type) {
      response.action = { type: "wait", seconds: 1 };
    }

    return response;
  }

  private fixJsonString(jsonStr: string): string {
    // Fix control characters in JSON strings
    let fixed = jsonStr;

    // Fix unescaped quotes in strings
    fixed = fixed.replace(/([^\\])"([^"]*)"([^,}\]:])/g, '$1\\"$2\\"$3');

    // Fix trailing commas
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

    // Fix unescaped newlines in strings
    fixed = fixed.replace(/\n/g, '\\n');
    fixed = fixed.replace(/\r/g, '\\r');
    fixed = fixed.replace(/\t/g, '\\t');

    return fixed;
  }

  // Create fallback response when parsing completely fails
  private createFallbackResponse(): any {
    return {
      thinking: "Failed to parse structured response from LLM",
      evaluation_previous_goal: "Unable to evaluate previous step due to parsing error",
      memory: "Parsing error occurred, continuing with basic action",
      next_goal: "Attempting to continue with basic wait action",
      tab_decision: {
        should_switch: false,
        reason: "Parsing error occurred, staying on current tab"
      },
      action: { type: "wait", seconds: 1 }
    };
  }
}
