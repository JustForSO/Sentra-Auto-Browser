#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { Agent } from '../agent/service';
import { BrowserSession } from '../browser/session';
import { LLMFactory } from '../llm/factory';
import Config from '../config';
import { logger } from '../utils/logger';
import { Symbols } from '../utils/symbols';


// 创建命令行程序实例
const program = new Command();

// 设置程序基本信息
program
  .name('sentra-auto')
  .description('智能浏览器自动化工具 - 基于AI的网页操作助手')
  .version('1.0.0');

// 主要的运行命令 - 这是用户最常用的功能
program
  .command('run')
  .description('运行浏览器自动化任务')
  .argument('<task>', '要执行的任务描述')
  .option('-h, --headless', '无头模式运行浏览器', false)
  .option('-v, --visible', '可视化模式运行浏览器', false)
  .option('--no-vision', '禁用视觉/截图功能')
  .option('--max-steps <number>', '最大执行步数', '100')
  .option('--provider <provider>', 'LLM 提供商 (openai, anthropic, google)')
  .option('--model <model>', 'LLM 模型名称')
  .option('--temperature <number>', 'LLM 温度参数', '0')
  .option('--debug', '启用调试日志')
  .option('--enable-plugins', '启用插件系统', true)
  .option('--disable-plugins', '禁用插件系统')
  .option('--plugin-test', '测试插件系统')
  .action(async (task: string, options) => {
    try {
      // 如果用户要求调试模式，就开启详细日志
      if (options.debug) {
        process.env.LOG_LEVEL = 'debug';
      }

      // 处理插件系统选项
      if (options.disablePlugins) {
        process.env.ENABLE_PLUGINS = 'false';
      } else if (options.enablePlugins) {
        process.env.ENABLE_PLUGINS = 'true';
      }

      // 如果用户要求测试插件系统
      if (options.pluginTest) {
        console.log(chalk.blue('🧪 开始测试插件系统...'));
        const { PluginRegistry } = await import('../plugins/registry');
        const registry = new PluginRegistry();
        await registry.initialize();
        console.log(chalk.green('✅ 插件系统测试完成'));
        return;
      }

      // 强制使用ASCII符号，确保在各种终端下都能正常显示
      Symbols.forceAscii();

      const robotIcon = Symbols.getSystem('robot');
      console.log(chalk.blue.bold(`\n${robotIcon} SENTRA AUTO BROWSER - 智能浏览器自动化\n`));

      // 获取AI模型配置，这是整个系统的大脑配置
      let llmConfig: any;
      try {
        llmConfig = Config.getLLMConfig();

        // 如果用户在命令行指定了特定配置，就覆盖默认配置
        if (options.provider) {
          llmConfig.provider = options.provider as any;
          const configIcon = Symbols.getSystem('config');
          console.log(`${configIcon} 使用命令行指定的AI提供商: ${options.provider}`);
        }
        if (options.model) {
          llmConfig.model = options.model;
          const configIcon = Symbols.getSystem('config');
          console.log(`${configIcon} 使用命令行指定的AI模型: ${options.model}`);
        }
        if (options.temperature) {
          llmConfig.temperature = parseFloat(options.temperature);
        }
        
      } catch (error) {
        const errorIcon = Symbols.getStatus('error');
        console.error(chalk.red(`${errorIcon} AI模型配置错误:`), error instanceof Error ? error.message : String(error));
        const warningIcon = Symbols.getStatus('warning');
        console.log(chalk.yellow(`\n${warningIcon} 请检查 .env 文件中的 API 密钥配置`));
        process.exit(1);
      }

      // 获取浏览器配置，决定浏览器如何启动和运行
      const browserProfile = Config.getBrowserProfile();

      // 根据用户选择调整浏览器显示模式
      if (options.visible) {
        browserProfile.headless = false;  // 显示浏览器窗口，方便观察
      } else if (options.headless) {
        browserProfile.headless = true;   // 隐藏浏览器窗口，提高性能
      }

      // 获取AI代理的行为设置
      const agentSettings = Config.getAgentSettings();

      // 应用用户的命令行选项
      if (options.maxSteps) agentSettings.maxSteps = parseInt(options.maxSteps);
      if (options.noVision) agentSettings.useVision = false;

      const taskIcon = Symbols.getTask('task');
      const modelIcon = Symbols.getSystem('model');
      const browserIcon = Symbols.getSystem('browser');
      const visionIcon = Symbols.getSystem('vision');

      console.log(chalk.gray(`${taskIcon} 任务: ${task}`));
      console.log(chalk.gray(`${modelIcon} 模型: ${llmConfig.provider} - ${llmConfig.model}`));
      console.log(chalk.gray(`${browserIcon} 浏览器: ${browserProfile.headless ? '无头模式' : '可视化模式'}`));
      console.log(chalk.gray(`${visionIcon} 视觉: ${agentSettings.useVision ? '已启用' : '已禁用'}`));
      console.log('');

      // 创建AI大脑实例，这是整个系统的智能核心
      const spinner = ora('正在初始化 AI 模型...').start();
      LLMFactory.validateConfig(llmConfig);
      const llm = LLMFactory.createLLM(llmConfig);
      spinner.succeed('AI 模型初始化完成');

      // 启动浏览器，为AI准备工作环境
      spinner.start('正在启动浏览器...');
      const browserSession = new BrowserSession(browserProfile);
      await browserSession.start();
      spinner.succeed('浏览器启动完成（支持CDP连接）');

      // 启用增强功能，让浏览器更智能
      spinner.start('正在启用增强功能...');
      await browserSession.enableEnhancedMode();
      spinner.succeed('增强功能已启用');

      // 创建智能代理，把AI大脑和浏览器连接起来
      spinner.start('正在创建智能代理...');
      const agent = new Agent(task, llm, browserSession, agentSettings);
      spinner.succeed('智能代理创建完成');

      const startIcon = Symbols.getProgress('start');
      console.log(chalk.yellow(`\n${startIcon} 开始执行任务...\n`));

      // 让AI代理开始工作，执行用户的任务
      const history = await agent.run();

      // 任务完成，展示执行结果
      const completeIcon = Symbols.getProgress('complete');
      console.log(chalk.green.bold(`\n${completeIcon} 任务执行完成！\n`));

      const summaryIcon = Symbols.getSystem('summary');
      console.log(chalk.blue(`${summaryIcon} 执行摘要:`));
      console.log(chalk.gray(`   执行步数: ${history.steps.length}`));
      console.log(chalk.gray(`   执行时长: ${history.totalDuration.toFixed(2)} 秒`));
      const resultIcon = history.success ? Symbols.getStatus('success') : Symbols.getStatus('error');
      console.log(chalk.gray(`   执行结果: ${resultIcon} ${history.success ? '成功' : '失败'}`));

      // 如果有最终消息，也显示出来
      if (history.steps.length > 0) {
        const lastStep = history.steps[history.steps.length - 1];
        if (lastStep.action.type === 'done') {
          console.log(chalk.gray(`   最终消息: ${lastStep.action.message}`));
        }
      }

      // 根据配置决定是否关闭浏览器
      const connectionConfig = Config.getBrowserConnectionConfig();
      const shouldCloseBrowser = connectionConfig.autoClose && !connectionConfig.connectToUserBrowser;

      if (shouldCloseBrowser) {
        spinner.start('正在关闭浏览器...');
        await browserSession.close();
        spinner.succeed('浏览器已关闭');
      } else {
        spinner.succeed('保持浏览器运行（CDP连接模式）');
        console.log(chalk.yellow('💡 提示: 浏览器将保持运行状态，您可以继续使用'));
      }

      const doneIcon = Symbols.getProgress('complete');
      console.log(chalk.green(`\n${doneIcon} 全部完成！\n`));

      // 根据任务执行结果退出程序
      process.exit(history.success ? 0 : 1);

    } catch (error) {
      const errorIcon = Symbols.getStatus('error');
      console.error(chalk.red(`\n${errorIcon} Error:`), error instanceof Error ? error.message : String(error));
      
      if (options.debug && error instanceof Error) {
        console.error(chalk.red('\nStack trace:'));
        console.error(chalk.gray(error.stack));
      }
      
      process.exit(1);
    }
  });

// 插件管理命令
program
  .command('plugin')
  .description('插件系统管理')
  .option('--list', '列出所有可用插件')
  .option('--test', '测试插件系统')
  .option('--info <pluginId>', '显示插件详细信息')
  .action(async (options) => {
    try {
      if (options.test) {
        console.log(chalk.blue('🧪 开始测试插件系统...'));
        const { PluginRegistry } = await import('../plugins/registry');
        const registry = new PluginRegistry();
        await registry.initialize();
        console.log(chalk.green('✅ 插件系统测试完成'));
        return;
      }

      if (options.list || options.info) {
        const { PluginRegistry } = await import('../plugins/registry');
        const registry = new PluginRegistry();
        await registry.initialize();
        const manager = registry.getManager();

        if (options.list) {
          const plugins = manager.getAllPlugins();

          console.log(chalk.blue.bold('\n🔌 可用插件列表\n'));
          console.log(chalk.gray(`总计: ${plugins.length} 个插件\n`));

          // 按类别分组
          const byCategory: Record<string, any[]> = {};
          plugins.forEach(plugin => {
            const category = plugin.config.category;
            if (!byCategory[category]) byCategory[category] = [];
            byCategory[category].push(plugin);
          });

          for (const [category, categoryPlugins] of Object.entries(byCategory)) {
            console.log(chalk.yellow(`📂 ${category}: ${categoryPlugins.length} 个插件`));

            for (const plugin of categoryPlugins) {
              console.log(chalk.gray(`   • ${plugin.config.name} (${plugin.config.id})`));
              console.log(chalk.gray(`     ${plugin.config.description}`));
              if (plugin.config.tags && plugin.config.tags.length > 0) {
                console.log(chalk.gray(`     标签: ${plugin.config.tags.join(', ')}`));
              }
              console.log('');
            }
          }
        }

        if (options.info) {
          const plugins = manager.getAllPlugins();
          const plugin = plugins.find(p => p.config.id === options.info);

          if (plugin) {
            const config = plugin.config;
            console.log(chalk.blue.bold(`\n🔌 插件详情: ${config.name}\n`));
            console.log(chalk.gray(`ID: ${config.id}`));
            console.log(chalk.gray(`版本: ${config.version}`));
            console.log(chalk.gray(`类别: ${config.category}`));
            console.log(chalk.gray(`作者: ${config.author || '未知'}`));
            console.log(chalk.gray(`描述: ${config.description}`));

            if (config.tags && config.tags.length > 0) {
              console.log(chalk.gray(`标签: ${config.tags.join(', ')}`));
            }

            if (config.permissions && config.permissions.length > 0) {
              console.log(chalk.gray(`权限: ${config.permissions.join(', ')}`));
            }

            if (config.parameters && config.parameters.length > 0) {
              console.log(chalk.gray(`参数: ${config.parameters.map(p => p.name).join(', ')}`));
            }

            console.log('');
          } else {
            console.log(chalk.red(`❌ 未找到插件: ${options.info}`));
          }
        }
        return;
      }

      // 默认显示插件系统状态
      console.log(chalk.blue.bold('\n🔌 插件系统状态\n'));
      console.log(chalk.gray('使用 --list 查看所有插件'));
      console.log(chalk.gray('使用 --test 测试插件系统'));
      console.log(chalk.gray('使用 --info <pluginId> 查看插件详情'));

    } catch (error) {
      console.error(chalk.red('❌ 插件命令执行失败:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('config')
  .description('显示当前配置信息')
  .option('--all', '显示所有环境变量配置')
  .option('--env', '显示环境变量详情')
  .action((options) => {
    try {
      // 强制使用ASCII符号以确保兼容性
      Symbols.forceAscii();

      const configIcon = Symbols.getSystem('config');
      console.log(chalk.blue.bold(`\n${configIcon} 当前配置信息\n`));

      const llmConfig = Config.getLLMConfig();
      const browserProfile = Config.getBrowserProfile();
      const agentSettings = Config.getAgentSettings();
      const connectionConfig = Config.getBrowserConnectionConfig();

      // AI模型配置
      console.log(chalk.yellow('🧠 AI模型配置:'));
      console.log(chalk.gray(`  提供商: ${llmConfig.provider}`));
      console.log(chalk.gray(`  模型: ${llmConfig.model}`));
      console.log(chalk.gray(`  温度: ${llmConfig.temperature}`));
      console.log(chalk.gray(`  最大Token: ${llmConfig.maxTokens}`));
      console.log(chalk.gray(`  API密钥: ${llmConfig.apiKey ? '***' + llmConfig.apiKey.slice(-4) : '未设置'}`));
      if (llmConfig.baseURL) {
        console.log(chalk.gray(`  API地址: ${llmConfig.baseURL}`));
      }

      // 浏览器配置
      console.log(chalk.yellow('\n🌐 浏览器配置:'));
      console.log(chalk.gray(`  无头模式: ${browserProfile.headless ? '是' : '否'}`));
      console.log(chalk.gray(`  视窗大小: ${browserProfile.viewport?.width}x${browserProfile.viewport?.height}`));
      console.log(chalk.gray(`  超时时间: ${browserProfile.timeout}ms`));
      console.log(chalk.gray(`  用户数据目录: ${browserProfile.userDataDir || '未设置'}`));
      console.log(chalk.gray(`  可执行文件路径: ${browserProfile.executablePath || '默认'}`));
      console.log(chalk.gray(`  语言设置: ${browserProfile.locale || '默认'}`));
      console.log(chalk.gray(`  时区: ${browserProfile.timezone || '默认'}`));
      console.log(chalk.gray(`  颜色主题: ${browserProfile.colorScheme || '默认'}`));

      // CDP连接配置
      console.log(chalk.yellow('\n🔗 CDP连接配置:'));
      console.log(chalk.gray(`  连接现有浏览器: ${connectionConfig.connectToUserBrowser ? '是' : '否'}`));
      console.log(chalk.gray(`  连接模式: ${connectionConfig.connectionMode}`));
      console.log(chalk.gray(`  调试端口: ${connectionConfig.debugPort}`));
      console.log(chalk.gray(`  调试主机: ${connectionConfig.debugHost}`));
      console.log(chalk.gray(`  反检测模式: ${connectionConfig.stealthMode ? '启用' : '禁用'}`));
      console.log(chalk.gray(`  自动关闭: ${connectionConfig.autoClose ? '是' : '否'}`));
      console.log(chalk.gray(`  最大化窗口: ${connectionConfig.maximized ? '是' : '否'}`));
      console.log(chalk.gray(`  全屏模式: ${connectionConfig.fullscreen ? '是' : '否'}`));

      // 代理配置
      console.log(chalk.yellow('\n🤖 代理配置:'));
      console.log(chalk.gray(`  最大步数: ${agentSettings.maxSteps}`));
      console.log(chalk.gray(`  每步最大操作数: ${agentSettings.maxActionsPerStep}`));
      console.log(chalk.gray(`  使用视觉功能: ${agentSettings.useVision ? '是' : '否'}`));
      console.log(chalk.gray(`  温度参数: ${agentSettings.temperature}`));

      // 日志配置
      console.log(chalk.yellow('\n📝 日志配置:'));
      console.log(chalk.gray(`  日志级别: ${Config.getLogLevel()}`));
      console.log(chalk.gray(`  调试模式: ${Config.isDebugMode() ? '启用' : '禁用'}`));

      // 如果用户要求显示所有环境变量
      if (options.all || options.env) {
        console.log(chalk.yellow('\n🔧 环境变量详情:'));

        const envVars = [
          // AI模型相关
          { key: 'OPENAI_API_KEY', desc: 'OpenAI API密钥', sensitive: true },
          { key: 'OPENAI_MODEL', desc: 'OpenAI模型' },
          { key: 'OPENAI_BASE_URL', desc: 'OpenAI API地址' },
          { key: 'ANTHROPIC_API_KEY', desc: 'Anthropic API密钥', sensitive: true },
          { key: 'ANTHROPIC_MODEL', desc: 'Anthropic模型' },
          { key: 'GOOGLE_API_KEY', desc: 'Google API密钥', sensitive: true },
          { key: 'GOOGLE_MODEL', desc: 'Google模型' },
          { key: 'LLM_TEMPERATURE', desc: 'AI温度参数' },
          { key: 'LLM_MAX_TOKENS', desc: '最大Token数' },
          { key: 'LLM_TIMEOUT', desc: 'AI请求超时' },

          // 浏览器相关
          { key: 'BROWSER_HEADLESS', desc: '无头模式' },
          { key: 'BROWSER_VIEWPORT_WIDTH', desc: '视窗宽度' },
          { key: 'BROWSER_VIEWPORT_HEIGHT', desc: '视窗高度' },
          { key: 'BROWSER_WIDTH', desc: '浏览器宽度' },
          { key: 'BROWSER_HEIGHT', desc: '浏览器高度' },
          { key: 'BROWSER_TIMEOUT', desc: '浏览器超时' },
          { key: 'BROWSER_USER_DATA_DIR', desc: '用户数据目录' },
          { key: 'BROWSER_EXECUTABLE_PATH', desc: '浏览器路径' },
          { key: 'BROWSER_LOCALE', desc: '浏览器语言' },
          { key: 'BROWSER_TIMEZONE', desc: '时区设置' },
          { key: 'BROWSER_COLOR_SCHEME', desc: '颜色主题' },
          { key: 'BROWSER_ARGS', desc: '浏览器启动参数' },

          // CDP连接相关
          { key: 'BROWSER_CONNECT_TO_USER_BROWSER', desc: '连接现有浏览器' },
          { key: 'BROWSER_CONNECTION_MODE', desc: '连接模式' },
          { key: 'BROWSER_DEBUG_PORT', desc: '调试端口' },
          { key: 'BROWSER_DEBUG_HOST', desc: '调试主机' },
          { key: 'BROWSER_STEALTH_MODE', desc: '反检测模式' },
          { key: 'BROWSER_AUTO_CLOSE', desc: '自动关闭' },
          { key: 'BROWSER_MAXIMIZED', desc: '最大化窗口' },
          { key: 'BROWSER_FULLSCREEN', desc: '全屏模式' },

          // 代理相关
          { key: 'AGENT_MAX_STEPS', desc: '最大步数' },
          { key: 'AGENT_MAX_ACTIONS_PER_STEP', desc: '每步最大操作数' },
          { key: 'AGENT_USE_VISION', desc: '使用视觉功能' },

          // 日志相关
          { key: 'LOG_LEVEL', desc: '日志级别' },
          { key: 'DEBUG', desc: '调试模式' },
        ];

        envVars.forEach(envVar => {
          const value = process.env[envVar.key];
          let displayValue = value || '未设置';

          // 敏感信息脱敏处理
          if (envVar.sensitive && value) {
            displayValue = '***' + value.slice(-4);
          }

          console.log(chalk.gray(`  ${envVar.desc} (${envVar.key}): ${displayValue}`));
        });
      }

      console.log(chalk.cyan('\n💡 提示:'));
      console.log(chalk.gray('  - 使用 --all 参数查看所有环境变量'));
      console.log(chalk.gray('  - 配置文件: .env'));
      console.log(chalk.gray('  - 示例配置: .env.example'));
      console.log('');

    } catch (error) {
      console.error(chalk.red('读取配置时出错:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('test')
  .description('Test browser and LLM connectivity')
  .action(async () => {
    try {
      // Force ASCII symbols for better compatibility
      Symbols.forceAscii();

      const testIcon = Symbols.getSystem('test');
      console.log(chalk.blue.bold(`\n${testIcon} Testing Configuration\n`));

      // Test LLM
      const spinner = ora('Testing LLM connection...').start();
      const llmConfig = Config.getLLMConfig();
      LLMFactory.validateConfig(llmConfig);
      const llm = LLMFactory.createLLM(llmConfig);
      
      // Simple test message
      const testResponse = await llm.generateResponse([
        { role: 'user', content: 'Hello, please respond with "OK" if you can understand this message.' }
      ]);
      
      if (testResponse.content.toLowerCase().includes('ok')) {
        spinner.succeed('LLM connection successful');
      } else {
        spinner.warn('LLM responded but may not be working correctly');
      }

      // Test browser
      spinner.start('Testing browser startup...');
      const browserProfile = Config.getBrowserProfile();
      const browserSession = new BrowserSession(browserProfile);
      await browserSession.start();

      await browserSession.navigate('https://example.com');
      const title = await browserSession.getCurrentTitle();

      await browserSession.close();
      
      if (title) {
        spinner.succeed('Browser connection successful');
      } else {
        spinner.warn('Browser started but may not be working correctly');
      }

      const successIcon = Symbols.getStatus('success');
      console.log(chalk.green(`\n${successIcon} All tests passed!\n`));

    } catch (error) {
      const errorIcon = Symbols.getStatus('error');
      console.error(chalk.red(`\n${errorIcon} Test failed:`), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n[FATAL] Uncaught Exception:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('\n[FATAL] Unhandled Rejection:'), reason);
  process.exit(1);
});

// Parse command line arguments
program.parse();
