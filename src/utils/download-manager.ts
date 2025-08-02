import { logger } from './logger';
import { Config } from '../config';

/**
 * 📥 下载管理器
 * 
 * 提供统一的下载管理功能：
 * - 自动文件命名（时间戳 + 原文件名）
 * - 文件名清理和安全检查
 * - 下载路径管理
 * - 下载进度监控
 * - 重复文件处理
 */
export class DownloadManager {
  private downloadsPath: string;
  private downloadHistory: DownloadRecord[] = [];

  constructor(downloadsPath?: string) {
    this.downloadsPath = downloadsPath || Config.getDefaultDownloadsPath();
    this.ensureDownloadsDirectory();
  }

  /**
   * 🔧 确保下载目录存在
   */
  private ensureDownloadsDirectory(): void {
    const fs = require('fs');

    try {
      if (!fs.existsSync(this.downloadsPath)) {
        fs.mkdirSync(this.downloadsPath, { recursive: true });
        logger.info(`📁 创建下载目录: ${this.downloadsPath}`, 'DownloadManager');
      }
    } catch (error: any) {
      logger.warn(`⚠️ 无法创建下载目录: ${error.message}`, 'DownloadManager');
    }
  }

  /**
   * 📝 生成安全的文件名
   */
  generateSafeFileName(originalName: string, addTimestamp: boolean = true): string {
    // 清理文件名
    let safeName = this.sanitizeFileName(originalName);
    
    // 添加时间戳前缀
    if (addTimestamp) {
      const timestamp = new Date().toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '_')
        .substring(0, 19); // YYYY-MM-DD_HH-MM-SS
      
      const extension = this.getFileExtension(safeName);
      const nameWithoutExt = this.getFileNameWithoutExtension(safeName);
      
      safeName = `${timestamp}_${nameWithoutExt}${extension}`;
    }

    // 检查重复文件
    return this.handleDuplicateFileName(safeName);
  }

  /**
   * 🧹 清理文件名，移除不安全字符
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[<>:"/\\|?*]/g, '_')  // 替换不安全字符为下划线
      .replace(/\s+/g, '_')           // 替换空格为下划线
      .replace(/_{2,}/g, '_')         // 合并多个下划线
      .replace(/^_+|_+$/g, '')       // 移除开头和结尾的下划线
      .substring(0, 200);            // 限制文件名长度
  }

  /**
   * 📄 获取文件扩展名
   */
  private getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex > 0 ? fileName.substring(lastDotIndex) : '';
  }

  /**
   * 📄 获取不含扩展名的文件名
   */
  private getFileNameWithoutExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  }

  /**
   * 🔄 处理重复文件名
   */
  private handleDuplicateFileName(fileName: string): string {
    const fs = require('fs');
    const path = require('path');
    
    let finalName = fileName;
    let counter = 1;
    
    while (fs.existsSync(path.join(this.downloadsPath, finalName))) {
      const extension = this.getFileExtension(fileName);
      const nameWithoutExt = this.getFileNameWithoutExtension(fileName);
      finalName = `${nameWithoutExt}_(${counter})${extension}`;
      counter++;
    }
    
    return finalName;
  }

  /**
   * 📥 处理下载
   */
  async handleDownload(download: any, customName?: string): Promise<DownloadResult> {
    try {
      const originalName = download.suggestedFilename() || 'download';
      const downloadUrl = download.url();

      logger.info(`🔗 开始下载: ${originalName}`, 'DownloadManager');
      logger.info(`🌐 下载链接: ${downloadUrl}`, 'DownloadManager');

      const fileName = customName ?
        this.generateSafeFileName(customName, false) :
        this.generateSafeFileName(originalName, false);

      const fullPath = require('path').join(this.downloadsPath, fileName);

      // 开始下载
      const startTime = Date.now();
      await download.saveAs(fullPath);
      const endTime = Date.now();

      // 获取文件信息
      const fs = require('fs');
      const stats = fs.statSync(fullPath);

      // 检查文件是否真的存在且有内容
      if (!fs.existsSync(fullPath)) {
        throw new Error('下载的文件不存在');
      }

      if (stats.size === 0) {
        throw new Error('下载的文件为空');
      }

      // 尝试检测文件类型
      const fileType = this.detectFileType(fullPath);

      const result: DownloadResult = {
        success: true,
        originalName,
        fileName,
        fullPath,
        size: stats.size,
        duration: endTime - startTime,
        timestamp: new Date(),
        fileType
      };

      // 记录下载历史
      this.downloadHistory.push({
        ...result,
        url: downloadUrl
      });

      logger.success(`📥 文件下载完成: ${fileName}`, 'DownloadManager');
      logger.info(`📁 保存路径: ${fullPath}`, 'DownloadManager');
      logger.info(`📊 文件大小: ${this.formatFileSize(stats.size)}`, 'DownloadManager');
      logger.info(`🔍 文件类型: ${fileType}`, 'DownloadManager');

      // 如果是Windows可执行文件，添加安全提示
      if (fileType.includes('executable') || fileName.endsWith('.exe')) {
        logger.warn(`⚠️ 安全提示: 这是一个可执行文件，请确认来源安全后再运行`, 'DownloadManager');
        logger.info(`💡 如果无法运行，请检查Windows安全设置或右键选择"属性"->"解除阻止"`, 'DownloadManager');
      }

      return result;
    } catch (error: any) {
      const result: DownloadResult = {
        success: false,
        originalName: download.suggestedFilename() || 'download',
        fileName: '',
        fullPath: '',
        size: 0,
        duration: 0,
        timestamp: new Date(),
        error: error.message
      };

      logger.error(`❌ 下载失败: ${error.message}`, error, 'DownloadManager');
      return result;
    }
  }

  /**
   * 🔍 检测文件类型
   */
  private detectFileType(filePath: string): string {
    try {
      const fs = require('fs');
      const buffer = fs.readFileSync(filePath, { start: 0, end: 16 });

      // 检查文件头魔数
      const hex = buffer.toString('hex').toUpperCase();

      if (hex.startsWith('4D5A')) {
        return 'Windows executable (PE)';
      } else if (hex.startsWith('504B0304')) {
        return 'ZIP archive';
      } else if (hex.startsWith('25504446')) {
        return 'PDF document';
      } else if (hex.startsWith('FFD8FF')) {
        return 'JPEG image';
      } else if (hex.startsWith('89504E47')) {
        return 'PNG image';
      } else if (hex.startsWith('474946')) {
        return 'GIF image';
      } else {
        return 'Unknown file type';
      }
    } catch (error) {
      return 'Unable to detect file type';
    }
  }

  /**
   * 📊 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * 📋 获取下载历史
   */
  getDownloadHistory(): DownloadRecord[] {
    return [...this.downloadHistory];
  }

  /**
   * 🗂️ 获取下载目录路径
   */
  getDownloadsPath(): string {
    return this.downloadsPath;
  }

  /**
   * 🧹 清理下载历史
   */
  clearHistory(): void {
    this.downloadHistory = [];
    logger.info('🧹 下载历史已清理', 'DownloadManager');
  }
}

/**
 * 下载结果接口
 */
export interface DownloadResult {
  success: boolean;
  originalName: string;
  fileName: string;
  fullPath: string;
  size: number;
  duration: number;
  timestamp: Date;
  fileType?: string;
  error?: string;
}

/**
 * 下载记录接口
 */
export interface DownloadRecord extends DownloadResult {
  url: string;
}

/**
 * 默认下载管理器实例
 */
export const defaultDownloadManager = new DownloadManager();
