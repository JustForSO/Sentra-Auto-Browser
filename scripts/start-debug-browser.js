#!/usr/bin/env node

/**
 * 🚀 浏览器调试模式启动助手
 * 
 * 用于启动支持远程调试的浏览器实例，
 * 然后 sentra-auto-browser 可以连接到这个实例进行自动化操作
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

// 默认配置
const DEFAULT_CONFIG = {
  debugPort: 9222,
  debugHost: 'localhost',
  executablePath: {
    edge: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    chromium: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  },
  userDataDir: {
    edge: 'C:\\Users\\1\\AppData\\Local\\Microsoft\\Edge\\User Data',
    chrome: 'C:\\Users\\1\\AppData\\Local\\Google\\Chrome\\User Data'
  }
};

/**
 * 🔍 检测可用的浏览器
 */
function detectAvailableBrowsers() {
  const browsers = [];
  
  for (const [name, execPath] of Object.entries(DEFAULT_CONFIG.executablePath)) {
    if (fs.existsSync(execPath)) {
      browsers.push({
        name: name,
        executablePath: execPath,
        userDataDir: DEFAULT_CONFIG.userDataDir[name] || null
      });
    }
  }
  
  return browsers;
}

/**
 * 🔌 检查端口是否被占用
 */
function checkPortInUse(port, host = 'localhost') {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(1000);

    socket.on('connect', () => {
      socket.destroy();
      resolve(true); // 端口被占用
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false); // 端口未被占用
    });

    socket.on('error', () => {
      socket.destroy();
      resolve(false); // 端口未被占用
    });

    socket.connect(port, host);
  });
}

/**
 * 🔍 检查用户数据目录是否被占用
 */
function checkUserDataDirInUse(userDataDir) {
  if (!userDataDir) return false;

  const path = require('path');
  const fs = require('fs');

  try {
    // 检查SingletonLock文件（Chrome/Edge用来防止多实例）
    const lockFile = path.join(userDataDir, 'SingletonLock');
    const lockSocket = path.join(userDataDir, 'SingletonSocket');
    const lockCookie = path.join(userDataDir, 'SingletonCookie');

    // 如果存在锁文件，说明有实例在使用
    if (fs.existsSync(lockFile) || fs.existsSync(lockSocket) || fs.existsSync(lockCookie)) {
      return true;
    }

    return false;
  } catch (error) {
    // 如果无法检查，假设未被占用
    return false;
  }
}

/**
 * 🧹 清理用户数据目录锁文件
 */
function cleanupUserDataDirLocks(userDataDir) {
  if (!userDataDir) return false;

  const path = require('path');
  const fs = require('fs');

  try {
    const lockFiles = [
      path.join(userDataDir, 'SingletonLock'),
      path.join(userDataDir, 'SingletonSocket'),
      path.join(userDataDir, 'SingletonCookie')
    ];

    let cleaned = false;
    for (const lockFile of lockFiles) {
      if (fs.existsSync(lockFile)) {
        try {
          fs.unlinkSync(lockFile);
          console.log(`🧹 已清理锁文件: ${path.basename(lockFile)}`);
          cleaned = true;
        } catch (error) {
          console.warn(`⚠️ 无法清理锁文件 ${path.basename(lockFile)}: ${error.message}`);
        }
      }
    }

    return cleaned;
  } catch (error) {
    console.warn(`⚠️ 清理锁文件时出错: ${error.message}`);
    return false;
  }
}

/**
 * 🔍 检测正在运行的浏览器实例
 */
function detectRunningBrowserInstances(browserName = 'msedge') {
  const { execSync } = require('child_process');

  try {
    // 使用tasklist命令检查正在运行的进程
    const command = `tasklist /FI "IMAGENAME eq ${browserName}.exe" /FO CSV`;
    const output = execSync(command, { encoding: 'utf8' });

    // 解析输出，计算实例数量
    const lines = output.split('\n').filter(line => line.includes(browserName));
    return lines.length;
  } catch (error) {
    // 如果命令失败，返回0
    return 0;
  }
}

/**
 * 🚀 启动调试浏览器
 */
async function startDebugBrowser(options = {}) {
  const {
    browser = 'edge',
    debugPort = DEFAULT_CONFIG.debugPort,
    debugHost = DEFAULT_CONFIG.debugHost,
    userDataDir = null,
    executablePath = null,
    headless = false,
    additionalArgs = []
  } = options;

  console.log('🚀 启动调试浏览器...\n');

  // 检测可用浏览器
  const availableBrowsers = detectAvailableBrowsers();
  
  if (availableBrowsers.length === 0) {
    console.error('❌ 未找到可用的浏览器！');
    console.log('💡 请确保已安装以下浏览器之一：');
    console.log('   - Microsoft Edge');
    console.log('   - Google Chrome');
    process.exit(1);
  }

  // 选择浏览器
  let selectedBrowser = availableBrowsers.find(b => b.name === browser);
  if (!selectedBrowser) {
    selectedBrowser = availableBrowsers[0];
    console.log(`⚠️ 指定的浏览器 "${browser}" 不可用，使用 "${selectedBrowser.name}"`);
  }

  const finalExecPath = executablePath || selectedBrowser.executablePath;
  const finalUserDataDir = userDataDir || selectedBrowser.userDataDir;

  console.log(`📋 浏览器配置:`);
  console.log(`   浏览器: ${selectedBrowser.name}`);
  console.log(`   可执行文件: ${finalExecPath}`);
  console.log(`   用户数据目录: ${finalUserDataDir || '(临时目录)'}`);
  console.log(`   调试端口: ${debugHost}:${debugPort}`);
  console.log('');

  // 检查用户数据目录是否被占用
  if (finalUserDataDir) {
    const isUserDataInUse = checkUserDataDirInUse(finalUserDataDir);
    if (isUserDataInUse) {
      console.log('⚠️ 用户数据目录正在被其他浏览器实例使用');

      // 检测正在运行的浏览器实例
      const runningInstances = detectRunningBrowserInstances(selectedBrowser.name === 'edge' ? 'msedge' : 'chrome');
      console.log(`🔍 检测到 ${runningInstances} 个正在运行的${selectedBrowser.name}实例`);

      console.log('💡 解决方案：');
      console.log('   1. 关闭其他浏览器实例');
      console.log('   2. 使用不同的用户数据目录');
      console.log('   3. 连接到现有实例（如果支持调试）');
      console.log('   4. 强制清理锁文件（风险操作）');
      console.log('');

      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        rl.question('选择操作 (1=关闭其他实例, 2=使用临时目录, 3=连接现有, 4=强制清理, q=退出): ', resolve);
      });

      rl.close();

      switch (answer.toLowerCase()) {
        case '1':
          console.log('💡 请手动关闭其他浏览器实例，然后重新运行此脚本');
          process.exit(0);
          break;
        case '2':
          console.log('🔄 切换到临时用户数据目录');
          finalUserDataDir = null;
          break;
        case '3':
          console.log('🔗 尝试连接到现有实例...');
          // 这里可以尝试连接逻辑
          break;
        case '4':
          console.log('🧹 强制清理锁文件...');
          const cleaned = cleanupUserDataDirLocks(finalUserDataDir);
          if (cleaned) {
            console.log('✅ 锁文件已清理，继续启动');
          } else {
            console.log('⚠️ 无法清理锁文件，可能需要管理员权限');
          }
          break;
        case 'q':
        default:
          console.log('🛑 用户取消启动');
          process.exit(0);
      }
    }
  }

  // 检查端口是否被占用
  const portInUse = await checkPortInUse(debugPort, debugHost);
  if (portInUse) {
    console.log(`⚠️ 端口 ${debugHost}:${debugPort} 已被占用`);
    console.log('💡 可能的解决方案：');
    console.log('   1. 关闭其他使用该端口的浏览器实例');
    console.log('   2. 使用不同的调试端口');
    console.log('   3. 连接到现有的调试实例');
    console.log('');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('是否继续启动？(y/N): ', resolve);
    });
    
    rl.close();
    
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('🛑 用户取消启动');
      process.exit(0);
    }
  }

  // 构建启动参数
  const args = [
    `--remote-debugging-port=${debugPort}`,
    `--remote-debugging-address=${debugHost}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=TranslateUI',
    '--disable-ipc-flooding-protection'
  ];

  // 用户数据目录
  if (finalUserDataDir) {
    // 确保目录存在
    const fs = require('fs');
    const path = require('path');

    let resolvedDir = finalUserDataDir;
    if (!path.isAbsolute(finalUserDataDir)) {
      resolvedDir = path.resolve(process.cwd(), finalUserDataDir);
    }

    try {
      if (!fs.existsSync(resolvedDir)) {
        fs.mkdirSync(resolvedDir, { recursive: true });
        console.log(`📁 创建用户数据目录: ${resolvedDir}`);
      }
    } catch (error) {
      console.warn(`⚠️ 无法创建用户数据目录: ${error.message}`);
    }

    args.push(`--user-data-dir=${resolvedDir}`);
  }

  // 无头模式
  if (headless) {
    args.push('--headless=new');
  }

  // 反检测参数
  args.push(
    '--disable-blink-features=AutomationControlled',
    '--exclude-switches=enable-automation',
    '--disable-extensions-except',
    '--disable-plugins-discovery',
    '--no-service-autorun',
    '--password-store=basic'
  );

  // 额外参数
  if (additionalArgs.length > 0) {
    args.push(...additionalArgs);
  }

  console.log('🔧 启动命令:');
  console.log(`"${finalExecPath}" ${args.join(' ')}`);
  console.log('');

  try {
    // 启动浏览器
    const browserProcess = spawn(finalExecPath, args, {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // 处理输出
    browserProcess.stdout.on('data', (data) => {
      console.log(`[浏览器输出] ${data.toString().trim()}`);
    });

    browserProcess.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message && !message.includes('DevTools listening')) {
        console.log(`[浏览器错误] ${message}`);
      }
    });

    // 等待浏览器启动
    console.log('⏳ 等待浏览器启动...');
    
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const isReady = await checkPortInUse(debugPort, debugHost);
      if (isReady) {
        console.log('✅ 浏览器调试端口已就绪！');
        break;
      }
      
      attempts++;
      console.log(`⏳ 等待中... (${attempts}/${maxAttempts})`);
    }

    if (attempts >= maxAttempts) {
      console.error('❌ 浏览器启动超时');
      process.exit(1);
    }

    // 显示连接信息
    console.log('\n🎉 浏览器调试模式启动成功！');
    console.log('\n📋 连接信息:');
    console.log(`   调试地址: ws://${debugHost}:${debugPort}`);
    console.log(`   HTTP地址: http://${debugHost}:${debugPort}`);
    console.log('\n💡 现在可以运行 sentra-auto-browser 连接到这个浏览器实例：');
    console.log('   设置环境变量:');
    console.log(`   BROWSER_CONNECTION_MODE=connect`);
    console.log(`   BROWSER_DEBUG_PORT=${debugPort}`);
    console.log(`   BROWSER_DEBUG_HOST=${debugHost}`);
    console.log('\n🔗 或者使用命令行参数:');
    console.log(`   node dist/cli/index.js run "你的任务" --connection-mode connect --debug-port ${debugPort}`);
    
    console.log('\n⚠️ 保持此终端窗口打开以维持浏览器运行');
    console.log('   按 Ctrl+C 停止浏览器');

    // 保持进程运行
    browserProcess.unref();
    
    // 处理退出信号
    process.on('SIGINT', () => {
      console.log('\n🛑 正在关闭浏览器...');
      browserProcess.kill();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      browserProcess.kill();
      process.exit(0);
    });

    // 保持脚本运行
    setInterval(() => {}, 1000);

  } catch (error) {
    console.error('❌ 启动浏览器失败:', error.message);
    process.exit(1);
  }
}

// 命令行参数解析
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--browser':
      case '-b':
        options.browser = args[++i];
        break;
      case '--port':
      case '-p':
        options.debugPort = parseInt(args[++i]);
        break;
      case '--host':
      case '-h':
        options.debugHost = args[++i];
        break;
      case '--user-data-dir':
      case '-u':
        options.userDataDir = args[++i];
        break;
      case '--executable':
      case '-e':
        options.executablePath = args[++i];
        break;
      case '--headless':
        options.headless = true;
        break;
      case '--help':
        showHelp();
        process.exit(0);
        break;
    }
  }
  
  return options;
}

// 显示帮助信息
function showHelp() {
  console.log(`
🚀 浏览器调试模式启动助手

用法: node start-debug-browser.js [选项]

选项:
  -b, --browser <name>        指定浏览器 (edge, chrome, chromium)
  -p, --port <port>           调试端口 (默认: 9222)
  -h, --host <host>           调试主机 (默认: localhost)
  -u, --user-data-dir <dir>   用户数据目录
  -e, --executable <path>     浏览器可执行文件路径
  --headless                  无头模式
  --help                      显示帮助信息

示例:
  node start-debug-browser.js
  node start-debug-browser.js --browser edge --port 9223
  node start-debug-browser.js --headless --user-data-dir ./my-profile
`);
}

// 主函数
async function main() {
  try {
    const options = parseArgs();
    await startDebugBrowser(options);
  } catch (error) {
    console.error('❌ 启动失败:', error.message);
    process.exit(1);
  }
}

// 运行
if (require.main === module) {
  main();
}

module.exports = { startDebugBrowser, detectAvailableBrowsers, checkPortInUse };
