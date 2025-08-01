/**
 * 符号兼容性工具类
 * 提供跨平台兼容的符号显示，避免在某些终端中显示不正常的emoji
 */

export class Symbols {
  // 检测终端是否支持Unicode符号
  private static supportsUnicode(): boolean {
    // 检查是否强制使用ASCII
    if (this.isForceAscii()) return false;

    // 检查是否强制使用Unicode
    if (this.isForceUnicode()) return true;

    // 检查环境变量
    if (process.env.TERM_PROGRAM === 'vscode') return true;
    if (process.env.TERM_PROGRAM === 'iTerm.app') return true;
    if (process.env.TERM_PROGRAM === 'Apple_Terminal') return true;

    // 检查Windows Terminal
    if (process.env.WT_SESSION) return true;

    // 检查是否在CI环境中
    if (process.env.CI) return false;

    // Windows命令提示符通常不支持Unicode
    if (process.platform === 'win32' && !process.env.WT_SESSION) return false;

    // 默认情况下使用简单符号
    return false;
  }

  // 获取状态符号
  static getStatus(type: 'success' | 'error' | 'warning' | 'info' | 'loading'): string {
    const unicode = this.supportsUnicode();
    
    switch (type) {
      case 'success':
        return unicode ? '✅' : '[OK]';
      case 'error':
        return unicode ? '❌' : '[ERROR]';
      case 'warning':
        return unicode ? '⚠️' : '[WARN]';
      case 'info':
        return unicode ? 'ℹ️' : '[INFO]';
      case 'loading':
        return unicode ? '⏳' : '[LOADING]';
      default:
        return '[?]';
    }
  }

  // 获取操作符号
  static getAction(type: 'step' | 'execute' | 'navigate' | 'click' | 'type' | 'done'): string {
    const unicode = this.supportsUnicode();
    
    switch (type) {
      case 'step':
        return unicode ? '🔄' : '[STEP]';
      case 'execute':
        return unicode ? '➤' : '>';
      case 'navigate':
        return unicode ? '🌐' : '[NAV]';
      case 'click':
        return unicode ? '👆' : '[CLICK]';
      case 'type':
        return unicode ? '⌨️' : '[TYPE]';
      case 'done':
        return unicode ? '🎯' : '[DONE]';
      default:
        return '[ACTION]';
    }
  }

  // 获取系统符号
  static getSystem(type: 'robot' | 'browser' | 'model' | 'vision' | 'config' | 'test' | 'summary'): string {
    const unicode = this.supportsUnicode();
    
    switch (type) {
      case 'robot':
        return unicode ? '🤖' : '[BOT]';
      case 'browser':
        return unicode ? '🌐' : '[BROWSER]';
      case 'model':
        return unicode ? '🧠' : '[MODEL]';
      case 'vision':
        return unicode ? '👁️' : '[VISION]';
      case 'config':
        return unicode ? '🔧' : '[CONFIG]';
      case 'test':
        return unicode ? '🧪' : '[TEST]';
      case 'summary':
        return unicode ? '📊' : '[SUMMARY]';
      default:
        return '[SYS]';
    }
  }

  // 获取进度符号
  static getProgress(type: 'start' | 'working' | 'complete' | 'failed'): string {
    const unicode = this.supportsUnicode();
    
    switch (type) {
      case 'start':
        return unicode ? '🚀' : '[START]';
      case 'working':
        return unicode ? '⚙️' : '[WORK]';
      case 'complete':
        return unicode ? '🎉' : '[COMPLETE]';
      case 'failed':
        return unicode ? '💥' : '[FAILED]';
      default:
        return '[PROGRESS]';
    }
  }

  // 获取任务符号
  static getTask(type: 'task' | 'target' | 'result' | 'memory' | 'plan'): string {
    const unicode = this.supportsUnicode();
    
    switch (type) {
      case 'task':
        return unicode ? '📋' : '[TASK]';
      case 'target':
        return unicode ? '🎯' : '[TARGET]';
      case 'result':
        return unicode ? '📄' : '[RESULT]';
      case 'memory':
        return unicode ? '🧠' : '[MEMORY]';
      case 'plan':
        return unicode ? '📝' : '[PLAN]';
      default:
        return '[TASK]';
    }
  }

  // 获取箭头符号
  static getArrow(type: 'right' | 'left' | 'up' | 'down'): string {
    const unicode = this.supportsUnicode();
    
    switch (type) {
      case 'right':
        return unicode ? '→' : '->';
      case 'left':
        return unicode ? '←' : '<-';
      case 'up':
        return unicode ? '↑' : '^';
      case 'down':
        return unicode ? '↓' : 'v';
      default:
        return '->';
    }
  }

  // 获取分隔符
  static getSeparator(type: 'line' | 'dot' | 'dash'): string {
    const unicode = this.supportsUnicode();
    
    switch (type) {
      case 'line':
        return unicode ? '─' : '-';
      case 'dot':
        return unicode ? '•' : '*';
      case 'dash':
        return unicode ? '–' : '--';
      default:
        return '-';
    }
  }

  // 强制使用ASCII符号（用于CI环境或兼容性要求高的场景）
  static forceAscii(): void {
    // 设置环境变量强制使用ASCII
    process.env.FORCE_ASCII_SYMBOLS = 'true';
  }

  // 强制使用Unicode符号
  static forceUnicode(): void {
    // 设置环境变量强制使用Unicode
    process.env.FORCE_UNICODE_SYMBOLS = 'true';
  }

  // 检查是否强制使用ASCII
  private static isForceAscii(): boolean {
    return process.env.FORCE_ASCII_SYMBOLS === 'true';
  }

  // 检查是否强制使用Unicode
  private static isForceUnicode(): boolean {
    return process.env.FORCE_UNICODE_SYMBOLS === 'true';
  }
}
