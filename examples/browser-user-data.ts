import { BrowserSession } from '../src';
import { logger } from '../src/utils/logger';

/**
 * 🌐 浏览器用户数据目录配置示例
 * 
 * 演示如何使用用户数据目录连接到现有浏览器配置文件，
 * 保持登录状态、书签、扩展等用户数据
 */

async function demonstrateBrowserUserData() {
  console.log('🌐 浏览器用户数据目录配置示例\n');

  // 示例1：使用系统Edge浏览器的用户数据
  await testEdgeUserData();
  
  // 示例2：使用系统Chrome浏览器的用户数据
  await testChromeUserData();
  
  // 示例3：使用自定义用户数据目录
  await testCustomUserData();
  
  // 示例4：不使用用户数据目录（隐私模式）
  await testIncognitoMode();
}

/**
 * 示例1：使用系统Edge浏览器的用户数据
 */
async function testEdgeUserData() {
  console.log('📘 示例1：使用系统Edge浏览器的用户数据');
  
  const session = new BrowserSession({
    // 🎯 关键配置：指定Edge可执行文件路径
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    
    // 🎯 关键配置：指定Edge用户数据目录
    userDataDir: 'C:\\Users\\1\\AppData\\Local\\Microsoft\\Edge\\User Data',
    
    // 其他配置
    headless: false,
    viewport: { width: 1280, height: 720 },
    timeout: 30000,
  });

  try {
    await session.start();
    logger.success('✅ Edge浏览器启动成功，已连接到用户数据', 'Example');
    
    // 导航到需要登录的网站测试
    await session.navigate('https://www.bilibili.com');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 检查是否保持了登录状态
    const isLoggedIn = await session.page?.evaluate(() => {
      // 检查是否有登录用户的标识
      const userAvatar = document.querySelector('.header-avatar-wrap');
      const loginButton = document.querySelector('.right-entry__outside .default-entry');
      return {
        hasUserAvatar: !!userAvatar,
        hasLoginButton: !!loginButton,
        isLoggedIn: !!userAvatar && !loginButton
      };
    });
    
    if (isLoggedIn?.isLoggedIn) {
      logger.success('🎉 检测到已登录状态，用户数据目录配置成功！', 'Example');
    } else {
      logger.info('ℹ️ 未检测到登录状态，可能需要手动登录', 'Example');
    }
    
  } catch (error: any) {
    logger.error('❌ Edge用户数据测试失败', error, 'Example');
    console.log('\n💡 可能的解决方案：');
    console.log('1. 检查Edge浏览器路径是否正确');
    console.log('2. 检查用户数据目录路径是否正确');
    console.log('3. 确保Edge浏览器未在运行（避免冲突）');
    console.log('4. 检查目录权限');
  } finally {
    await session.close();
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
}

/**
 * 示例2：使用系统Chrome浏览器的用户数据
 */
async function testChromeUserData() {
  console.log('🟡 示例2：使用系统Chrome浏览器的用户数据');
  
  const session = new BrowserSession({
    // Chrome配置
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    userDataDir: 'C:\\Users\\1\\AppData\\Local\\Google\\Chrome\\User Data',
    
    headless: false,
    viewport: { width: 1280, height: 720 },
  });

  try {
    await session.start();
    logger.success('✅ Chrome浏览器启动成功', 'Example');
    
    await session.navigate('https://github.com');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error: any) {
    logger.error('❌ Chrome用户数据测试失败', error, 'Example');
  } finally {
    await session.close();
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
}

/**
 * 示例3：使用自定义用户数据目录
 */
async function testCustomUserData() {
  console.log('🔧 示例3：使用自定义用户数据目录');
  
  const customDataDir = './browser-profiles/my-profile';
  
  const session = new BrowserSession({
    // 使用自定义用户数据目录
    userDataDir: customDataDir,
    
    // 可以使用系统浏览器或Playwright默认浏览器
    // executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    
    headless: false,
    viewport: { width: 1920, height: 1080 },
  });

  try {
    await session.start();
    logger.success(`✅ 自定义用户数据目录启动成功: ${customDataDir}`, 'Example');
    
    await session.navigate('https://www.example.com');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('💡 自定义用户数据目录的优势：');
    console.log('- 独立的浏览器配置文件');
    console.log('- 不影响系统浏览器');
    console.log('- 可以保存登录状态和设置');
    console.log('- 适合自动化测试环境');
    
  } catch (error: any) {
    logger.error('❌ 自定义用户数据测试失败', error, 'Example');
  } finally {
    await session.close();
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
}

/**
 * 示例4：不使用用户数据目录（隐私模式）
 */
async function testIncognitoMode() {
  console.log('🕵️ 示例4：隐私模式（不使用用户数据目录）');
  
  const session = new BrowserSession({
    // 不设置 userDataDir，使用临时会话
    headless: false,
    viewport: { width: 1280, height: 720 },
  });

  try {
    await session.start();
    logger.success('✅ 隐私模式启动成功', 'Example');
    
    await session.navigate('https://www.example.com');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('💡 隐私模式的特点：');
    console.log('- 不保存任何用户数据');
    console.log('- 每次启动都是全新环境');
    console.log('- 适合一次性任务');
    console.log('- 更安全，不会泄露个人信息');
    
  } catch (error: any) {
    logger.error('❌ 隐私模式测试失败', error, 'Example');
  } finally {
    await session.close();
  }
}

/**
 * 🛠️ 实用工具函数
 */
export class BrowserUserDataHelper {
  /**
   * 获取常见浏览器的默认用户数据目录
   */
  static getDefaultUserDataDirs() {
    const username = process.env.USERNAME || process.env.USER || '1';
    
    return {
      chrome: {
        windows: `C:\\Users\\${username}\\AppData\\Local\\Google\\Chrome\\User Data`,
        mac: `~/Library/Application Support/Google/Chrome`,
        linux: `~/.config/google-chrome`
      },
      edge: {
        windows: `C:\\Users\\${username}\\AppData\\Local\\Microsoft\\Edge\\User Data`,
        mac: `~/Library/Application Support/Microsoft Edge`,
        linux: `~/.config/microsoft-edge`
      },
      firefox: {
        windows: `C:\\Users\\${username}\\AppData\\Roaming\\Mozilla\\Firefox\\Profiles`,
        mac: `~/Library/Application Support/Firefox/Profiles`,
        linux: `~/.mozilla/firefox`
      }
    };
  }

  /**
   * 检查用户数据目录是否存在
   */
  static checkUserDataDir(path: string): boolean {
    const fs = require('fs');
    return fs.existsSync(path);
  }

  /**
   * 创建自定义用户数据目录
   */
  static createCustomUserDataDir(path: string): boolean {
    const fs = require('fs');
    try {
      if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
        return true;
      }
      return true;
    } catch (error) {
      console.error('创建用户数据目录失败:', error);
      return false;
    }
  }
}

// 运行示例
if (require.main === module) {
  demonstrateBrowserUserData().catch(console.error);
}
