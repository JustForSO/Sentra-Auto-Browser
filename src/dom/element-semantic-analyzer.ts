/**
 * 通用元素语义分析器 - 基于元素特征的智能识别系统
 * 
 * 功能：
 * 1. 通过元素属性、文本内容、样式等特征识别元素语义
 * 2. 不依赖特定网站的硬编码规则，具有通用性
 * 3. 基于常见网页元素模式进行智能分类
 * 4. 提供详细的元素描述和操作建议
 */

import { logger } from '../utils/logger';

// 元素语义类型定义
export enum ElementSemanticType {
  // 媒体内容
  VIDEO_CONTENT = 'video_content',           // 视频内容
  AUDIO_CONTENT = 'audio_content',           // 音频内容
  IMAGE_CONTENT = 'image_content',           // 图片内容
  MEDIA_PLAYER = 'media_player',             // 媒体播放器
  
  // 输入控件
  SEARCH_INPUT = 'search_input',             // 搜索输入框
  TEXT_INPUT = 'text_input',                 // 文本输入框
  EMAIL_INPUT = 'email_input',               // 邮箱输入框
  PASSWORD_INPUT = 'password_input',         // 密码输入框
  
  // 按钮控件
  PLAY_BUTTON = 'play_button',               // 播放按钮
  SUBMIT_BUTTON = 'submit_button',           // 提交按钮
  DOWNLOAD_BUTTON = 'download_button',       // 下载按钮
  SHARE_BUTTON = 'share_button',             // 分享按钮
  LIKE_BUTTON = 'like_button',               // 点赞按钮
  
  // 导航元素
  NAVIGATION_LINK = 'navigation_link',       // 导航链接
  BREADCRUMB = 'breadcrumb',                 // 面包屑
  PAGINATION = 'pagination',                 // 分页
  MENU_ITEM = 'menu_item',                   // 菜单项
  
  // 内容区域
  ARTICLE_CONTENT = 'article_content',       // 文章内容
  COMMENT_SECTION = 'comment_section',       // 评论区
  SIDEBAR_CONTENT = 'sidebar_content',       // 侧边栏内容
  FOOTER_CONTENT = 'footer_content',         // 页脚内容
  
  // 商业元素
  ADVERTISEMENT = 'advertisement',           // 广告
  PROMOTION = 'promotion',                   // 推广
  SPONSORED_CONTENT = 'sponsored_content',   // 赞助内容
  SHOPPING_CART = 'shopping_cart',           // 购物车
  
  // 表单元素
  FORM_FIELD = 'form_field',                 // 表单字段
  CHECKBOX = 'checkbox',                     // 复选框
  RADIO_BUTTON = 'radio_button',             // 单选按钮
  DROPDOWN = 'dropdown',                     // 下拉菜单
  
  // 其他
  UTILITY = 'utility',                       // 工具类
  DECORATION = 'decoration',                 // 装饰性
  UNKNOWN = 'unknown'                        // 未知类型
}

// 元素重要性级别
export enum ElementPriority {
  CRITICAL = 5,    // 关键元素（主要内容、核心功能）
  HIGH = 4,        // 高优先级（重要导航、主要按钮）
  MEDIUM = 3,      // 中等优先级（次要功能）
  LOW = 2,         // 低优先级（辅助功能）
  MINIMAL = 1      // 最低优先级（装饰、广告）
}

// 元素分析结果
export interface ElementAnalysisResult {
  semanticType: ElementSemanticType;
  priority: ElementPriority;
  description: string;
  context: string;
  confidence: number;
  tags: string[];
  actionHint: string;
  isRecommended: boolean;
}

// 通用模式匹配规则
interface PatternRule {
  name: string;
  semanticType: ElementSemanticType;
  priority: ElementPriority;
  patterns: {
    tagNames?: string[];
    classKeywords?: string[];
    idKeywords?: string[];
    textKeywords?: string[];
    attributePatterns?: { [key: string]: string[] };
    hrefPatterns?: string[];
    rolePatterns?: string[];
  };
  confidence: number;
  isRecommended?: boolean;
}

export class ElementSemanticAnalyzer {
  private patternRules: PatternRule[] = [];

  constructor() {
    this.initializePatternRules();
  }

  /**
   * 初始化通用模式规则
   */
  private initializePatternRules(): void {
    // 视频内容规则
    this.patternRules.push({
      name: 'video_content',
      semanticType: ElementSemanticType.VIDEO_CONTENT,
      priority: ElementPriority.CRITICAL,
      patterns: {
        tagNames: ['video', 'a'],
        classKeywords: ['video', 'player', 'media', 'movie', 'clip', 'episode', 'watch', 'card'],
        textKeywords: ['播放', 'play', 'watch', '观看', '视频', 'video', '影片', 'movie', '搞笑', '合集', '爆笑'],
        hrefPatterns: ['/video/', '/watch/', '/play/', '/movie/', 'BV'],
        attributePatterns: {
          'data-type': ['video', 'media'],
          'role': ['video', 'media']
        }
      },
      confidence: 0.9,
      isRecommended: true
    });

    // 播放按钮规则
    this.patternRules.push({
      name: 'play_button',
      semanticType: ElementSemanticType.PLAY_BUTTON,
      priority: ElementPriority.HIGH,
      patterns: {
        tagNames: ['button'],
        classKeywords: ['play', 'start', 'begin'],
        textKeywords: ['播放', 'play', 'start', '开始', '▶', '►', '▷'],
        rolePatterns: ['button'],
        attributePatterns: {
          'aria-label': ['play', 'start', '播放'],
          'title': ['play', 'start', '播放']
        }
      },
      confidence: 0.85,
      isRecommended: true
    });

    // 搜索输入框规则
    this.patternRules.push({
      name: 'search_input',
      semanticType: ElementSemanticType.SEARCH_INPUT,
      priority: ElementPriority.HIGH,
      patterns: {
        tagNames: ['input'],
        classKeywords: ['search', 'query', 'find', 'lookup'],
        attributePatterns: {
          'type': ['search'],
          'placeholder': ['search', 'find', '搜索', '查找', 'query'],
          'name': ['search', 'query', 'q', 'keyword'],
          'id': ['search', 'query', 'find']
        }
      },
      confidence: 0.9,
      isRecommended: true
    });

    // 广告内容规则
    this.patternRules.push({
      name: 'advertisement',
      semanticType: ElementSemanticType.ADVERTISEMENT,
      priority: ElementPriority.MINIMAL,
      patterns: {
        tagNames: ['div', 'a', 'span'],
        classKeywords: ['ad', 'ads', 'advertisement', 'promotion', 'sponsor', 'banner', 'commercial', 'promo'],
        idKeywords: ['ad', 'ads', 'advertisement', 'banner'],
        textKeywords: ['广告', 'ad', 'sponsored', '推广', '赞助', '了解更多', '点击'],
        hrefPatterns: ['/ad/', '/ads/', '/promotion/', '/sponsor/'],
        attributePatterns: {
          'data-ad': ['true', '1'],
          'data-type': ['ad', 'advertisement', 'promotion']
        }
      },
      confidence: 0.95,
      isRecommended: false
    });

    // 导航链接规则
    this.patternRules.push({
      name: 'navigation_link',
      semanticType: ElementSemanticType.NAVIGATION_LINK,
      priority: ElementPriority.MEDIUM,
      patterns: {
        tagNames: ['a', 'nav'],
        classKeywords: ['nav', 'navigation', 'menu', 'header', 'navbar', 'sidebar'],
        rolePatterns: ['navigation', 'menuitem'],
        attributePatterns: {
          'role': ['navigation', 'menuitem', 'menu']
        }
      },
      confidence: 0.7
    });

    // 提交按钮规则
    this.patternRules.push({
      name: 'submit_button',
      semanticType: ElementSemanticType.SUBMIT_BUTTON,
      priority: ElementPriority.HIGH,
      patterns: {
        tagNames: ['button', 'input'],
        classKeywords: ['submit', 'send', 'confirm', 'save'],
        textKeywords: ['提交', 'submit', 'send', '发送', '确认', 'confirm', '保存', 'save'],
        attributePatterns: {
          'type': ['submit', 'button'],
          'role': ['button']
        }
      },
      confidence: 0.8,
      isRecommended: true
    });

    // 下载按钮规则
    this.patternRules.push({
      name: 'download_button',
      semanticType: ElementSemanticType.DOWNLOAD_BUTTON,
      priority: ElementPriority.MEDIUM,
      patterns: {
        classKeywords: ['download', 'dl'],
        textKeywords: ['下载', 'download', 'dl', '↓'],
        hrefPatterns: ['/download/', '.zip', '.pdf', '.doc', '.mp4', '.mp3'],
        attributePatterns: {
          'download': ['', 'true']
        }
      },
      confidence: 0.8
    });
  }

  /**
   * 分析元素语义
   */
  public analyzeElement(element: any, context: { url: string; pageType?: string }): ElementAnalysisResult {
    // 使用模式匹配进行分析
    const matchedRule = this.findBestMatchingRule(element);

    if (matchedRule) {
      return this.createAnalysisResult(matchedRule, element);
    }

    // 如果没有匹配的规则，使用基础分析
    return this.performBasicAnalysis(element);
  }

  /**
   * 查找最佳匹配规则
   */
  private findBestMatchingRule(element: any): PatternRule | null {
    let bestRule: PatternRule | null = null;
    let bestScore = 0;

    for (const rule of this.patternRules) {
      const score = this.calculateRuleScore(element, rule);
      if (score > bestScore && score > 0.3) { // 最低匹配阈值
        bestScore = score;
        bestRule = rule;
      }
    }

    return bestRule;
  }

  /**
   * 计算规则匹配分数
   */
  private calculateRuleScore(element: any, rule: PatternRule): number {
    let score = 0;
    let totalChecks = 0;

    const tag = element.tag?.toLowerCase() || '';
    const text = element.text?.toLowerCase() || '';
    const className = element.attributes?.class?.toLowerCase() || '';
    const id = element.attributes?.id?.toLowerCase() || '';
    const href = element.attributes?.href?.toLowerCase() || '';
    const role = element.attributes?.role?.toLowerCase() || '';

    // 检查标签名
    if (rule.patterns.tagNames) {
      totalChecks++;
      if (rule.patterns.tagNames.includes(tag)) {
        score += 0.3; // 标签匹配权重高
      }
    }

    // 检查class关键词
    if (rule.patterns.classKeywords) {
      totalChecks++;
      const matchedKeywords = rule.patterns.classKeywords.filter(keyword =>
        className.includes(keyword.toLowerCase())
      );
      if (matchedKeywords.length > 0) {
        score += 0.25 * (matchedKeywords.length / rule.patterns.classKeywords.length);
      }
    }

    // 检查文本关键词
    if (rule.patterns.textKeywords) {
      totalChecks++;
      const matchedKeywords = rule.patterns.textKeywords.filter(keyword =>
        text.includes(keyword.toLowerCase())
      );
      if (matchedKeywords.length > 0) {
        score += 0.2 * (matchedKeywords.length / rule.patterns.textKeywords.length);
      }
    }

    // 检查ID关键词
    if (rule.patterns.idKeywords) {
      totalChecks++;
      const matchedKeywords = rule.patterns.idKeywords.filter(keyword =>
        id.includes(keyword.toLowerCase())
      );
      if (matchedKeywords.length > 0) {
        score += 0.15 * (matchedKeywords.length / rule.patterns.idKeywords.length);
      }
    }

    // 检查href模式
    if (rule.patterns.hrefPatterns) {
      totalChecks++;
      const matchedPatterns = rule.patterns.hrefPatterns.filter(pattern =>
        href.includes(pattern.toLowerCase())
      );
      if (matchedPatterns.length > 0) {
        score += 0.2 * (matchedPatterns.length / rule.patterns.hrefPatterns.length);
      }
    }

    // 检查role模式
    if (rule.patterns.rolePatterns) {
      totalChecks++;
      if (rule.patterns.rolePatterns.includes(role)) {
        score += 0.15;
      }
    }

    // 检查属性模式
    if (rule.patterns.attributePatterns) {
      for (const [attrName, attrValues] of Object.entries(rule.patterns.attributePatterns)) {
        totalChecks++;
        const elementAttrValue = element.attributes?.[attrName]?.toLowerCase() || '';
        if (attrValues.some(value => elementAttrValue.includes(value.toLowerCase()))) {
          score += 0.1;
        }
      }
    }

    // 归一化分数
    return totalChecks > 0 ? score : 0;
  }

  /**
   * 创建分析结果
   */
  private createAnalysisResult(rule: PatternRule, element: any): ElementAnalysisResult {
    return {
      semanticType: rule.semanticType,
      priority: rule.priority,
      description: this.generateDescription(rule, element),
      context: this.generateContext(rule, element),
      confidence: rule.confidence,
      tags: this.generateTags(rule, element),
      actionHint: this.generateActionHint(rule, element),
      isRecommended: rule.isRecommended || false
    };
  }

  /**
   * 基础分析（当没有匹配规则时）
   */
  private performBasicAnalysis(element: any): ElementAnalysisResult {
    const tag = element.tag?.toLowerCase() || '';
    const text = element.text || '';

    return {
      semanticType: ElementSemanticType.UNKNOWN,
      priority: ElementPriority.MEDIUM,
      description: `${tag}元素: ${text.substring(0, 40)}${text.length > 40 ? '...' : ''}`,
      context: `基础元素，未匹配特定模式`,
      confidence: 0.3,
      tags: [tag],
      actionHint: `与${tag}元素交互`,
      isRecommended: false
    };
  }

  /**
   * 生成元素描述
   */
  private generateDescription(rule: PatternRule, element: any): string {
    const text = element.text || '';
    const semanticType = rule.semanticType;

    switch (semanticType) {
      case ElementSemanticType.VIDEO_CONTENT:
        // 🎯 视频内容显示更长的标题，确保AI能准确识别视频内容
        return `🎬 视频内容: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`;
      case ElementSemanticType.PLAY_BUTTON:
        return `▶️ 播放按钮: ${text || '播放'}`;
      case ElementSemanticType.SEARCH_INPUT:
        return `🔍 搜索框: ${element.attributes?.placeholder || '搜索'}`;
      case ElementSemanticType.ADVERTISEMENT:
        return `📢 广告内容: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`;
      case ElementSemanticType.NAVIGATION_LINK:
        return `🧭 导航链接: ${text || '导航'}`;
      case ElementSemanticType.SUBMIT_BUTTON:
        return `✅ 提交按钮: ${text || '提交'}`;
      case ElementSemanticType.DOWNLOAD_BUTTON:
        return `⬇️ 下载按钮: ${text || '下载'}`;
      default:
        return `${element.tag}元素: ${text.substring(0, 40)}${text.length > 40 ? '...' : ''}`;
    }
  }

  /**
   * 生成上下文信息
   */
  private generateContext(rule: PatternRule, element: any): string {
    const priority = rule.priority;
    const confidence = Math.round(rule.confidence * 100);

    return `优先级: ${priority}/5, 置信度: ${confidence}%, 类型: ${rule.name}`;
  }

  /**
   * 生成标签
   */
  private generateTags(rule: PatternRule, element: any): string[] {
    const tags = [rule.name, element.tag?.toLowerCase() || 'unknown'];

    // 根据语义类型添加相关标签
    switch (rule.semanticType) {
      case ElementSemanticType.VIDEO_CONTENT:
        tags.push('media', 'content', 'video');
        break;
      case ElementSemanticType.PLAY_BUTTON:
        tags.push('control', 'media', 'interactive');
        break;
      case ElementSemanticType.SEARCH_INPUT:
        tags.push('input', 'search', 'query');
        break;
      case ElementSemanticType.ADVERTISEMENT:
        tags.push('ad', 'commercial', 'skip');
        break;
      case ElementSemanticType.NAVIGATION_LINK:
        tags.push('navigation', 'link', 'menu');
        break;
    }

    return [...new Set(tags)]; // 去重
  }

  /**
   * 生成操作提示
   */
  private generateActionHint(rule: PatternRule, element: any): string {
    switch (rule.semanticType) {
      case ElementSemanticType.VIDEO_CONTENT:
        return '🎯 点击观看视频内容';
      case ElementSemanticType.PLAY_BUTTON:
        return '🎯 点击开始播放';
      case ElementSemanticType.SEARCH_INPUT:
        return '🎯 输入搜索关键词';
      case ElementSemanticType.ADVERTISEMENT:
        return '⚠️ 广告内容，建议跳过';
      case ElementSemanticType.NAVIGATION_LINK:
        return '🎯 点击进行导航';
      case ElementSemanticType.SUBMIT_BUTTON:
        return '🎯 点击提交表单';
      case ElementSemanticType.DOWNLOAD_BUTTON:
        return '🎯 点击下载文件';
      default:
        return `🎯 与${element.tag}元素交互`;
    }
  }
}
