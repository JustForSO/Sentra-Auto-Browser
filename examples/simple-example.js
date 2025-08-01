/**
 * 简单使用示例 - Sentra Auto Browser
 * 
 * 这个示例展示了如何使用Sentra Auto Browser进行基本的网页自动化操作
 */

const { 
  Agent, 
  BrowserSession, 
  LLMFactory,
  Config 
} = require('../dist/index');

async function simpleExample() {
  console.log('🤖 Sentra Auto Browser - 简单使用示例');
  console.log('=====================================\n');

  try {
    // 1. 获取配置
    console.log('📋 正在加载配置...');
    const llmConfig = Config.getLLMConfig();
    const browserProfile = Config.getBrowserProfile();
    const agentSettings = Config.getAgentSettings();

    console.log(`✅ 使用AI模型: ${llmConfig.provider} - ${llmConfig.model}`);
    console.log(`✅ 浏览器模式: ${browserProfile.headless ? '无头模式' : '可视化模式'}\n`);

    // 2. 创建AI模型实例
    console.log('🧠 正在初始化AI模型...');
    const llm = LLMFactory.createLLM(llmConfig);
    console.log('✅ AI模型初始化完成\n');

    // 3. 创建浏览器会话
    console.log('🌐 正在启动浏览器...');
    const session = new BrowserSession({
      ...browserProfile,
      headless: false  // 强制使用可视化模式，方便观察
    });
    await session.start();
    console.log('✅ 浏览器启动完成\n');

    // 4. 启用增强功能
    console.log('⚡ 正在启用增强功能...');
    await session.enableEnhancedMode();
    console.log('✅ 增强功能已启用\n');

    // 5. 定义任务
    const task = `
请帮我完成以下任务：
1. 打开百度搜索引擎 (https://www.baidu.com)
2. 在搜索框中输入"人工智能"
3. 点击搜索按钮
4. 查看搜索结果页面
5. 点击第一个搜索结果
    `;

    console.log('🎯 任务描述:');
    console.log(task);
    console.log('');

    // 6. 创建智能代理
    console.log('🤖 正在创建智能代理...');
    const agent = new Agent(task, llm, session, agentSettings);
    console.log('✅ 智能代理创建完成\n');

    // 7. 执行任务
    console.log('🚀 开始执行任务...\n');
    const startTime = Date.now();
    
    const result = await agent.run();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // 8. 显示结果
    console.log('\n📊 任务执行完成！');
    console.log('===================');
    console.log(`✅ 执行结果: ${result.success ? '成功' : '失败'}`);
    console.log(`⏱️  执行时间: ${duration.toFixed(2)} 秒`);
    console.log(`📝 执行步数: ${result.steps.length}`);
    
    if (result.steps.length > 0) {
      console.log('\n📋 执行步骤:');
      result.steps.forEach((step, index) => {
        console.log(`  ${index + 1}. ${step.action.type} - ${step.success ? '✅' : '❌'}`);
        if (step.action.type === 'done' && step.action.message) {
          console.log(`     消息: ${step.action.message}`);
        }
      });
    }

    // 9. 等待用户观察结果
    console.log('\n⏳ 等待5秒钟，让您观察结果...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 10. 关闭浏览器
    console.log('🔚 正在关闭浏览器...');
    await session.close();
    console.log('✅ 浏览器已关闭');

    console.log('\n🎉 示例执行完成！');

  } catch (error) {
    console.error('\n❌ 执行过程中出现错误:');
    console.error(error.message);
    
    if (error.stack) {
      console.error('\n📋 错误堆栈:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// 运行示例
if (require.main === module) {
  simpleExample().catch(console.error);
}

module.exports = { simpleExample };
