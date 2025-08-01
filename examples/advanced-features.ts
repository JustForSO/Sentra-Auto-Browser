import { 
  Agent, 
  BrowserSession, 
  LLMFactory, 
  Config,
  MemoryService,
  PlanningService,
  ReflectionService,
  ErrorRecoveryService,
  PerformanceMonitoringService
} from '../src';

async function main() {
  try {
    console.log('🚀 Advanced Features Demo\n');

    // Enhanced configuration
    const llmConfig = Config.getLLMConfig();
    const browserProfile = {
      ...Config.getBrowserProfile(),
      headless: false, // Show browser for demo
      slowMo: 500, // Slow down for visibility
      devtools: false,
    };

    const agentSettings = {
      ...Config.getAgentSettings(),
      maxSteps: 20,
      enableMemory: true,
      memorySize: 500,
      enablePlanning: true,
      planningSteps: 8,
      enableReflection: true,
      reflectionInterval: 3,
      enableErrorRecovery: true,
      enablePerformanceMonitoring: true,
      enableScreenshotOnError: true,
      enableActionValidation: true,
      customPrompts: {
        systemPrompt: `You are an advanced web automation agent with memory, planning, and reflection capabilities. 
        Use your past experiences to make better decisions and create detailed plans before acting.`,
      },
    };

    console.log('Configuration:');
    console.log(`  LLM: ${llmConfig.provider} - ${llmConfig.model}`);
    console.log(`  Memory: ${agentSettings.enableMemory ? 'enabled' : 'disabled'}`);
    console.log(`  Planning: ${agentSettings.enablePlanning ? 'enabled' : 'disabled'}`);
    console.log(`  Reflection: ${agentSettings.enableReflection ? 'enabled' : 'disabled'}`);
    console.log(`  Error Recovery: ${agentSettings.enableErrorRecovery ? 'enabled' : 'disabled'}`);
    console.log(`  Performance Monitoring: ${agentSettings.enablePerformanceMonitoring ? 'enabled' : 'disabled'}\n`);

    // Create LLM and browser session
    const llm = LLMFactory.createLLM(llmConfig);
    const browserSession = new BrowserSession(browserProfile);
    await browserSession.start();

    // Complex task that benefits from advanced features
    const task = `Go to GitHub.com, search for 'browser automation', find the most popular repository, 
    go to its issues page, and extract the title of the first open issue. Take a screenshot at the end.`;

    console.log(`📋 Task: ${task}\n`);

    // Create agent with advanced features
    const agent = new Agent(task, llm, browserSession, agentSettings);

    console.log('🧠 Starting execution with advanced features...\n');

    // Run the agent
    const history = await agent.run();

    // Display comprehensive results
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE EXECUTION REPORT');
    console.log('='.repeat(80));

    // Basic results
    console.log(`\n✅ Task Status: ${history.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`📈 Steps Taken: ${history.steps.length}`);
    console.log(`⏱️  Total Duration: ${history.totalDuration.toFixed(2)} seconds`);
    console.log(`🎯 Success Rate: ${(history.metadata.successRate * 100).toFixed(1)}%`);

    // Memory statistics
    const memoryStats = await agent.getMemoryStats();
    if (memoryStats) {
      console.log(`\n🧠 Memory Statistics:`);
      console.log(`   Total memories: ${memoryStats.total}`);
      console.log(`   By type: ${Object.entries(memoryStats.byType).map(([k, v]) => `${k}(${v})`).join(', ')}`);
      console.log(`   Success rate: ${(memoryStats.successRate * 100).toFixed(1)}%`);
    }

    // Planning information
    const currentPlan = agent.getCurrentPlan();
    if (currentPlan) {
      console.log(`\n📋 Planning Information:`);
      console.log(`   Plan confidence: ${(currentPlan.confidence * 100).toFixed(1)}%`);
      console.log(`   Planned steps: ${currentPlan.plan.length}`);
      console.log(`   Risk level: ${currentPlan.riskAssessment.overallRisk}`);
      console.log(`   Risks identified: ${currentPlan.riskAssessment.risks.length}`);
    }

    // Reflection results
    const lastReflection = agent.getLastReflection();
    if (lastReflection) {
      console.log(`\n🤔 Last Reflection:`);
      console.log(`   Analysis: ${lastReflection.analysis.substring(0, 100)}...`);
      console.log(`   Confidence: ${(lastReflection.confidence * 100).toFixed(1)}%`);
      console.log(`   Improvements suggested: ${lastReflection.improvements.length}`);
    }

    // Performance report
    const performanceReport = agent.getPerformanceReport();
    if (performanceReport) {
      console.log(`\n⚡ Performance Report:`);
      console.log(performanceReport);
    }

    // Step-by-step breakdown
    console.log(`\n📝 Step-by-Step Breakdown:`);
    history.steps.forEach((step, index) => {
      const status = step.result.success ? '✅' : '❌';
      const duration = step.result.metadata?.duration || 0;
      const timestamp = step.timestamp.toLocaleTimeString();
      
      console.log(`  ${index + 1}. [${timestamp}] ${status} ${step.action.type} (${duration}ms)`);
      
      if (step.action.type === 'click') {
        console.log(`     → Clicked element at index ${(step.action as any).index}`);
      } else if (step.action.type === 'type') {
        console.log(`     → Typed: "${(step.action as any).text}"`);
      } else if (step.action.type === 'navigate') {
        console.log(`     → Navigated to: ${(step.action as any).url}`);
      } else if (step.action.type === 'extract_data') {
        console.log(`     → Extracted data: ${step.result.extractedContent?.substring(0, 50)}...`);
      }
      
      if (step.result.message) {
        console.log(`     → Result: ${step.result.message}`);
      }
      
      if (step.result.error) {
        console.log(`     → Error: ${step.result.error}`);
      }
    });

    // Final page information
    console.log(`\n📄 Final State:`);
    console.log(`   URL: ${browserSession.getCurrentUrl()}`);
    console.log(`   Title: ${await browserSession.getCurrentTitle()}`);
    console.log(`   Tabs open: ${browserSession.getTabCount()}`);

    // Search memory for insights
    console.log(`\n🔍 Memory Search Results:`);
    const memoryResults = await agent.searchMemory('github repository');
    if (memoryResults.length > 0) {
      memoryResults.slice(0, 3).forEach((result: any, index: number) => {
        console.log(`   ${index + 1}. ${result.entry.content.substring(0, 80)}... (relevance: ${result.relevance.toFixed(2)})`);
      });
    } else {
      console.log('   No relevant memories found');
    }

    // Recommendations for future runs
    console.log(`\n💡 Recommendations:`);
    if (history.metadata.successRate < 0.8) {
      console.log('   - Consider increasing retry attempts or improving error recovery');
    }
    if (history.metadata.averageStepDuration > 5) {
      console.log('   - Steps are taking longer than expected, consider optimizing selectors');
    }
    if (history.metadata.errorCount > 0) {
      console.log('   - Review failed steps and improve action validation');
    }
    if (currentPlan && currentPlan.riskAssessment.overallRisk === 'high') {
      console.log('   - High risk detected in plan, consider alternative approaches');
    }

    // Close browser
    await browserSession.close();
    console.log('\n🎉 Advanced demo completed!\n');

  } catch (error) {
    console.error('❌ Demo failed:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the advanced demo
main();
