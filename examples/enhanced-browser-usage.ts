import { EnhancedBrowserSession } from '../src/browser/enhanced-session';
import { BrowserProfile } from '../src/types';

/**
 * 🌟 增强浏览器使用示例
 * 
 * 展示如何使用不同的连接模式和配置选项
 */

/**
 * 🔗 示例1：连接现有浏览器实例（推荐 - 无自动化痕迹）
 */
export async function connectToExistingBrowser() {
  console.log('🔗 示例1：连接现有浏览器实例\n');

  // 设置环境变量
  process.env.BROWSER_CONNECTION_MODE = 'connect';
  process.env.BROWSER_DEBUG_PORT = '9222';
  process.env.BROWSER_DEBUG_HOST = 'localhost';
  process.env.BROWSER_STEALTH_MODE = 'true';
  process.env.BROWSER_AUTO_CLOSE = 'false';

  const session = new EnhancedBrowserSession();

  try {
    console.log('💡 请先启动调试浏览器：');
    console.log('   node scripts/start-debug-browser.js --browser edge --port 9222\n');

    await session.start();
    console.log('✅ 成功连接到现有浏览器！');

    // 执行一些操作
    await session.navigate('https://www.example.com');
    
    const page = session.getCurrentPage();
    if (page) {
      const title = await page.title();
      console.log(`📄 页面标题: ${title}`);
    }

    console.log('🔗 浏览器将保持运行（连接模式）');

  } catch (error: any) {
    console.error('❌ 连接失败:', error.message);
    console.log('\n💡 故障排除：');
    console.log('1. 确保调试浏览器已启动');
    console.log('2. 检查端口9222是否可用');
    console.log('3. 尝试手动启动调试浏览器');
  } finally {
    await session.close();
  }
}

/**
 * 🏠 示例2：持久化浏览器（保持用户数据）
 */
export async function persistentBrowser() {
  console.log('🏠 示例2：持久化浏览器\n');

  // 自定义配置
  const profile: BrowserProfile = {
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    userDataDir: 'C:\\Users\\1\\AppData\\Local\\Microsoft\\Edge\\User Data',
    headless: false,
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true,
    locale: 'zh-CN',
    timezone: 'Asia/Shanghai',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--exclude-switches=enable-automation',
      '--no-first-run',
      '--disable-extensions-except'
    ]
  };

  // 设置环境变量
  process.env.BROWSER_CONNECTION_MODE = 'persistent';
  process.env.BROWSER_STEALTH_MODE = 'true';
  process.env.BROWSER_MAXIMIZED = 'true';

  const session = new EnhancedBrowserSession(profile);

  try {
    await session.start();
    console.log('✅ 持久化浏览器启动成功！');

    // 测试用户数据持久化
    await session.navigate('https://www.google.com');
    
    const page = session.getCurrentPage();
    if (page) {
      // 设置一些数据
      await page.evaluate(() => {
        localStorage.setItem('test_key', 'persistent_data');
      });

      console.log('💾 已设置持久化数据');
    }

  } catch (error: any) {
    console.error('❌ 启动失败:', error.message);
  } finally {
    await session.close();
  }
}

/**
 * 🔧 示例3：自动调试模式（最佳体验）
 */
export async function autoDebugMode() {
  console.log('🔧 示例3：自动调试模式\n');

  // 设置环境变量
  process.env.BROWSER_CONNECTION_MODE = 'auto_debug';
  process.env.BROWSER_EXECUTABLE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  process.env.BROWSER_USER_DATA_DIR = 'C:\\Users\\1\\AppData\\Local\\Microsoft\\Edge\\User Data';
  process.env.BROWSER_DEBUG_PORT = '9223';
  process.env.BROWSER_STEALTH_MODE = 'true';
  process.env.BROWSER_AUTO_CLOSE = 'false';
  process.env.BROWSER_FULLSCREEN = 'false';
  process.env.BROWSER_MAXIMIZED = 'true';

  const session = new EnhancedBrowserSession();

  try {
    console.log('⏳ 启动自动调试模式...');
    await session.start();
    console.log('✅ 自动调试模式启动成功！');

    // 执行自动化任务
    await performAutomationTask(session);

  } catch (error: any) {
    console.error('❌ 启动失败:', error.message);
  } finally {
    await session.close();
  }
}

/**
 * 🚀 示例4：新实例模式（隐私模式）
 */
export async function launchNewInstance() {
  console.log('🚀 示例4：新实例模式\n');

  // 设置环境变量
  process.env.BROWSER_CONNECTION_MODE = 'launch';
  process.env.BROWSER_STEALTH_MODE = 'true';
  process.env.BROWSER_HEADLESS = 'false';
  process.env.BROWSER_VIEWPORT_WIDTH = '1366';
  process.env.BROWSER_VIEWPORT_HEIGHT = '768';

  const session = new EnhancedBrowserSession();

  try {
    await session.start();
    console.log('✅ 新浏览器实例启动成功！');

    // 执行隐私模式任务
    await session.navigate('https://www.example.com');
    
    const page = session.getCurrentPage();
    if (page) {
      const cookies = await page.context().cookies();
      console.log(`🍪 当前cookies数量: ${cookies.length} (隐私模式)`);
    }

  } catch (error: any) {
    console.error('❌ 启动失败:', error.message);
  } finally {
    await session.close();
  }
}

/**
 * 🎯 示例5：全屏展示模式
 */
export async function fullscreenMode() {
  console.log('🎯 示例5：全屏展示模式\n');

  // 设置环境变量
  process.env.BROWSER_CONNECTION_MODE = 'persistent';
  process.env.BROWSER_FULLSCREEN = 'true';
  process.env.BROWSER_STEALTH_MODE = 'true';
  process.env.BROWSER_VIEWPORT_WIDTH = '1920';
  process.env.BROWSER_VIEWPORT_HEIGHT = '1080';

  const session = new EnhancedBrowserSession();

  try {
    await session.start();
    console.log('✅ 全屏模式启动成功！');

    await session.navigate('https://www.youtube.com');
    console.log('🎬 已导航到YouTube（全屏模式）');

    // 等待用户观看
    console.log('⏳ 全屏展示中，按Ctrl+C退出...');
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error: any) {
    console.error('❌ 启动失败:', error.message);
  } finally {
    await session.close();
  }
}

/**
 * 🧪 执行自动化任务示例
 */
async function performAutomationTask(session: EnhancedBrowserSession) {
  console.log('🧪 执行自动化任务...');

  try {
    const page = session.getCurrentPage();
    if (!page) return;

    // 导航到搜索页面
    await session.navigate('https://www.google.com');
    console.log('🔄 已导航到Google');

    // 等待页面加载
    await page.waitForSelector('input[name="q"]', { timeout: 10000 });

    // 输入搜索内容
    await page.fill('input[name="q"]', 'sentra auto browser');
    console.log('⌨️ 已输入搜索内容');

    // 点击搜索按钮
    await page.press('input[name="q"]', 'Enter');
    console.log('🔍 已执行搜索');

    // 等待搜索结果
    await page.waitForSelector('#search', { timeout: 10000 });
    console.log('📊 搜索结果已加载');

    // 获取搜索结果数量
    const resultCount = await page.evaluate(() => {
      const results = document.querySelectorAll('#search .g');
      return results.length;
    });

    console.log(`📈 找到 ${resultCount} 个搜索结果`);

    // 截图
    const screenshot = await page.screenshot({ 
      type: 'png', 
      fullPage: false 
    });
    console.log(`📸 已截图，大小: ${(screenshot.length / 1024).toFixed(2)} KB`);

  } catch (error: any) {
    console.error('❌ 自动化任务失败:', error.message);
  }
}

/**
 * 🎮 主函数 - 运行所有示例
 */
export async function runAllExamples() {
  console.log('🎮 运行所有增强浏览器示例\n');

  const examples = [
    { name: '连接现有浏览器', fn: connectToExistingBrowser },
    { name: '持久化浏览器', fn: persistentBrowser },
    { name: '自动调试模式', fn: autoDebugMode },
    { name: '新实例模式', fn: launchNewInstance },
    { name: '全屏展示模式', fn: fullscreenMode }
  ];

  for (const example of examples) {
    try {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`🚀 运行示例: ${example.name}`);
      console.log(`${'='.repeat(50)}\n`);

      await example.fn();

      console.log(`\n✅ 示例 "${example.name}" 完成`);
      
      // 等待一下再运行下一个示例
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error: any) {
      console.error(`❌ 示例 "${example.name}" 失败:`, error.message);
    }
  }

  console.log('\n🎉 所有示例运行完成！');
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples().catch(console.error);
}
