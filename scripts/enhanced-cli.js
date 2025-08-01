#!/usr/bin/env node

/**
 * 🚀 增强CLI工具
 * 
 * 支持多种浏览器连接模式和配置选项
 */

const { program } = require('commander');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 版本信息
const packageJson = require('../package.json');

program
  .name('sentra-enhanced')
  .description('🌟 Sentra Auto Browser 增强CLI工具')
  .version(packageJson.version);

/**
 * 🔗 连接命令 - 连接到现有浏览器
 */
program
  .command('connect')
  .description('🔗 连接到现有调试浏览器实例')
  .option('-p, --port <port>', '调试端口', '9222')
  .option('-h, --host <host>', '调试主机', 'localhost')
  .option('--stealth', '启用反检测模式', false)
  .option('--no-close', '不自动关闭浏览器', false)
  .argument('<task>', '要执行的任务')
  .action(async (task, options) => {
    console.log('🔗 连接模式启动...\n');

    // 设置环境变量
    process.env.BROWSER_CONNECTION_MODE = 'connect';
    process.env.BROWSER_DEBUG_PORT = options.port;
    process.env.BROWSER_DEBUG_HOST = options.host;
    process.env.BROWSER_STEALTH_MODE = options.stealth ? 'true' : 'false';
    process.env.BROWSER_AUTO_CLOSE = options.close ? 'true' : 'false';

    console.log('📋 连接配置:');
    console.log(`   调试地址: ${options.host}:${options.port}`);
    console.log(`   反检测模式: ${options.stealth ? '启用' : '禁用'}`);
    console.log(`   自动关闭: ${options.close ? '是' : '否'}`);
    console.log('');

    await runTask(task);
  });

/**
 * 🏠 持久化命令 - 使用用户数据目录
 */
program
  .command('persistent')
  .description('🏠 启动持久化浏览器（保持用户数据）')
  .option('-b, --browser <path>', '浏览器可执行文件路径')
  .option('-u, --user-data <dir>', '用户数据目录')
  .option('--stealth', '启用反检测模式', false)
  .option('--fullscreen', '全屏模式', false)
  .option('--maximized', '最大化窗口', true)
  .argument('<task>', '要执行的任务')
  .action(async (task, options) => {
    console.log('🏠 持久化模式启动...\n');

    // 设置环境变量
    process.env.BROWSER_CONNECTION_MODE = 'persistent';
    if (options.browser) process.env.BROWSER_EXECUTABLE_PATH = options.browser;
    if (options.userData) process.env.BROWSER_USER_DATA_DIR = options.userData;
    process.env.BROWSER_STEALTH_MODE = options.stealth ? 'true' : 'false';
    process.env.BROWSER_FULLSCREEN = options.fullscreen ? 'true' : 'false';
    process.env.BROWSER_MAXIMIZED = options.maximized ? 'true' : 'false';

    console.log('📋 持久化配置:');
    console.log(`   浏览器: ${options.browser || '(默认)'}`);
    console.log(`   用户数据: ${options.userData || '(默认)'}`);
    console.log(`   反检测模式: ${options.stealth ? '启用' : '禁用'}`);
    console.log(`   显示模式: ${options.fullscreen ? '全屏' : options.maximized ? '最大化' : '窗口'}`);
    console.log('');

    await runTask(task);
  });

/**
 * 🔧 自动调试命令 - 自动启动调试浏览器然后连接
 */
program
  .command('auto-debug')
  .description('🔧 自动启动调试浏览器然后连接')
  .option('-b, --browser <path>', '浏览器可执行文件路径')
  .option('-u, --user-data <dir>', '用户数据目录')
  .option('-p, --port <port>', '调试端口', '9222')
  .option('--stealth', '启用反检测模式', true)
  .option('--no-close', '不自动关闭浏览器', false)
  .argument('<task>', '要执行的任务')
  .action(async (task, options) => {
    console.log('🔧 自动调试模式启动...\n');

    // 设置环境变量
    process.env.BROWSER_CONNECTION_MODE = 'auto_debug';
    if (options.browser) process.env.BROWSER_EXECUTABLE_PATH = options.browser;
    if (options.userData) process.env.BROWSER_USER_DATA_DIR = options.userData;
    process.env.BROWSER_DEBUG_PORT = options.port;
    process.env.BROWSER_STEALTH_MODE = options.stealth ? 'true' : 'false';
    process.env.BROWSER_AUTO_CLOSE = options.close ? 'true' : 'false';

    console.log('📋 自动调试配置:');
    console.log(`   浏览器: ${options.browser || '(默认)'}`);
    console.log(`   用户数据: ${options.userData || '(默认)'}`);
    console.log(`   调试端口: ${options.port}`);
    console.log(`   反检测模式: ${options.stealth ? '启用' : '禁用'}`);
    console.log(`   自动关闭: ${options.close ? '是' : '否'}`);
    console.log('');

    await runTask(task);
  });

/**
 * 🚀 启动命令 - 启动新浏览器实例
 */
program
  .command('launch')
  .description('🚀 启动新浏览器实例（隐私模式）')
  .option('-b, --browser <path>', '浏览器可执行文件路径')
  .option('--headless', '无头模式', false)
  .option('--stealth', '启用反检测模式', true)
  .option('--width <width>', '窗口宽度', '1920')
  .option('--height <height>', '窗口高度', '1080')
  .argument('<task>', '要执行的任务')
  .action(async (task, options) => {
    console.log('🚀 启动模式启动...\n');

    // 设置环境变量
    process.env.BROWSER_CONNECTION_MODE = 'launch';
    if (options.browser) process.env.BROWSER_EXECUTABLE_PATH = options.browser;
    process.env.BROWSER_HEADLESS = options.headless ? 'true' : 'false';
    process.env.BROWSER_STEALTH_MODE = options.stealth ? 'true' : 'false';
    process.env.BROWSER_VIEWPORT_WIDTH = options.width;
    process.env.BROWSER_VIEWPORT_HEIGHT = options.height;

    console.log('📋 启动配置:');
    console.log(`   浏览器: ${options.browser || '(默认)'}`);
    console.log(`   显示模式: ${options.headless ? '无头' : '有头'}`);
    console.log(`   反检测模式: ${options.stealth ? '启用' : '禁用'}`);
    console.log(`   窗口大小: ${options.width}x${options.height}`);
    console.log('');

    await runTask(task);
  });

/**
 * 🛠️ 调试浏览器命令
 */
program
  .command('start-debug')
  .description('🛠️ 启动调试浏览器实例')
  .option('-b, --browser <name>', '浏览器类型 (edge, chrome)', 'edge')
  .option('-p, --port <port>', '调试端口', '9222')
  .option('-u, --user-data <dir>', '用户数据目录')
  .option('--headless', '无头模式', false)
  .action(async (options) => {
    console.log('🛠️ 启动调试浏览器...\n');

    const scriptPath = path.join(__dirname, 'start-debug-browser.js');
    const args = [
      '--browser', options.browser,
      '--port', options.port
    ];

    if (options.userData) {
      args.push('--user-data-dir', options.userData);
    }

    if (options.headless) {
      args.push('--headless');
    }

    console.log(`🚀 执行命令: node ${scriptPath} ${args.join(' ')}`);
    console.log('');

    const child = spawn('node', [scriptPath, ...args], {
      stdio: 'inherit',
      cwd: __dirname
    });

    child.on('error', (error) => {
      console.error('❌ 启动调试浏览器失败:', error.message);
      process.exit(1);
    });

    child.on('exit', (code) => {
      if (code !== 0) {
        console.error(`❌ 调试浏览器退出，代码: ${code}`);
        process.exit(code);
      }
    });
  });

/**
 * 🧪 测试命令
 */
program
  .command('test')
  .description('🧪 测试增强浏览器功能')
  .option('-m, --mode <mode>', '连接模式 (connect, persistent, launch, auto_debug)', 'persistent')
  .action(async (options) => {
    console.log('🧪 测试增强浏览器功能...\n');

    // 设置测试环境变量
    process.env.BROWSER_CONNECTION_MODE = options.mode;

    const testScript = path.join(__dirname, '..', 'test-enhanced-browser.js');
    
    console.log(`🔧 测试模式: ${options.mode}`);
    console.log(`🚀 执行测试: node ${testScript}`);
    console.log('');

    const child = spawn('node', [testScript], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });

    child.on('error', (error) => {
      console.error('❌ 测试失败:', error.message);
      process.exit(1);
    });

    child.on('exit', (code) => {
      if (code === 0) {
        console.log('\n✅ 测试完成');
      } else {
        console.error(`\n❌ 测试失败，退出代码: ${code}`);
        process.exit(code);
      }
    });
  });

/**
 * 📋 配置命令
 */
program
  .command('config')
  .description('📋 显示和管理配置')
  .option('--show', '显示当前配置', false)
  .option('--create-env', '创建示例环境文件', false)
  .action(async (options) => {
    if (options.show) {
      showCurrentConfig();
    }

    if (options.createEnv) {
      await createExampleEnv();
    }

    if (!options.show && !options.createEnv) {
      showCurrentConfig();
    }
  });

/**
 * 🚀 执行任务
 */
async function runTask(task) {
  console.log(`🎯 执行任务: ${task}\n`);

  const cliPath = path.join(__dirname, '..', 'dist', 'cli', 'index.js');
  
  if (!fs.existsSync(cliPath)) {
    console.error('❌ CLI文件不存在，请先编译项目:');
    console.error('   npm run build');
    process.exit(1);
  }

  const child = spawn('node', [cliPath, 'run', task], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });

  child.on('error', (error) => {
    console.error('❌ 任务执行失败:', error.message);
    process.exit(1);
  });

  child.on('exit', (code) => {
    if (code === 0) {
      console.log('\n✅ 任务完成');
    } else {
      console.error(`\n❌ 任务失败，退出代码: ${code}`);
      process.exit(code);
    }
  });
}

/**
 * 📋 显示当前配置
 */
function showCurrentConfig() {
  console.log('📋 当前配置:\n');

  const configs = [
    { key: 'BROWSER_CONNECTION_MODE', desc: '连接模式' },
    { key: 'BROWSER_EXECUTABLE_PATH', desc: '浏览器路径' },
    { key: 'BROWSER_USER_DATA_DIR', desc: '用户数据目录' },
    { key: 'BROWSER_DEBUG_PORT', desc: '调试端口' },
    { key: 'BROWSER_DEBUG_HOST', desc: '调试主机' },
    { key: 'BROWSER_STEALTH_MODE', desc: '反检测模式' },
    { key: 'BROWSER_AUTO_CLOSE', desc: '自动关闭' },
    { key: 'BROWSER_FULLSCREEN', desc: '全屏模式' },
    { key: 'BROWSER_MAXIMIZED', desc: '最大化窗口' },
    { key: 'BROWSER_VIEWPORT_WIDTH', desc: '视口宽度' },
    { key: 'BROWSER_VIEWPORT_HEIGHT', desc: '视口高度' }
  ];

  for (const config of configs) {
    const value = process.env[config.key] || '(未设置)';
    console.log(`   ${config.desc}: ${value}`);
  }

  console.log('\n💡 使用 --create-env 创建示例配置文件');
}

/**
 * 📝 创建示例环境文件
 */
async function createExampleEnv() {
  const envPath = path.join(__dirname, '..', '.env.example-enhanced');
  
  const envContent = `# 🌟 Sentra Auto Browser 增强配置示例

# ===== 🎯 浏览器连接配置 =====
# 连接模式: connect, persistent, launch, auto_debug
BROWSER_CONNECTION_MODE=persistent

# 调试连接配置（connect 和 auto_debug 模式）
BROWSER_DEBUG_PORT=9222
BROWSER_DEBUG_HOST=localhost

# ===== 🔧 浏览器路径配置 =====
# Edge浏览器路径
BROWSER_EXECUTABLE_PATH=C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe

# Chrome浏览器路径（备选）
# BROWSER_EXECUTABLE_PATH=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe

# 用户数据目录
BROWSER_USER_DATA_DIR=C:\\Users\\1\\AppData\\Local\\Microsoft\\Edge\\User Data

# ===== 🎨 显示配置 =====
BROWSER_FULLSCREEN=false
BROWSER_MAXIMIZED=true
BROWSER_KIOSK_MODE=false

# 窗口位置和大小
BROWSER_WINDOW_X=0
BROWSER_WINDOW_Y=0
BROWSER_WINDOW_WIDTH=1920
BROWSER_WINDOW_HEIGHT=1080

# 视口配置
BROWSER_VIEWPORT_WIDTH=1920
BROWSER_VIEWPORT_HEIGHT=1080

# ===== 🥷 反检测配置 =====
BROWSER_STEALTH_MODE=true
BROWSER_AUTO_CLOSE=false

# ===== 🔑 API配置 =====
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o

# ===== 📊 其他配置 =====
LOG_LEVEL=info
DEBUG=false
`;

  try {
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ 示例配置文件已创建: ${envPath}`);
    console.log('💡 请复制并重命名为 .env，然后修改配置值');
  } catch (error) {
    console.error('❌ 创建配置文件失败:', error.message);
  }
}

// 解析命令行参数
program.parse();

// 如果没有提供命令，显示帮助
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
