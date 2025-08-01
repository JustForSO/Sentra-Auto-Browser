/**
 * 高级使用示例 - Sentra Auto Browser
 * 
 * 这个示例展示了更复杂的自动化场景，包括：
 * - 表单填写
 * - 多步骤操作
 * - 错误处理
 * - 性能监控
 */

const { 
  Agent, 
  BrowserSession, 
  LLMFactory,
  Config 
} = require('../dist/index');

async function advancedExample() {
  console.log('🚀 Sentra Auto Browser - 高级使用示例');
  console.log('=========================================\n');

  let session = null;

  try {
    // 1. 配置设置
    console.log('⚙️ 正在配置系统...');
    const llmConfig = Config.getLLMConfig();
    const browserProfile = {
      ...Config.getBrowserProfile(),
      headless: false,           // 可视化模式
      viewport: { width: 1280, height: 720 },
      userDataDir: './user-data', // 使用用户数据目录保持登录状态
    };
    
    const agentSettings = {
      ...Config.getAgentSettings(),
      maxSteps: 50,              // 增加最大步数
      useVision: true,           // 启用视觉功能
      enableMemory: true,        // 启用记忆功能
      enablePlanning: true,      // 启用规划功能
      enableReflection: true,    // 启用反思功能
      enableErrorRecovery: true, // 启用错误恢复
      enablePerformanceMonitoring: true, // 启用性能监控
    };

    console.log(`✅ AI模型: ${llmConfig.provider} - ${llmConfig.model}`);
    console.log(`✅ 增强功能: 记忆、规划、反思、错误恢复、性能监控`);
    console.log(`✅ 用户数据目录: ${browserProfile.userDataDir}\n`);

    // 2. 初始化组件
    console.log('🧠 正在初始化AI模型...');
    const llm = LLMFactory.createLLM(llmConfig);

    console.log('🌐 正在启动浏览器...');
    session = new BrowserSession(browserProfile);
    await session.start();

    console.log('⚡ 正在启用增强功能...');
    await session.enableEnhancedMode();

    // 3. 复杂任务示例 - 电商购物流程
    const shoppingTask = `
请帮我完成一个完整的电商购物流程：

1. 打开淘宝网站 (https://www.taobao.com)
2. 在搜索框中搜索"蓝牙耳机"
3. 浏览搜索结果，选择一个价格在100-300元之间的商品
4. 点击进入商品详情页
5. 查看商品的详细信息、价格、评价等
6. 如果商品评分超过4.5分且价格合理，模拟加入购物车操作
7. 最后总结一下找到的商品信息

注意：
- 请仔细比较不同商品的性价比
- 优先选择销量高、评价好的商品
- 不要真的购买，只是模拟操作
    `;

    console.log('🛒 电商购物任务:');
    console.log(shoppingTask);
    console.log('');

    // 4. 创建并执行代理
    console.log('🤖 正在创建智能代理...');
    const agent = new Agent(shoppingTask, llm, session, agentSettings);

    console.log('🚀 开始执行购物任务...\n');
    const startTime = Date.now();
    
    const result = await agent.run();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // 5. 详细结果分析
    console.log('\n📊 任务执行完成！');
    console.log('===================');
    console.log(`✅ 执行结果: ${result.success ? '成功' : '失败'}`);
    console.log(`⏱️  总执行时间: ${duration.toFixed(2)} 秒`);
    console.log(`📝 总执行步数: ${result.steps.length}`);
    console.log(`🧠 平均每步时间: ${(duration / result.steps.length).toFixed(2)} 秒`);

    // 6. 步骤详情
    if (result.steps.length > 0) {
      console.log('\n📋 详细执行步骤:');
      result.steps.forEach((step, index) => {
        const status = step.success ? '✅' : '❌';
        const duration = step.duration ? `(${step.duration.toFixed(2)}s)` : '';
        console.log(`  ${index + 1}. ${step.action.type} ${status} ${duration}`);
        
        if (step.action.reasoning) {
          console.log(`     💭 推理: ${step.action.reasoning.substring(0, 100)}...`);
        }
        
        if (!step.success && step.error) {
          console.log(`     ❌ 错误: ${step.error}`);
        }
      });
    }

    // 7. 性能指标
    if (result.performanceMetrics) {
      console.log('\n📈 性能指标:');
      console.log(`  🔍 DOM分析次数: ${result.performanceMetrics.domAnalysisCount || 0}`);
      console.log(`  📸 截图次数: ${result.performanceMetrics.screenshotCount || 0}`);
      console.log(`  🤖 AI调用次数: ${result.performanceMetrics.llmCallCount || 0}`);
      console.log(`  ⚡ 平均响应时间: ${result.performanceMetrics.averageResponseTime || 0}ms`);
    }

    // 8. 最终消息
    const lastStep = result.steps[result.steps.length - 1];
    if (lastStep && lastStep.action.type === 'done' && lastStep.action.message) {
      console.log('\n💬 AI总结:');
      console.log(`"${lastStep.action.message}"`);
    }

    // 9. 等待用户观察
    console.log('\n⏳ 等待10秒钟，让您观察最终结果...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('\n❌ 执行过程中出现错误:');
    console.error(`错误类型: ${error.name}`);
    console.error(`错误信息: ${error.message}`);
    
    if (error.stack) {
      console.error('\n📋 详细错误堆栈:');
      console.error(error.stack);
    }

    // 错误恢复建议
    console.log('\n🔧 错误恢复建议:');
    if (error.message.includes('API')) {
      console.log('  - 检查API密钥是否正确配置');
      console.log('  - 确认网络连接正常');
      console.log('  - 检查API配额是否充足');
    } else if (error.message.includes('browser')) {
      console.log('  - 确保已安装Playwright浏览器: npx playwright install');
      console.log('  - 检查系统权限和防火墙设置');
      console.log('  - 尝试使用无头模式');
    } else {
      console.log('  - 检查网络连接');
      console.log('  - 重新启动程序');
      console.log('  - 查看详细日志');
    }
    
  } finally {
    // 10. 清理资源
    if (session) {
      try {
        console.log('\n🔚 正在关闭浏览器...');
        await session.close();
        console.log('✅ 浏览器已关闭');
      } catch (closeError) {
        console.error('❌ 关闭浏览器时出错:', closeError.message);
      }
    }

    console.log('\n🎉 高级示例执行完成！');
    console.log('感谢使用 Sentra Auto Browser！');
  }
}

// 运行示例
if (require.main === module) {
  advancedExample().catch(console.error);
}

module.exports = { advancedExample };
