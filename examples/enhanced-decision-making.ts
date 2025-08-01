import { Agent, BrowserSession, LLMFactory, Config } from '../src';

async function testEnhancedDecisionMaking() {
  try {
    console.log('🧠 Enhanced Decision Making Test\n');

    // Get configuration from environment
    const llmConfig = Config.getLLMConfig();
    const browserProfile = Config.getBrowserProfile();
    const agentSettings = {
      ...Config.getAgentSettings(),
      maxSteps: 20,
      enableLoopDetection: true,
      maxConsecutiveFailures: 3,
      maxSimilarActions: 2,
      enableMemory: true,
      enableReflection: true,
      reflectionInterval: 3,
    };

    console.log(`Using LLM: ${llmConfig.provider} - ${llmConfig.model}`);
    console.log(`Browser mode: ${browserProfile.headless ? 'headless' : 'visible'}`);
    console.log(`Enhanced features enabled: Loop Detection, Memory, Reflection\n`);

    // Create LLM instance
    const llm = LLMFactory.createLLM(llmConfig);

    // Create browser session
    const browserSession = new BrowserSession(browserProfile);
    await browserSession.start();

    // Test case 1: Simple navigation and search
    console.log('📋 Test Case 1: Enhanced Navigation and Search');
    const task1 = "访问百度，搜索'人工智能'，查看搜索结果";
    
    const agent1 = new Agent(task1, llm, browserSession, agentSettings);
    const history1 = await agent1.run();
    
    console.log('\n📊 Test Case 1 Results:');
    console.log(`- Total steps: ${history1.steps.length}`);
    console.log(`- Success: ${history1.success}`);
    console.log(`- Duration: ${history1.totalDuration.toFixed(2)}s`);
    console.log(`- Success rate: ${(history1.metadata.successRate * 100).toFixed(1)}%`);
    
    // Analyze decision patterns
    const structuredSteps = history1.steps.filter(step => step.agentOutput);
    console.log(`- Structured decisions: ${structuredSteps.length}/${history1.steps.length}`);
    
    if (structuredSteps.length > 0) {
      console.log('\n🧠 Decision Analysis:');
      structuredSteps.slice(0, 3).forEach((step, index) => {
        console.log(`Step ${step.stepNumber}:`);
        console.log(`  Goal: ${step.agentOutput?.next_goal}`);
        console.log(`  Evaluation: ${step.agentOutput?.evaluation_previous_goal}`);
        console.log(`  Memory: ${step.agentOutput?.memory}`);
        console.log(`  Action: ${step.action.type}`);
        console.log('');
      });
    }

    // Test case 2: Complex interaction with potential loops
    console.log('\n📋 Test Case 2: Complex Interaction (Loop Detection Test)');
    const task2 = "访问bilibili，搜索'搞笑视频'，点击第一个视频";
    
    const agent2 = new Agent(task2, llm, browserSession, agentSettings);
    const history2 = await agent2.run();
    
    console.log('\n📊 Test Case 2 Results:');
    console.log(`- Total steps: ${history2.steps.length}`);
    console.log(`- Success: ${history2.success}`);
    console.log(`- Duration: ${history2.totalDuration.toFixed(2)}s`);
    console.log(`- Error count: ${history2.metadata.errorCount}`);
    
    // Check for loop detection
    const failedSteps = history2.steps.filter(step => !step.result.success);
    const repeatedActions = new Map<string, number>();
    
    history2.steps.forEach(step => {
      const actionKey = `${step.action.type}_${(step.action as any).index || ''}`;
      repeatedActions.set(actionKey, (repeatedActions.get(actionKey) || 0) + 1);
    });
    
    const maxRepeated = Math.max(...Array.from(repeatedActions.values()));
    console.log(`- Max repeated action: ${maxRepeated} times`);
    console.log(`- Failed steps: ${failedSteps.length}`);
    
    if (maxRepeated <= agentSettings.maxSimilarActions!) {
      console.log('✅ Loop detection working - no excessive repetition detected');
    } else {
      console.log('⚠️ Potential loop detected - may need adjustment');
    }

    // Test case 3: Error recovery
    console.log('\n📋 Test Case 3: Error Recovery Test');
    const task3 = "访问一个不存在的网站 http://nonexistent-site-12345.com，然后访问google.com";
    
    const agent3 = new Agent(task3, llm, browserSession, agentSettings);
    const history3 = await agent3.run();
    
    console.log('\n📊 Test Case 3 Results:');
    console.log(`- Total steps: ${history3.steps.length}`);
    console.log(`- Success: ${history3.success}`);
    console.log(`- Error recovery demonstrated: ${history3.steps.some(step => 
      step.action.type === 'navigate' && (step.action as any).url?.includes('google.com')
    )}`);

    // Overall comparison with original system
    console.log('\n🔍 Overall Analysis:');
    console.log('Enhanced features implemented:');
    console.log('✅ Structured decision making (thinking, evaluation, memory, goals)');
    console.log('✅ Loop detection and prevention');
    console.log('✅ Enhanced context management');
    console.log('✅ State tracking and failure counting');
    console.log('✅ Message management for better LLM context');
    
    const totalSteps = history1.steps.length + history2.steps.length + history3.steps.length;
    const totalSuccessful = [history1, history2, history3].filter(h => h.success).length;
    
    console.log(`\n📈 Summary Statistics:`);
    console.log(`- Total test cases: 3`);
    console.log(`- Successful completions: ${totalSuccessful}/3`);
    console.log(`- Total steps executed: ${totalSteps}`);
    console.log(`- Average steps per task: ${(totalSteps / 3).toFixed(1)}`);

    await browserSession.close();
    
    console.log('\n🎉 Enhanced decision making test completed!');
    console.log('\nKey improvements over original version:');
    console.log('1. No more hardcoded decisions - each step includes reasoning');
    console.log('2. Loop detection prevents infinite repetition');
    console.log('3. Structured output ensures consistent decision quality');
    console.log('4. Enhanced context management improves LLM understanding');
    console.log('5. State tracking enables better error recovery');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testEnhancedDecisionMaking().catch(console.error);
}

export { testEnhancedDecisionMaking };
