import { Agent, BrowserSession, LLMFactory } from '../src';

async function main() {
  try {
    console.log('🤖 Sentra Auto Browser - Google Gemini 演示\n');

    // 强制使用 Google Gemini 配置
    const llmConfig = {
      provider: 'google' as const,
      model: 'gemini-1.5-flash', // 使用更快的模型
      apiKey: process.env.GOOGLE_API_KEY!,
      baseURL: process.env.GOOGLE_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/', // 支持自定义API端点
      temperature: 0,
    };

    // 检查 API 密钥
    if (!llmConfig.apiKey) {
      console.error('❌ 错误: 请在 .env 文件中设置 GOOGLE_API_KEY');
      console.log('1. 访问 https://aistudio.google.com/app/apikey');
      console.log('2. 创建 API 密钥');
      console.log('3. 在 .env 文件中设置: GOOGLE_API_KEY=你的密钥');
      console.log('4. (可选) 设置自定义API端点: GOOGLE_BASE_URL=你的代理地址');
      process.exit(1);
    }

    const browserProfile = {
      headless: false, // 显示浏览器以便观察
      viewport: { width: 1280, height: 720 },
      slowMo: 500, // 放慢操作以便观察
    };

    const agentSettings = {
      maxSteps: 15,
      useVision: true, // 启用视觉功能
      enableMemory: true,
      enablePlanning: true,
      enableReflection: false, // 简化演示，关闭反思
      enableErrorRecovery: true,
      enablePerformanceMonitoring: true,
    };

    console.log('配置信息:');
    console.log(`  LLM: ${llmConfig.provider} - ${llmConfig.model}`);
    console.log(`  API 密钥: ${llmConfig.apiKey.substring(0, 10)}...`);
    console.log(`  API 端点: ${llmConfig.baseURL}`);
    console.log(`  浏览器: ${browserProfile.headless ? '无头模式' : '可视模式'}`);
    console.log(`  视觉功能: ${agentSettings.useVision ? '启用' : '禁用'}\n`);

    // 创建 LLM 实例
    console.log('🔧 初始化 Google Gemini...');
    LLMFactory.validateConfig(llmConfig);
    const llm = LLMFactory.createLLM(llmConfig);

    // 创建浏览器会话
    console.log('🌐 启动浏览器...');
    const browserSession = new BrowserSession(browserProfile);
    await browserSession.start();

    // 定义任务
    const task = "访问 GitHub.com，搜索 'browser automation'，找到第一个仓库并查看其 README";

    console.log(`📋 任务: ${task}\n`);

    // 创建 Agent
    console.log('🤖 创建智能代理...');
    const agent = new Agent(task, llm, browserSession, agentSettings);

    console.log('🚀 开始执行任务...\n');

    // 执行任务
    const startTime = Date.now();
    const history = await agent.run();
    const duration = (Date.now() - startTime) / 1000;

    // 显示结果
    console.log('\n' + '='.repeat(60));
    console.log('📊 执行结果');
    console.log('='.repeat(60));

    const status = history.success ? '✅ 成功' : '❌ 失败';
    console.log(`状态: ${status}`);
    console.log(`步骤数: ${history.steps.length}`);
    console.log(`总耗时: ${duration.toFixed(2)} 秒`);
    console.log(`成功率: ${(history.metadata.successRate * 100).toFixed(1)}%`);

    // 显示步骤详情
    console.log('\n📝 执行步骤:');
    history.steps.forEach((step, index) => {
      const status = step.result.success ? '✅' : '❌';
      const actionType = step.action.type;
      const message = step.result.message || step.result.error || '无消息';
      
      console.log(`  ${index + 1}. ${status} ${actionType} - ${message}`);
      
      // 显示具体动作详情
      if (step.action.type === 'click') {
        console.log(`     → 点击索引 ${(step.action as any).index} 的元素`);
      } else if (step.action.type === 'type') {
        console.log(`     → 输入文本: "${(step.action as any).text}"`);
      } else if (step.action.type === 'navigate') {
        console.log(`     → 导航到: ${(step.action as any).url}`);
      }
    });

    // 显示最终页面信息
    console.log('\n📄 最终状态:');
    console.log(`  当前 URL: ${browserSession.getCurrentUrl()}`);
    console.log(`  页面标题: ${await browserSession.getCurrentTitle()}`);

    // 显示性能报告
    const performanceReport = agent.getPerformanceReport();
    if (performanceReport) {
      console.log('\n⚡ 性能报告:');
      console.log(performanceReport);
    }

    // 显示内存统计
    const memoryStats = await agent.getMemoryStats();
    if (memoryStats) {
      console.log('\n🧠 内存统计:');
      console.log(`  总记忆数: ${memoryStats.total}`);
      console.log(`  成功率: ${(memoryStats.successRate * 100).toFixed(1)}%`);
    }

    // 等待用户查看结果
    console.log('\n⏳ 5秒后自动关闭浏览器...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 关闭浏览器
    await browserSession.close();
    console.log('\n🎉 演示完成！');

  } catch (error) {
    console.error('\n❌ 演示失败:', error instanceof Error ? error.message : String(error));
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        console.log('\n💡 解决方案:');
        console.log('1. 确保在 .env 文件中正确设置了 GOOGLE_API_KEY');
        console.log('2. 检查 API 密钥是否有效');
        console.log('3. 确保 Google AI API 已启用');
      } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
        console.log('\n💡 解决方案:');
        console.log('1. 检查 Google AI API 配额');
        console.log('2. 等待一段时间后重试');
        console.log('3. 考虑升级 API 计划');
      }
      
      if (process.env.DEBUG === 'true') {
        console.error('\n🔍 详细错误信息:');
        console.error(error.stack);
      }
    }
    
    process.exit(1);
  }
}

// 运行演示
main();
